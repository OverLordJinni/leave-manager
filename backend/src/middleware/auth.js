// src/middleware/auth.js
const crypto = require('crypto');

const API_TOKEN     = process.env.API_TOKEN;
const SESSION_TTL   = 8 * 60 * 60 * 1000; // 8 hours
const COOKIE_NAME   = 'lm_session';

if (!API_TOKEN) {
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: API_TOKEN is not set.');
    process.exit(1);
  } else {
    console.warn('⚠️  WARNING: API_TOKEN not set — auth disabled (dev only)');
  }
}

// In-memory single-user session
let activeSession = null; // { token, expires }

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

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict',
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
  activeSession.expires = Date.now() + SESSION_TTL; // sliding window
  next();
}

module.exports = { auth, handleLogin, handleLogout, COOKIE_OPTS, COOKIE_NAME };
