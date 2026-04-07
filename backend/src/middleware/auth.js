// src/middleware/auth.js
const crypto = require('crypto');

const API_TOKEN     = process.env.API_TOKEN;
const SESSION_TTL   = 8 * 60 * 60 * 1000;
const COOKIE_NAME   = 'lm_session';
const isProd        = process.env.NODE_ENV === 'production';

if (!API_TOKEN) {
  if (isProd) { console.error('FATAL: API_TOKEN is not set.'); process.exit(1); }
  else { console.warn('WARNING: API_TOKEN not set'); }
}

let activeSession = null;

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

// sameSite must be 'none' for cross-origin cookies (Netlify -> Render)
const COOKIE_OPTS = {
  httpOnly: true,
  secure:   isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge:   SESSION_TTL,
  path:     '/',
};

function handleLogin(req, res) {
  if (!API_TOKEN) {
    const tok = crypto.randomBytes(32).toString('hex');
    activeSession = { token: tok, expires: Date.now() + SESSION_TTL };
    res.cookie(COOKIE_NAME, tok, COOKIE_OPTS);
    return res.json({ ok: true });
  }
  const { token } = req.body || {};
  if (!token || !safeCompare(token, API_TOKEN)) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const sessionToken = crypto.randomBytes(32).toString('hex');
  activeSession = { token: sessionToken, expires: Date.now() + SESSION_TTL };
  res.cookie(COOKIE_NAME, sessionToken, COOKIE_OPTS);
  return res.json({ ok: true });
}

function handleLogout(req, res) {
  activeSession = null;
  res.clearCookie(COOKIE_NAME, { path: '/' });
  return res.json({ ok: true });
}

function auth(req, res, next) {
  if (!API_TOKEN) return next();
  const tok = req.cookies?.[COOKIE_NAME];
  if (!tok || !activeSession || Date.now() > activeSession.expires || !safeCompare(tok, activeSession.token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  activeSession.expires = Date.now() + SESSION_TTL;
  next();
}

module.exports = { auth, handleLogin, handleLogout, COOKIE_OPTS, COOKIE_NAME };
