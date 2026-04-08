// src/middleware/auth.js
// Email + password auth with bcrypt, multi-device sessions, WebAuthn passkey support
const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');

// ── Config ────────────────────────────────────────────────────────────────────
// ADMIN_EMAIL and ADMIN_PASSWORD_HASH are set in Render environment variables.
// Generate hash: node -e "require('bcryptjs').hash('yourpassword',12).then(console.log)"
// Falls back to legacy API_TOKEN for backward compatibility during migration.
const ADMIN_EMAIL         = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';
const LEGACY_TOKEN        = process.env.API_TOKEN || ''; // kept for migration
const SESSION_TTL         = 30 * 24 * 60 * 60 * 1000; // 30 days
const COOKIE_NAME         = 'lm_session';
const isProd              = process.env.NODE_ENV === 'production';

if (isProd && !ADMIN_EMAIL) {
  console.error('FATAL: ADMIN_EMAIL is not set.'); process.exit(1);
}
if (isProd && !ADMIN_PASSWORD_HASH && !LEGACY_TOKEN) {
  console.error('FATAL: ADMIN_PASSWORD_HASH (or legacy API_TOKEN) is not set.'); process.exit(1);
}

// ── Session store ─────────────────────────────────────────────────────────────
const sessions = new Map(); // Map<token, { expires }>
let passkeyCredential = null; // { credentialId, publicKey }
let pendingChallenge  = null; // { challenge, expires }

// Prune expired sessions every hour
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of sessions) { if (now > v.expires) sessions.delete(k); }
}, 60 * 60 * 1000);

// ── Cookie options ────────────────────────────────────────────────────────────
const COOKIE_OPTS = {
  httpOnly: true,
  secure:   isProd,
  sameSite: isProd ? 'none' : 'lax', // 'none' needed for cross-origin Netlify→Render
  maxAge:   SESSION_TTL,
  path:     '/',
};

function createSession(res) {
  const tok = crypto.randomBytes(32).toString('hex');
  sessions.set(tok, { expires: Date.now() + SESSION_TTL });
  res.cookie(COOKIE_NAME, tok, COOKIE_OPTS);
  return tok;
}

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

// ── Login: email + password ───────────────────────────────────────────────────
async function handleLogin(req, res) {
  const { email, password, token } = req.body || {};

  // Dev mode / no credentials configured
  if (!ADMIN_EMAIL && !LEGACY_TOKEN) {
    createSession(res);
    return res.json({ ok: true });
  }

  // Legacy token path (backward compat during migration)
  if (token && !email && !password) {
    if (!LEGACY_TOKEN || !safeCompare(token, LEGACY_TOKEN)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    createSession(res);
    return res.json({ ok: true });
  }

  // Email + password path
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Check email
  if (!ADMIN_EMAIL || !safeCompare(email.toLowerCase().trim(), ADMIN_EMAIL)) {
    // Deliberate constant-time delay to prevent user enumeration
    await bcrypt.compare('dummy', '$2a$12$dummy.hash.to.prevent.timing.attacks.xxxxxx');
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Check password against bcrypt hash, OR fallback to legacy token
  let valid = false;
  if (ADMIN_PASSWORD_HASH) {
    valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  } else if (LEGACY_TOKEN) {
    valid = safeCompare(password, LEGACY_TOKEN);
  }

  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  createSession(res);
  return res.json({ ok: true });
}

// ── Passkey: get challenge ────────────────────────────────────────────────────
function handlePasskeyChallenge(req, res) {
  const challenge = crypto.randomBytes(32).toString('base64url');
  pendingChallenge = { challenge, expires: Date.now() + 5 * 60 * 1000 };
  let rpId = 'localhost';
  try { rpId = new URL(process.env.FRONTEND_URL || 'https://localhost').hostname; } catch {}
  return res.json({ challenge, rpId, hasCredential: !!passkeyCredential });
}

// ── Passkey: register (must be logged in first) ───────────────────────────────
function handlePasskeyRegister(req, res) {
  const tok  = req.cookies?.[COOKIE_NAME];
  const sess = tok && sessions.get(tok);
  if (!sess || Date.now() > sess.expires) {
    return res.status(401).json({ error: 'Must be logged in to register passkey' });
  }
  const { credentialId, publicKey } = req.body || {};
  if (!credentialId || !publicKey) {
    return res.status(400).json({ error: 'credentialId and publicKey required' });
  }
  passkeyCredential = { credentialId, publicKey };
  console.log(JSON.stringify({ event: 'passkey_registered' }));
  return res.json({ ok: true });
}

// ── Passkey: login ────────────────────────────────────────────────────────────
function handlePasskeyLogin(req, res) {
  if (!passkeyCredential) return res.status(400).json({ error: 'No passkey registered' });
  if (!pendingChallenge || Date.now() > pendingChallenge.expires) {
    return res.status(400).json({ error: 'Challenge expired — request a new one' });
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

// ── Logout ────────────────────────────────────────────────────────────────────
function handleLogout(req, res) {
  const tok = req.cookies?.[COOKIE_NAME];
  if (tok) sessions.delete(tok);
  res.clearCookie(COOKIE_NAME, { path: '/', sameSite: isProd ? 'none' : 'lax', secure: isProd });
  return res.json({ ok: true });
}

// ── Auth middleware ───────────────────────────────────────────────────────────
function auth(req, res, next) {
  if (!ADMIN_EMAIL && !LEGACY_TOKEN) return next(); // dev mode
  const tok  = req.cookies?.[COOKIE_NAME];
  const sess = tok && sessions.get(tok);
  if (!sess || Date.now() > sess.expires) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  sess.expires = Date.now() + SESSION_TTL; // sliding window
  next();
}

module.exports = {
  auth, handleLogin, handleLogout, COOKIE_OPTS, COOKIE_NAME,
  handlePasskeyChallenge, handlePasskeyRegister, handlePasskeyLogin, handlePasskeyStatus,
};
