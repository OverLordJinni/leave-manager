// src/routes/settings.js
const router = require('express').Router();
const { supabase } = require('../db/supabase');

const ALLOWED_KEYS = new Set(['contractRenewal', 'lastResetDate', 'onboarded']);
const ISO_DATE_RE  = /^\d{4}-\d{2}-\d{2}$/;

function validate(key, value) {
  if (typeof value !== 'string')    return 'value must be a string';
  if (value.length > 200)           return 'value too long';
  if (key === 'contractRenewal' && value !== '' && !ISO_DATE_RE.test(value))
    return 'must be YYYY-MM-DD or empty';
  if (key === 'onboarded' && !['true','false'].includes(value))
    return 'must be "true" or "false"';
  return null;
}

function dbErr(res, req, err) {
  console.error(JSON.stringify({ requestId: req.id, error: err.message }));
  res.status(500).json({ error: 'Internal server error' });
}

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('settings')
      .select('key, value').eq('user_id', req.userId);
    if (error) throw error;
    res.json(Object.fromEntries((data||[]).map(r => [r.key, r.value])));
  } catch (err) { dbErr(res, req, err); }
});

router.put('/', async (req, res) => {
  if (typeof req.body !== 'object' || Array.isArray(req.body))
    return res.status(400).json({ error: 'Body must be a JSON object' });

  const entries = Object.entries(req.body);
  const unknown = entries.filter(([k]) => !ALLOWED_KEYS.has(k));
  if (unknown.length) return res.status(400).json({ error: `Unknown key(s): ${unknown.map(([k])=>k).join(', ')}` });

  for (const [key, value] of entries) {
    const err = validate(key, value);
    if (err) return res.status(400).json({ error: `${key}: ${err}` });
  }

  try {
    await Promise.all(entries.map(([key, value]) =>
      supabase.from('settings').upsert(
        { user_id: req.userId, key, value: String(value) },
        { onConflict: 'user_id,key' }
      )
    ));
    const { data, error } = await supabase.from('settings')
      .select('key, value').eq('user_id', req.userId);
    if (error) throw error;
    res.json(Object.fromEntries((data||[]).map(r => [r.key, r.value])));
  } catch (err) { dbErr(res, req, err); }
});

module.exports = router;
