// src/routes/viber.js
const router = require('express').Router();
const { supabase } = require('../db/supabase');

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
  // Viber's number= param requires digits only — strip +, spaces, dashes, etc.
  const digits = phone.replace(/\D/g, '');
  const url = `viber://chat?number=${digits}&draft=${encodeURIComponent(message)}`;
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
    const [
      { data: entry,      error: e1 },
      { data: recipients, error: e2 },
      { data: leaveTypes, error: e3 },
      { data: user },
    ] = await Promise.all([
      supabase.from('leave_history').select('*').eq('id', leaveHistoryId).eq('user_id', req.userId).single(),
      supabase.from('recipients').select('*').eq('user_id', req.userId).order('created_at', { ascending: true }),
      supabase.from('leave_types').select('*').order('order', { ascending: true }),
      req.userId
        ? supabase.from('users').select('name, email').eq('id', req.userId).single()
        : Promise.resolve({ data: null }),
    ]);

    if (e1 || !entry) return res.status(404).json({ error: 'Leave entry not found' });
    if (e2) throw e2;
    if (e3) throw e3;

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
    const [
      { data: r,          error: e1 },
      { data: entry },
      { data: leaveTypes },
      { data: user },
    ] = await Promise.all([
      supabase.from('recipients').select('*').eq('id', req.params.recipientId).eq('user_id', req.userId).single(),
      req.query.leaveId
        ? supabase.from('leave_history').select('*')
            .eq('id', req.query.leaveId).eq('user_id', req.userId).single()
        : Promise.resolve({ data: null }),
      supabase.from('leave_types').select('*').order('order', { ascending: true }),
      req.userId
        ? supabase.from('users').select('name, email').eq('id', req.userId).single()
        : Promise.resolve({ data: null }),
    ]);

    if (e1 || !r) return res.status(404).json({ error: 'Recipient not found' });

    const userName = user?.name || user?.email || '';
    const msg = entry
      ? buildMessage(entry, userName, leaveTypes || [], r.name)
      : 'Hi, I would like to notify you about my leave.';

    res.redirect(302, buildViberUrl(r.phone, msg));
  } catch (err) { dbErr(res, req, err); }
});

module.exports = router;
