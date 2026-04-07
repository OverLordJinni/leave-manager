// src/middleware/auth.js
const crypto = require('crypto');

const API_TOKEN   = process.env.API_TOKEN;
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const COOKIE_NAME = 'lm_session';
const isProd      = process.env.NODE_ENV === 'production';

if (!API_TOKEN) {
  if (isProd) { console.error('FATAL: API_TOKEN is not set.'); process.exit(1); }
  else { console.warn('WARNING: API_TOKEN not set - auth disabled'); }
}

const sessions = new Map();
let passkeyCredential = null;
let pendingChallenge = null;

function safeCompare(a, b) {
  try {
    const ab = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    if (ab.length !== bb.length) {
      crypto.timingSafeEqual(Buffer.alloc(ab.length), Buffer.alloc(ab.length));
      return false;
    }
    return crypto.timingSafeEqual(ab, bb);
  } catch { return false; }
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of sessions) { if (now > v.expires) sessions.delete(k); }
}, 60 * 60 * 1000);

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge:   SESSION_TTL,
  path:     '/',
};

function createSession(res) {
  const tok = crypto.randomBytes(32).toString('hex');
  sessions.set(tok, { expires: Date.now() + SESSION_TTL });
  res.cookie(COOKIE_NAME, tok, COOKIE_OPTS);
  return tok;
}

function handleLogin(req, res) {
  if (!API_TOKEN) { createSession(res); return res.json({ ok: true }); }
  const { password, token } = req.body || {};
  const cred = password || token;
  if (!cred || !safeCompare(cred, API_TOKEN)) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  createSession(res);
  return res.json({ ok: true });
}

function handlePasskeyChallenge(req, res) {
  const challenge = crypto.randomBytes(32).toString('base64url');
  pendingChallenge = { challenge, expires: Date.now() + 5 * 60 * 1000 };
  let rpId = 'localhost';
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'https://localhost';
    rpId = new URL(frontendUrl).hostname;
  } catch {}
  return res.json({ challenge, rpId, hasCredential: !!passkeyCredential });
}

function handlePasskeyRegister(req, res) {
  const tok = req.cookies?.[COOKIE_NAME];
  const sess = tok && sessions.get(tok);
  if (!sess || Date.now() > sess.expires) {
    return res.status(401).json({ error: 'Must be logged in to register passkey' });
  }
  const { credentialId, publicKey } = req.body || {};
  if (!credentialId || !publicKey) return res.status(400).json({ error: 'credentialId and publicKey required' });
  passkeyCredential = { credentialId, publicKey };
  return res.json({ ok: true });
}

function handlePasskeyLogin(req, res) {
  if (!passkeyCredential) return res.status(400).json({ error: 'No passkey registered' });
  if (!pendingChallenge || Date.now() > pendingChallenge.expires) {
    return res.status(400).json({ error: 'Challenge expired' });
  }
  const { credentialId, verified } = req.body || {};
  if (!credentialId || !safeCompare(credentialId, passkeyCredential.credentialId)) {
    return res.status(401).json({ error: 'Passkey not recognised' });
  }
  if (verified !== true) return res.status(401).json({ error: 'Passkey verification failed' });
  pendingChallenge = null;
  createSession(res);
  return res.json({ ok: true });
}

function handlePasskeyStatus(req, res) {
  return res.json({ registered: !!passkeyCredential });
}

function handleLogout(req, res) {
  const tok = req.cookies?.[COOKIE_NAME];
  if (tok) sessions.delete(tok);
  res.clearCookie(COOKIE_NAME, { path: '/', sameSite: isProd ? 'none' : 'lax', secure: isProd });
  return res.json({ ok: true });
}

function auth(req, res, next) {
  if (!API_TOKEN) return next();
  const tok = req.cookies?.[COOKIE_NAME];
  const sess = tok && sessions.get(tok);
  if (!sess || Date.now() > sess.expires) return res.status(401).json({ error: 'Unauthorized' });
  sess.expires = Date.now() + SESSION_TTL;
  next();
}

module.exports = {
  auth, handleLogin, handleLogout, COOKIE_OPTS, COOKIE_NAME,
  handlePasskeyChallenge, handlePasskeyRegister, handlePasskeyLogin, handlePasskeyStatus,
};
