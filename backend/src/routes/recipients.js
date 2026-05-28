// src/routes/recipients.js
const router = require('express').Router();
const { sql } = require('../db/client');

const PHONE_RE = /^\+[1-9]\d{6,14}$/;
const clean    = (s, n) => typeof s === 'string' ? s.trim().slice(0, n) : '';

function dbErr(res, req, err) {
  console.error(JSON.stringify({ requestId: req.id, error: err.message }));
  res.status(500).json({ error: 'Internal server error' });
}

router.get('/', async (req, res) => {
  try {
    const data = await sql`
      SELECT * FROM recipients WHERE user_id = ${req.userId} ORDER BY created_at ASC`;
    res.json(data);
  } catch (err) { dbErr(res, req, err); }
});

router.post('/', async (req, res) => {
  const name     = clean(req.body.name,  80);
  const rawPhone = clean(req.body.phone, 20);
  // Accept human-typed phones with spaces/dashes; store E.164.
  const phone   = rawPhone.replace(/[\s-]/g, '');
  const errs    = [];
  if (!name)                          errs.push('name is required');
  if (!phone)                         errs.push('phone is required');
  if (phone && !PHONE_RE.test(phone)) errs.push('phone must be E.164 format e.g. +9607712345');
  if (errs.length) return res.status(400).json({ error: errs.join('; ') });

  try {
    const rows = await sql`
      INSERT INTO recipients (user_id, name, phone) VALUES (${req.userId}, ${name}, ${phone})
      RETURNING *`;
    res.status(201).json(rows[0]);
  } catch (err) { dbErr(res, req, err); }
});

router.delete('/:id', async (req, res) => {
  try {
    await sql`DELETE FROM recipients WHERE id = ${req.params.id} AND user_id = ${req.userId}`;
    res.json({ ok: true });
  } catch (err) { dbErr(res, req, err); }
});

module.exports = router;
