// src/routes/leave.js
const router = require('express').Router();
const { sql } = require('../db/client');

// ── Validation helpers ────────────────────────────────────────────────────────
const ISO_DATE_RE  = /^\d{4}-\d{2}-\d{2}$/;
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;
const MAX_DAYS     = 366;

const isDate  = s => s && ISO_DATE_RE.test(s) && !isNaN(new Date(s));
const isColor = s => !s || HEX_COLOR_RE.test(s);
const clean   = (s, n = 100) => typeof s === 'string' ? s.trim().slice(0, n) : '';

function countWeekdays(a, b) {
  let n = 0, c = new Date(a), e = new Date(b), guard = 0;
  while (c <= e && guard++ < MAX_DAYS) { const d = c.getDay(); if (d && d < 6) n++; c.setDate(c.getDate()+1); }
  return n;
}
function addOneYear(s) { const d = new Date(s); d.setFullYear(d.getFullYear()+1); return d.toISOString().split('T')[0]; }

function dbErr(res, req, err) {
  console.error(JSON.stringify({ requestId: req.id, error: err.message }));
  res.status(500).json({ error: 'Internal server error' });
}

// Encode urgent_task into reason field to avoid a DB migration
// Format: "reason text\n__UT__:urgent task text"
const UT_MARKER = '\n__UT__:';
function encodeReason(reason, urgentTask) {
  const r = (reason || '').trim();
  const u = (urgentTask || '').trim();
  if (!u) return r || null;
  return `${r}${UT_MARKER}${u}`;
}

// ── Contract renewal reset ────────────────────────────────────────────────────
async function checkAndApplyReset(userId) {
  const rows = await sql`
    SELECT key, value FROM settings
    WHERE user_id = ${userId} AND key IN ('contractRenewal', 'lastResetDate')`;

  const byKey       = Object.fromEntries((rows || []).map(r => [r.key, r.value]));
  const renewalDate = byKey.contractRenewal;
  const lastReset   = byKey.lastResetDate;
  if (!renewalDate || !isDate(renewalDate)) return { reset: false };

  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(renewalDate); due.setHours(0,0,0,0);
  if (today < due) return { reset: false };

  // Guard against double-reset
  if (lastReset === renewalDate) return { reset: false };

  const next = addOneYear(renewalDate);
  await sql`
    INSERT INTO settings (user_id, key, value) VALUES (${userId}, 'lastResetDate', ${renewalDate})
    ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value`;
  await sql`UPDATE leave_types SET used = 0 WHERE user_id = ${userId}`;
  await sql`
    INSERT INTO settings (user_id, key, value) VALUES (${userId}, 'contractRenewal', ${next})
    ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value`;
  console.log(JSON.stringify({ event: 'leave_reset', userId, next }));
  return { reset: true };
}

// GET /api/leave/types
router.get('/types', async (req, res) => {
  try {
    const resetInfo = await checkAndApplyReset(req.userId);
    const data = await sql`
      SELECT * FROM leave_types WHERE user_id = ${req.userId} ORDER BY "order" ASC`;
    res.json({ types: data, resetOccurred: resetInfo.reset });
  } catch (err) { dbErr(res, req, err); }
});

// POST /api/leave/types
router.post('/types', async (req, res) => {
  const name  = clean(req.body.name, 80);
  const total = parseInt(req.body.total, 10);
  const color = clean(req.body.color, 7);
  const errs  = [];
  if (!name)                               errs.push('name is required');
  if (isNaN(total)||total<1||total>365)    errs.push('total must be 1–365');
  if (!isColor(color))                     errs.push('color must be #RRGGBB');
  if (errs.length) return res.status(400).json({ error: errs.join('; ') });

  try {
    const cnt = await sql`SELECT count(*)::int AS count FROM leave_types WHERE user_id = ${req.userId}`;
    const order = cnt[0]?.count || 0;
    const rows = await sql`
      INSERT INTO leave_types (user_id, name, total, used, color, "order")
      VALUES (${req.userId}, ${name}, ${total}, 0, ${color || '#2563eb'}, ${order})
      RETURNING *`;
    res.status(201).json(rows[0]);
  } catch (err) { dbErr(res, req, err); }
});

// PUT /api/leave/types/:id
router.put('/types/:id', async (req, res) => {
  const name  = req.body.name  !== undefined ? clean(req.body.name,  80) : undefined;
  const total = req.body.total !== undefined ? parseInt(req.body.total, 10) : undefined;
  const used  = req.body.used  !== undefined ? parseInt(req.body.used,  10) : undefined;
  const color = req.body.color !== undefined ? clean(req.body.color,  7)  : undefined;
  const errs  = [];
  if (name  !== undefined && !name)                              errs.push('name cannot be empty');
  if (total !== undefined && (isNaN(total)||total<1||total>365)) errs.push('total must be 1–365');
  if (used  !== undefined && (isNaN(used)||used<0||used>400))    errs.push('used must be 0–400');
  if (color !== undefined && !isColor(color))                    errs.push('color must be #RRGGBB');
  if (errs.length) return res.status(400).json({ error: errs.join('; ') });

  try {
    // COALESCE keeps the existing value when the field was not provided (null).
    const rows = await sql`
      UPDATE leave_types SET
        name  = COALESCE(${name  ?? null}, name),
        total = COALESCE(${total ?? null}, total),
        used  = COALESCE(${used  ?? null}, used),
        color = COALESCE(${color ?? null}, color)
      WHERE id = ${req.params.id} AND user_id = ${req.userId}
      RETURNING *`;
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { dbErr(res, req, err); }
});

// DELETE /api/leave/types/:id
router.delete('/types/:id', async (req, res) => {
  try {
    await sql`DELETE FROM leave_types WHERE id = ${req.params.id} AND user_id = ${req.userId}`;
    res.json({ ok: true });
  } catch (err) { dbErr(res, req, err); }
});

// GET /api/leave/history
// start_date/end_date cast to text so they stay 'YYYY-MM-DD' strings on the wire
// (the Neon driver would otherwise hand back Date objects → TZ-shifted ISO in JSON).
router.get('/history', async (req, res) => {
  try {
    const data = await sql`
      SELECT id, user_id, leave_type_id, type_name, type_color,
             start_date::text AS start_date, end_date::text AS end_date,
             days, reason, applied_at
      FROM leave_history WHERE user_id = ${req.userId} ORDER BY applied_at DESC`;
    res.json(data);
  } catch (err) { dbErr(res, req, err); }
});

// POST /api/leave/apply
router.post('/apply', async (req, res) => {
  const leaveTypeId = clean(req.body.leaveTypeId, 50);
  const startDate   = clean(req.body.startDate,   10);
  const endDate     = clean(req.body.endDate,     10);
  const reason      = clean(req.body.reason||'',  500);
  const urgentTask  = clean(req.body.urgentTask||'', 300);
  const errs        = [];
  if (!leaveTypeId)           errs.push('leaveTypeId required');
  if (!isDate(startDate))     errs.push('startDate must be YYYY-MM-DD');
  if (!isDate(endDate))       errs.push('endDate must be YYYY-MM-DD');
  if (startDate && endDate && endDate < startDate) errs.push('endDate must be >= startDate');
  // reason is optional — the UI labels it as such.
  if (errs.length) return res.status(400).json({ error: errs.join('; ') });

  try {
    const lts = await sql`
      SELECT * FROM leave_types WHERE id = ${leaveTypeId} AND user_id = ${req.userId}`;
    const lt = lts[0];
    if (!lt) return res.status(404).json({ error: 'Leave type not found' });

    const days = countWeekdays(startDate, endDate);
    if (days <= 0)             return res.status(400).json({ error: 'No working days in range' });
    if (days > MAX_DAYS)       return res.status(400).json({ error: 'Date range too large' });
    if (lt.used + days > lt.total)
      return res.status(422).json({ error: 'Insufficient balance', remaining: lt.total - lt.used });

    const inserted = await sql`
      INSERT INTO leave_history
        (user_id, leave_type_id, type_name, type_color, start_date, end_date, days, reason)
      VALUES
        (${req.userId}, ${leaveTypeId}, ${lt.name}, ${lt.color}, ${startDate}, ${endDate}, ${days}, ${encodeReason(reason, urgentTask)})
      RETURNING id, leave_type_id, type_name, type_color,
                start_date::text AS start_date, end_date::text AS end_date,
                days, reason, applied_at`;
    const entry = inserted[0];

    await sql`
      UPDATE leave_types SET used = ${lt.used + days}
      WHERE id = ${leaveTypeId} AND user_id = ${req.userId}`;

    // Map snake_case → camelCase for frontend compatibility
    res.status(201).json({
      id:          entry.id,
      leaveTypeId: entry.leave_type_id,
      typeName:    entry.type_name,
      typeColor:   entry.type_color,
      startDate:   entry.start_date,
      endDate:     entry.end_date,
      days:        entry.days,
      reason:      entry.reason,
      appliedAt:   entry.applied_at,
    });
  } catch (err) { dbErr(res, req, err); }
});

// DELETE /api/leave/history/:id
router.delete('/history/:id', async (req, res) => {
  try {
    const found = await sql`
      SELECT * FROM leave_history WHERE id = ${req.params.id} AND user_id = ${req.userId}`;
    const entry = found[0];
    if (!entry) return res.status(404).json({ error: 'Not found' });

    await sql`DELETE FROM leave_history WHERE id = ${req.params.id} AND user_id = ${req.userId}`;

    // Decrement used count on the linked leave type
    if (entry.leave_type_id) {
      await sql`
        UPDATE leave_types SET used = GREATEST(0, used - ${entry.days})
        WHERE id = ${entry.leave_type_id} AND user_id = ${req.userId}`;
    }
    res.json({ ok: true });
  } catch (err) { dbErr(res, req, err); }
});

module.exports = router;
