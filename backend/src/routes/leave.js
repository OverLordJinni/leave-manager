// src/routes/leave.js
const router = require('express').Router();
const { supabase } = require('../db/supabase');

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

// ── Contract renewal reset ────────────────────────────────────────────────────
async function checkAndApplyReset() {
  const { data } = await supabase.from('settings').select('value').eq('key', 'contractRenewal').single();
  const renewalDate = data?.value;
  if (!renewalDate || !isDate(renewalDate)) return { reset: false };

  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(renewalDate); due.setHours(0,0,0,0);
  if (today < due) return { reset: false };

  const next = addOneYear(renewalDate);
  await Promise.all([
    supabase.from('leave_types').update({ used: 0 }).neq('id', '00000000-0000-0000-0000-000000000000'),
    supabase.from('settings').upsert({ key: 'contractRenewal', value: next },  { onConflict: 'key' }),
    supabase.from('settings').upsert({ key: 'lastResetDate',   value: renewalDate }, { onConflict: 'key' }),
  ]);
  console.log(JSON.stringify({ event: 'leave_reset', next }));
  return { reset: true };
}

// GET /api/leave/types
router.get('/types', async (req, res) => {
  try {
    const resetInfo = await checkAndApplyReset();
    const { data, error } = await supabase.from('leave_types').select('*').order('order', { ascending: true });
    if (error) throw error;
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
    const { count } = await supabase.from('leave_types').select('*', { count: 'exact', head: true });
    const { data, error } = await supabase.from('leave_types')
      .insert({ name, total, used: 0, color: color||'#2563eb', order: count||0 })
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { dbErr(res, req, err); }
});

// PUT /api/leave/types/:id
router.put('/types/:id', async (req, res) => {
  const name  = req.body.name  !== undefined ? clean(req.body.name,  80) : undefined;
  const total = req.body.total !== undefined ? parseInt(req.body.total, 10) : undefined;
  const color = req.body.color !== undefined ? clean(req.body.color,  7)  : undefined;
  const errs  = [];
  if (name  !== undefined && !name)                         errs.push('name cannot be empty');
  if (total !== undefined && (isNaN(total)||total<1||total>365)) errs.push('total must be 1–365');
  if (color !== undefined && !isColor(color))               errs.push('color must be #RRGGBB');
  if (errs.length) return res.status(400).json({ error: errs.join('; ') });

  const patch = {};
  if (name  !== undefined) patch.name  = name;
  if (total !== undefined) patch.total = total;
  if (color !== undefined) patch.color = color;

  try {
    const { data, error } = await supabase.from('leave_types').update(patch)
      .eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { dbErr(res, req, err); }
});

// DELETE /api/leave/types/:id
router.delete('/types/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('leave_types').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { dbErr(res, req, err); }
});

// GET /api/leave/history
router.get('/history', async (req, res) => {
  try {
    const { data, error } = await supabase.from('leave_history')
      .select('*').order('applied_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) { dbErr(res, req, err); }
});

// POST /api/leave/apply
router.post('/apply', async (req, res) => {
  const leaveTypeId = clean(req.body.leaveTypeId, 50);
  const startDate   = clean(req.body.startDate,   10);
  const endDate     = clean(req.body.endDate,     10);
  const reason      = clean(req.body.reason||'',  500);
  const errs        = [];
  if (!leaveTypeId)           errs.push('leaveTypeId required');
  if (!isDate(startDate))     errs.push('startDate must be YYYY-MM-DD');
  if (!isDate(endDate))       errs.push('endDate must be YYYY-MM-DD');
  if (startDate && endDate && endDate < startDate) errs.push('endDate must be >= startDate');
  if (errs.length) return res.status(400).json({ error: errs.join('; ') });

  try {
    const { data: lt, error: ltErr } = await supabase.from('leave_types')
      .select('*').eq('id', leaveTypeId).single();
    if (ltErr || !lt) return res.status(404).json({ error: 'Leave type not found' });

    const days = countWeekdays(startDate, endDate);
    if (days <= 0)             return res.status(400).json({ error: 'No working days in range' });
    if (days > MAX_DAYS)       return res.status(400).json({ error: 'Date range too large' });
    if (lt.used + days > lt.total)
      return res.status(422).json({ error: 'Insufficient balance', remaining: lt.total - lt.used });

    const { data: entry, error: insErr } = await supabase.from('leave_history')
      .insert({ leave_type_id: leaveTypeId, type_name: lt.name, type_color: lt.color,
                start_date: startDate, end_date: endDate, days, reason: reason||null })
      .select().single();
    if (insErr) throw insErr;

    const { error: updErr } = await supabase.from('leave_types')
      .update({ used: lt.used + days }).eq('id', leaveTypeId);
    if (updErr) throw updErr;

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
    const { data: entry, error: fetchErr } = await supabase.from('leave_history')
      .select('*').eq('id', req.params.id).single();
    if (fetchErr || !entry) return res.status(404).json({ error: 'Not found' });

    const { error: delErr } = await supabase.from('leave_history').delete().eq('id', req.params.id);
    if (delErr) throw delErr;

    // Decrement used count
    const { data: lt } = await supabase.from('leave_types').select('used').eq('id', entry.leave_type_id).single();
    if (lt) {
      await supabase.from('leave_types').update({ used: Math.max(0, lt.used - entry.days) })
        .eq('id', entry.leave_type_id);
    }
    res.json({ ok: true });
  } catch (err) { dbErr(res, req, err); }
});

module.exports = router;
