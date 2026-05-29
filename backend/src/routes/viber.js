// src/routes/viber.js
const router = require('express').Router();
const { sql } = require('../db/client');

// ── Helpers ───────────────────────────────────────────────────────────────────

function pad(n) {
  return String(Math.max(0, Math.round(n))).padStart(2, '0');
}

// "08 April (Wednesday)" — use T12:00:00Z so date is consistent in any server timezone
function fmtDateWithDay(s) {
  if (!s) return '';
  const d = new Date(s + 'T12:00:00Z');
  const dayMonth = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long',   timeZone: 'UTC' });
  const weekday  = d.toLocaleDateString('en-GB', { weekday: 'long',                 timeZone: 'UTC' });
  return `${dayMonth} (${weekday})`;
}

function buildMessage(entry, userName, leaveTypes, recipientName) {
  const { start_date, end_date, leave_type_id, type_name, reason } = entry;

  // Date line
  const dateStr = start_date === end_date
    ? fmtDateWithDay(start_date)
    : `${fmtDateWithDay(start_date)} - ${fmtDateWithDay(end_date)}`;

  // "Requesting for" — used/total for the leave type used in this entry
  const lt = (leaveTypes || []).find(t => t.id === leave_type_id);
  const requestingFor = lt
    ? `${pad(lt.used)}/${pad(lt.total)} ${lt.name}`
    : type_name;

  // "Remaining" — all leave types, remaining/total, each on its own line
  const remainingLines = (leaveTypes || [])
    .map(t => `${pad(t.total - t.used)}/${pad(t.total)} ${t.name}`)
    .join('\n');

  return [
    'Informing Leave',
    '',
    `Date:  ${dateStr}`,
    '',
    `Name: ${userName || '-'}`,
    '',
    `Reason: ${reason || '-'}`,
    '',
    `Requesting for:  ${requestingFor}`,
    '',
    `Remaining: ${remainingLines}`,
    '',
    'urgent task: -',
    '',
    '',
    `Supervisor: ${recipientName}`,
  ].join('\n');
}

function buildViberUrl(phone, message) {
  // Use the full +E.164 number (URL-encoded). Viber matches a saved contact far
  // more reliably with the country code + leading "+" than with bare digits.
  const e164 = '+' + phone.replace(/\D/g, '');
  const url = `viber://chat?number=${encodeURIComponent(e164)}&draft=${encodeURIComponent(message)}`;
  if (!url.startsWith('viber://')) throw new Error('Invalid Viber URL');
  return url;
}

function dbErr(res, req, err) {
  console.error(JSON.stringify({ requestId: req.id, error: err.message }));
  res.status(500).json({ error: 'Internal server error' });
}

// ── POST /api/viber/links ─────────────────────────────────────────────────────
router.post('/links', async (req, res) => {
  const { leaveHistoryId } = req.body;
  if (!leaveHistoryId || typeof leaveHistoryId !== 'string')
    return res.status(400).json({ error: 'leaveHistoryId required' });

  try {
    const [entryRows, recipients, leaveTypes, userRows] = await Promise.all([
      sql`SELECT id, user_id, leave_type_id, type_name, type_color,
                 start_date::text AS start_date, end_date::text AS end_date, days, reason, applied_at
          FROM leave_history WHERE id = ${leaveHistoryId} AND user_id = ${req.userId}`,
      sql`SELECT * FROM recipients WHERE user_id = ${req.userId} ORDER BY created_at ASC`,
      sql`SELECT * FROM leave_types WHERE user_id = ${req.userId} ORDER BY "order" ASC`,
      sql`SELECT name, email FROM users WHERE id = ${req.userId}`,
    ]);

    const entry = entryRows[0];
    if (!entry) return res.status(404).json({ error: 'Leave entry not found' });
    const user = userRows[0];
    const userName = user?.name || user?.email || '';

    const links = (recipients || []).map(r => {
      const msg = buildMessage(entry, userName, leaveTypes || [], r.name);
      return {
        id: r.id, recipientName: r.name, phone: r.phone,
        viberUrl:       buildViberUrl(r.phone, msg),
        messagePreview: msg,
      };
    });

    res.json({ links });
  } catch (err) { dbErr(res, req, err); }
});

// ── GET /api/viber/open/:recipientId?leaveId=xxx ──────────────────────────────
router.get('/open/:recipientId', async (req, res) => {
  try {
    const [recipientRows, entryRows, leaveTypes, userRows] = await Promise.all([
      sql`SELECT * FROM recipients WHERE id = ${req.params.recipientId} AND user_id = ${req.userId}`,
      req.query.leaveId
        ? sql`SELECT id, user_id, leave_type_id, type_name, type_color,
                     start_date::text AS start_date, end_date::text AS end_date, days, reason, applied_at
              FROM leave_history WHERE id = ${req.query.leaveId} AND user_id = ${req.userId}`
        : Promise.resolve([]),
      sql`SELECT * FROM leave_types WHERE user_id = ${req.userId} ORDER BY "order" ASC`,
      sql`SELECT name, email FROM users WHERE id = ${req.userId}`,
    ]);

    const r = recipientRows[0];
    if (!r) return res.status(404).json({ error: 'Recipient not found' });

    const entry = entryRows[0];
    const user  = userRows[0];
    const userName = user?.name || user?.email || '';
    const msg = entry
      ? buildMessage(entry, userName, leaveTypes || [], r.name)
      : 'Hi, I would like to notify you about my leave.';

    res.redirect(302, buildViberUrl(r.phone, msg));
  } catch (err) { dbErr(res, req, err); }
});

module.exports = router;
