// src/middleware/auth.js
// Email + password auth backed by Supabase users table.
// Passkey credentials persisted to passkey_credentials table.
const crypto   = require('crypto');
const bcrypt   = require('bcryptjs');
const { supabase } = require('../db/supabase');

const SESSION_TTL  = 30 * 24 * 60 * 60 * 1000; // 30 days
const COOKIE_NAME  = 'lm_session';
const isProd       = process.env.NODE_ENV === 'production';

// Dummy hash for constant-time rejection (prevents user enumeration via timing)
const DUMMY_HASH = '$2a$12$' + 'x'.repeat(53);

// ── Session store (in-memory, per process) ────────────────────────────────────
const sessions          = new Map(); // token → { expires, userId }
const pendingChallenges = new Map(); // challengeId → { challenge, expires }

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of sessions)          { if (now > v.expires) sessions.delete(k); }
  for (const [k, v] of pendingChallenges) { if (now > v.expires) pendingChallenges.delete(k); }
}, 60 * 60 * 1000);

// ── Cookie options ────────────────────────────────────────────────────────────
const COOKIE_OPTS = {
  httpOnly: true,
  secure:   isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge:   SESSION_TTL,
  path:     '/',
};

function createSession(res, userId) {
  const tok = crypto.randomBytes(32).toString('hex');
  sessions.set(tok, { expires: Date.now() + SESSION_TTL, userId });
  res.cookie(COOKIE_NAME, tok, COOKIE_OPTS);
  return tok;
}

// ── Signup ────────────────────────────────────────────────────────────────────
async function handleSignup(req, res) {
  const { email, password, name } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  const emailClean = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean))
    return res.status(400).json({ error: 'Invalid email address' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });

  // If ADMIN_EMAIL is set, restrict signup to that address only
  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  if (adminEmail && emailClean !== adminEmail)
    return res.status(403).json({ error: 'Signup is restricted to the configured admin email' });

  // If no ADMIN_EMAIL, enforce single-user: only one account can exist
  if (!adminEmail) {
    const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
    if (count > 0)
      return res.status(403).json({ error: 'An account already exists. This is a single-user app.' });
  }

  // Prevent duplicate accounts
  const { data: existing } = await supabase
    .from('users').select('id').eq('email', emailClean).maybeSingle();
  if (existing)
    return res.status(409).json({ error: 'An account with this email already exists' });

  const hash = await bcrypt.hash(password, 12);
  const { data: user, error } = await supabase
    .from('users')
    .insert({ email: emailClean, password_hash: hash, name: (name || '').trim().slice(0, 100) || null })
    .select('id').single();

  if (error) {
    console.error(JSON.stringify({ event: 'signup_error', error: error.message }));
    return res.status(500).json({ error: 'Internal server error' });
  }

  console.log(JSON.stringify({ event: 'signup', userId: user.id }));
  createSession(res, user.id);
  return res.status(201).json({ ok: true });
}

// ── Login ─────────────────────────────────────────────────────────────────────
async function handleLogin(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const emailClean = email.toLowerCase().trim();

    const { data: user, error: dbErr } = await supabase
      .from('users').select('id, password_hash').eq('email', emailClean).maybeSingle();

    if (dbErr) {
      console.error(JSON.stringify({ event: 'login_db_error', error: dbErr.message }));
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (!user) {
      await bcrypt.compare('dummy', DUMMY_HASH); // constant-time padding
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    console.log(JSON.stringify({ event: 'login', userId: user.id }));
    createSession(res, user.id);
    return res.json({ ok: true });
  } catch (err) {
    console.error(JSON.stringify({ event: 'login_unexpected_error', error: err.message, stack: err.stack }));
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ── Session check ─────────────────────────────────────────────────────────────
function handleMe(req, res) {
  const tok  = req.cookies?.[COOKIE_NAME];
  const sess = tok && sessions.get(tok);
  if (!sess || Date.now() > sess.expires) return res.status(401).json({ error: 'Unauthorized' });
  sess.expires = Date.now() + SESSION_TTL; // sliding window
  return res.json({ ok: true });
}

// ── Forgot password ───────────────────────────────────────────────────────────
async function handleForgotPassword(req, res) {
  // Always return 200 to prevent email enumeration
  try {
    const { email } = req.body || {};
    if (email) {
      const { data: user } = await supabase
        .from('users').select('id').eq('email', email.toLowerCase().trim()).maybeSingle();
      if (user) {
        const token   = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        await supabase.from('password_reset_tokens')
          .insert({ user_id: user.id, token, expires_at: expires });
        console.log(JSON.stringify({ event: 'password_reset_token_created', userId: user.id }));
        // TODO: Send email with reset link using your email provider (SendGrid, Resend, etc.)
        // Reset URL: `${process.env.FRONTEND_URL}/reset-password?token=${token}`
      }
    }
  } catch (err) {
    console.error(JSON.stringify({ event: 'forgot_password_error', error: err.message }));
  }
  return res.json({ ok: true });
}

// ── Passkey: challenge ────────────────────────────────────────────────────────
function handlePasskeyChallenge(req, res) {
  const challenge   = crypto.randomBytes(32).toString('base64url');
  const challengeId = crypto.randomBytes(16).toString('hex');
  pendingChallenges.set(challengeId, { challenge, expires: Date.now() + 5 * 60 * 1000 });

  let rpId = 'localhost';
  try { rpId = new URL(process.env.FRONTEND_URL || 'https://localhost').hostname; } catch {}

  // If the user is logged in, return their userId so the frontend can use it in
  // the WebAuthn user.id field during registration.
  const tok    = req.cookies?.[COOKIE_NAME];
  const sess   = tok && sessions.get(tok);
  const userId = (sess && Date.now() <= sess.expires) ? sess.userId : null;

  return res.json({ challenge, challengeId, rpId, rpName: 'Leave Manager', userId });
}

// ── Passkey: register (must be authenticated) ─────────────────────────────────
async function handlePasskeyRegister(req, res) {
  const tok  = req.cookies?.[COOKIE_NAME];
  const sess = tok && sessions.get(tok);
  if (!sess || Date.now() > sess.expires)
    return res.status(401).json({ error: 'Must be logged in to register a passkey' });

  const { credentialId, publicKey, challengeId } = req.body || {};
  if (!credentialId || !publicKey || !challengeId)
    return res.status(400).json({ error: 'credentialId, publicKey, and challengeId are required' });

  const pending = pendingChallenges.get(challengeId);
  if (!pending || Date.now() > pending.expires)
    return res.status(400).json({ error: 'Challenge expired — request a new one' });
  pendingChallenges.delete(challengeId);

  // One passkey per user — replace any existing, then insert.
  // Done as delete+insert (rather than upsert with onConflict) because the
  // unique constraint on passkey_credentials isn't consistent across schemas.
  const { error: delErr } = await supabase
    .from('passkey_credentials').delete().eq('user_id', sess.userId);
  if (delErr) {
    console.error(JSON.stringify({ event: 'passkey_register_error', stage: 'delete', error: delErr.message }));
    return res.status(500).json({ error: 'Internal server error' });
  }
  const { error } = await supabase
    .from('passkey_credentials')
    .insert({ user_id: sess.userId, credential_id: credentialId, public_key: publicKey });
  if (error) {
    console.error(JSON.stringify({ event: 'passkey_register_error', stage: 'insert', error: error.message }));
    return res.status(500).json({ error: 'Internal server error' });
  }

  console.log(JSON.stringify({ event: 'passkey_registered', userId: sess.userId }));
  return res.json({ ok: true });
}

// ── Passkey: login ────────────────────────────────────────────────────────────
async function handlePasskeyLogin(req, res) {
  const { credentialId, challengeId, verified } = req.body || {};
  if (!credentialId || !challengeId)
    return res.status(400).json({ error: 'credentialId and challengeId are required' });

  const pending = pendingChallenges.get(challengeId);
  if (!pending || Date.now() > pending.expires)
    return res.status(400).json({ error: 'Challenge expired — request a new one' });

  if (verified !== true)
    return res.status(401).json({ error: 'Passkey verification failed' });

  const { data: cred } = await supabase
    .from('passkey_credentials')
    .select('user_id')
    .eq('credential_id', credentialId)
    .maybeSingle();

  if (!cred) return res.status(401).json({ error: 'Passkey not recognised' });

  pendingChallenges.delete(challengeId);
  console.log(JSON.stringify({ event: 'passkey_login', userId: cred.user_id }));
  createSession(res, cred.user_id);
  return res.json({ ok: true });
}

// ── Passkey: status ───────────────────────────────────────────────────────────
async function handlePasskeyStatus(req, res) {
  const tok  = req.cookies?.[COOKIE_NAME];
  const sess = tok && sessions.get(tok);
  if (!sess || Date.now() > sess.expires) return res.json({ registered: false });

  const { data } = await supabase
    .from('passkey_credentials')
    .select('id')
    .eq('user_id', sess.userId)
    .maybeSingle();
  return res.json({ registered: !!data });
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
  const tok  = req.cookies?.[COOKIE_NAME];
  const sess = tok && sessions.get(tok);
  if (!sess || Date.now() > sess.expires)
    return res.status(401).json({ error: 'Unauthorized' });
  sess.expires = Date.now() + SESSION_TTL; // sliding window
  req.userId = sess.userId;
  next();
}

module.exports = {
  auth, handleLogin, handleLogout, handleSignup, handleMe, handleForgotPassword,
  COOKIE_OPTS, COOKIE_NAME,
  handlePasskeyChallenge, handlePasskeyRegister, handlePasskeyLogin, handlePasskeyStatus,
};
