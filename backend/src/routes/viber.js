// src/routes/viber.js
const router = require('express').Router();
const { supabase } = require('../db/supabase');

function fmtDate(s) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

function buildMessage(e) {
  const dr = e.start_date === e.end_date
    ? fmtDate(e.start_date)
    : `${fmtDate(e.start_date)} to ${fmtDate(e.end_date)}`;
  const d = `${e.days} working day${e.days !== 1 ? 's' : ''}`;
  const r = e.reason ? ` Reason: ${e.reason}.` : '';
  return `Hi, I would like to inform you that I will be on ${e.type_name} from ${dr} (${d}).${r} Thank you.`;
}

function buildViberUrl(phone, message) {
  const url = `viber://chat?number=${encodeURIComponent(phone)}&draft=${encodeURIComponent(message)}`;
  if (!url.startsWith('viber://')) throw new Error('Invalid Viber URL');
  return url;
}

function dbErr(res, req, err) {
  console.error(JSON.stringify({ requestId: req.id, error: err.message }));
  res.status(500).json({ error: 'Internal server error' });
}

// POST /api/viber/links
router.post('/links', async (req, res) => {
  const { leaveHistoryId } = req.body;
  if (!leaveHistoryId || typeof leaveHistoryId !== 'string')
    return res.status(400).json({ error: 'leaveHistoryId required' });

  try {
    const [{ data: entry, error: e1 }, { data: recipients, error: e2 }] = await Promise.all([
      supabase.from('leave_history').select('*').eq('id', leaveHistoryId).single(),
      supabase.from('recipients').select('*').order('created_at', { ascending: true }),
    ]);
    if (e1 || !entry) return res.status(404).json({ error: 'Leave entry not found' });
    if (e2) throw e2;

    const message = buildMessage(entry);
    const links   = (recipients||[]).map(r => ({
      id: r.id, recipientName: r.name, phone: r.phone,
      viberUrl: buildViberUrl(r.phone, message), messagePreview: message,
    }));
    res.json({ links, message });
  } catch (err) { dbErr(res, req, err); }
});

// GET /api/viber/open/:recipientId?leaveId=xxx
router.get('/open/:recipientId', async (req, res) => {
  try {
    const [{ data: r, error: e1 }, { data: entry }] = await Promise.all([
      supabase.from('recipients').select('*').eq('id', req.params.recipientId).single(),
      req.query.leaveId
        ? supabase.from('leave_history').select('*').eq('id', req.query.leaveId).single()
        : Promise.resolve({ data: null }),
    ]);
    if (e1 || !r) return res.status(404).json({ error: 'Recipient not found' });
    const msg = entry ? buildMessage(entry) : 'Hi, I would like to notify you about my leave.';
    res.redirect(302, buildViberUrl(r.phone, msg));
  } catch (err) { dbErr(res, req, err); }
});

module.exports = router;
