// src/routes/recipients.js
const router = require('express').Router();
const { supabase } = require('../db/supabase');

const PHONE_RE = /^\+[1-9]\d{6,14}$/;
const clean    = (s, n) => typeof s === 'string' ? s.trim().slice(0, n) : '';

function dbErr(res, req, err) {
  console.error(JSON.stringify({ requestId: req.id, error: err.message }));
  res.status(500).json({ error: 'Internal server error' });
}

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase.from('recipients')
      .select('*').eq('user_id', req.userId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) { dbErr(res, req, err); }
});

router.post('/', async (req, res) => {
  const name    = clean(req.body.name,  80);
  const rawPhone = clean(req.body.phone, 20);
  // Accept human-typed phones with spaces/dashes; store E.164.
  const phone   = rawPhone.replace(/[\s-]/g, '');
  const errs    = [];
  if (!name)                          errs.push('name is required');
  if (!phone)                         errs.push('phone is required');
  if (phone && !PHONE_RE.test(phone)) errs.push('phone must be E.164 format e.g. +9607712345');
  if (errs.length) return res.status(400).json({ error: errs.join('; ') });

  try {
    const { data, error } = await supabase.from('recipients')
      .insert({ user_id: req.userId, name, phone })
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { dbErr(res, req, err); }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('recipients')
      .delete().eq('id', req.params.id).eq('user_id', req.userId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { dbErr(res, req, err); }
});

module.exports = router;
