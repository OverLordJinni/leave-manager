// src/middleware/auth.js
// Email + password auth over the Neon `users` table.
// Sessions are STATELESS, signed cookies (HMAC-SHA256) — no server-side store,
// which is what makes this work on serverless. Passkeys use real WebAuthn
// verification via @simplewebauthn/server, with the challenge held in a short
// signed cookie (no in-memory pending-challenge map).
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { sql } = require('../db/client');

const isProd      = process.env.NODE_ENV === 'production';
const SESSION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days
const CHAL_TTL    = 5 * 60 * 1000;            // 5 minutes
const COOKIE_NAME = 'lm_session';
const CHAL_COOKIE = 'lm_wa_chal';

// Dummy hash for constant-time rejection (prevents user enumeration via timing)
const DUMMY_HASH = '$2a$12$' + 'x'.repeat(53);

const SECRET = process.env.COOKIE_SECRET;
if (isProd && !SECRET) { console.error('FATAL: COOKIE_SECRET must be set in production'); process.exit(1); }
const SIGNING_KEY = SECRET || 'dev-only-insecure-secret-do-not-use-in-prod';

// @simplewebauthn/server is loaded lazily so this works whether it resolves as
// CommonJS or ESM-only.
let _wa;
const wa = () => (_wa ||= import('@simplewebauthn/server'));

// ── Signed-token helpers ───────────────────────────────────────────────────────
function sign(obj) {
  const payload = Buffer.from(JSON.stringify(obj)).toString('base64url');
  const mac = crypto.createHmac('sha256', SIGNING_KEY).update(payload).digest('base64url');
  return `${payload}.${mac}`;
}
function unsign(token) {
  if (!token || typeof token !== 'string') return null;
  const i = token.lastIndexOf('.');
  if (i < 1) return null;
  const payload = token.slice(0, i), mac = token.slice(i + 1);
  const expected = crypto.createHmac('sha256', SIGNING_KEY).update(payload).digest('base64url');
  const a = Buffer.from(mac), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const obj = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!obj || typeof obj.exp !== 'number' || Date.now() > obj.exp) return null;
    return obj;
  } catch { return null; }
}

// ── Cookies ────────────────────────────────────────────────────────────────────
const baseCookie = { httpOnly: true, secure: isProd, sameSite: 'lax', path: '/' };

function createSession(res, userId) {
  res.cookie(COOKIE_NAME, sign({ typ: 'sess', userId, exp: Date.now() + SESSION_TTL }),
    { ...baseCookie, maxAge: SESSION_TTL });
}
function readSession(req) {
  const o = unsign(req.cookies?.[COOKIE_NAME]);
  return o && o.typ === 'sess' ? o : null;
}
function setChallenge(res, data) {
  res.cookie(CHAL_COOKIE, sign({ typ: 'chal', ...data, exp: Date.now() + CHAL_TTL }),
    { ...baseCookie, maxAge: CHAL_TTL });
}
function readChallenge(req) {
  const o = unsign(req.cookies?.[CHAL_COOKIE]);
  return o && o.typ === 'chal' ? o : null;
}
function clearChallenge(res) {
  res.clearCookie(CHAL_COOKIE, { path: '/', sameSite: 'lax', secure: isProd });
}

// ── WebAuthn relying-party config ──────────────────────────────────────────────
function getRpId() {
  try { return new URL(process.env.FRONTEND_URL).hostname; } catch { return 'localhost'; }
}
function expectedOrigins() {
  const list = [];
  if (process.env.FRONTEND_URL) list.push(process.env.FRONTEND_URL);
  if (!isProd) list.push('http://localhost:5173', 'http://localhost:3000');
  return list.length ? list : ['http://localhost:3000'];
}

// ── Per-user default data (runs once, at signup) ───────────────────────────────
async function seedUserDefaults(userId) {
  await sql`
    INSERT INTO leave_types (user_id, name, total, used, color, "order") VALUES
      (${userId}, 'Annual Leave', 21, 0, '#2563eb', 0),
      (${userId}, 'Sick Leave',   14, 0, '#16a34a', 1)`;
  await Promise.all([
    sql`INSERT INTO settings (user_id, key, value) VALUES (${userId}, 'contractRenewal', '') ON CONFLICT (user_id, key) DO NOTHING`,
    sql`INSERT INTO settings (user_id, key, value) VALUES (${userId}, 'lastResetDate',   '') ON CONFLICT (user_id, key) DO NOTHING`,
    sql`INSERT INTO settings (user_id, key, value) VALUES (${userId}, 'onboarded',  'false') ON CONFLICT (user_id, key) DO NOTHING`,
  ]);
}

// ── Signup ─────────────────────────────────────────────────────────────────────
async function handleSignup(req, res) {
  const { email, password, name } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  const emailClean = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean))
    return res.status(400).json({ error: 'Invalid email address' });
  if (password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });

  try {
    const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
    if (adminEmail && emailClean !== adminEmail)
      return res.status(403).json({ error: 'Signup is restricted to the configured admin email' });

    // No ADMIN_EMAIL → single-user app: only one account may exist.
    if (!adminEmail) {
      const cnt = await sql`SELECT count(*)::int AS count FROM users`;
      if ((cnt[0]?.count || 0) > 0)
        return res.status(403).json({ error: 'An account already exists. This is a single-user app.' });
    }

    const dup = await sql`SELECT id FROM users WHERE email = ${emailClean}`;
    if (dup[0]) return res.status(409).json({ error: 'An account with this email already exists' });

    const hash = await bcrypt.hash(password, 12);
    const rows = await sql`
      INSERT INTO users (email, password_hash, name)
      VALUES (${emailClean}, ${hash}, ${(name || '').trim().slice(0, 100) || null})
      RETURNING id`;
    const userId = rows[0].id;

    await seedUserDefaults(userId);

    console.log(JSON.stringify({ event: 'signup', userId }));
    createSession(res, userId);
    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error(JSON.stringify({ event: 'signup_error', error: err.message }));
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ── Login ──────────────────────────────────────────────────────────────────────
async function handleLogin(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const emailClean = email.toLowerCase().trim();
    const rows = await sql`SELECT id, password_hash FROM users WHERE email = ${emailClean}`;
    const user = rows[0];

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
    console.error(JSON.stringify({ event: 'login_error', error: err.message }));
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ── Session check (sliding window) ─────────────────────────────────────────────
function handleMe(req, res) {
  const sess = readSession(req);
  if (!sess) return res.status(401).json({ error: 'Unauthorized' });
  createSession(res, sess.userId); // refresh expiry
  return res.json({ ok: true });
}

// ── Logout ───────────────────────────────────────────────────────────────────
function handleLogout(req, res) {
  res.clearCookie(COOKIE_NAME, { path: '/', sameSite: 'lax', secure: isProd });
  return res.json({ ok: true });
}

// ── Forgot password ────────────────────────────────────────────────────────────
async function handleForgotPassword(req, res) {
  // Always return 200 to prevent email enumeration.
  try {
    const { email } = req.body || {};
    if (email) {
      const rows = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase().trim()}`;
      if (rows[0]) {
        const token   = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        await sql`
          INSERT INTO password_reset_tokens (user_id, token, expires_at)
          VALUES (${rows[0].id}, ${token}, ${expires})`;
        console.log(JSON.stringify({ event: 'password_reset_token_created', userId: rows[0].id }));
        // TODO: email the reset link: `${process.env.FRONTEND_URL}/reset-password?token=${token}`
      }
    }
  } catch (err) {
    console.error(JSON.stringify({ event: 'forgot_password_error', error: err.message }));
  }
  return res.json({ ok: true });
}

// ── Passkey: registration challenge (must be logged in) ────────────────────────
async function handlePasskeyRegisterChallenge(req, res) {
  const sess = readSession(req);
  if (!sess) return res.status(401).json({ error: 'Must be logged in to register a passkey' });
  try {
    const rows = await sql`SELECT id, email, name FROM users WHERE id = ${sess.userId}`;
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { generateRegistrationOptions } = await wa();
    const options = await generateRegistrationOptions({
      rpName: 'Leave Manager',
      rpID: getRpId(),
      userID: new TextEncoder().encode(user.id),
      userName: user.email,
      userDisplayName: user.name || user.email,
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'required',
      },
    });
    setChallenge(res, { challenge: options.challenge, userId: user.id });
    return res.json(options);
  } catch (err) {
    console.error(JSON.stringify({ event: 'passkey_register_challenge_error', error: err.message }));
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ── Passkey: verify registration ───────────────────────────────────────────────
async function handlePasskeyRegister(req, res) {
  const sess = readSession(req);
  if (!sess) return res.status(401).json({ error: 'Must be logged in to register a passkey' });

  const chal = readChallenge(req);
  if (!chal || chal.userId !== sess.userId)
    return res.status(400).json({ error: 'Challenge expired — request a new one' });

  try {
    const { verifyRegistrationResponse } = await wa();
    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: chal.challenge,
      expectedOrigin: expectedOrigins(),
      expectedRPID: getRpId(),
      requireUserVerification: true,
    });
    clearChallenge(res);

    if (!verification.verified || !verification.registrationInfo)
      return res.status(400).json({ error: 'Passkey verification failed' });

    const { credential } = verification.registrationInfo;
    const pubKey = Buffer.from(credential.publicKey).toString('base64url');

    // One passkey per user — replace any existing.
    await sql`DELETE FROM passkey_credentials WHERE user_id = ${sess.userId}`;
    await sql`
      INSERT INTO passkey_credentials (user_id, credential_id, public_key, counter)
      VALUES (${sess.userId}, ${credential.id}, ${pubKey}, ${credential.counter || 0})`;

    console.log(JSON.stringify({ event: 'passkey_registered', userId: sess.userId }));
    return res.json({ ok: true });
  } catch (err) {
    clearChallenge(res);
    console.error(JSON.stringify({ event: 'passkey_register_error', error: err.message }));
    return res.status(400).json({ error: 'Passkey registration failed' });
  }
}

// ── Passkey: authentication challenge (no session) ─────────────────────────────
async function handlePasskeyLoginChallenge(req, res) {
  try {
    const { generateAuthenticationOptions } = await wa();
    const options = await generateAuthenticationOptions({
      rpID: getRpId(),
      userVerification: 'required',
      // No allowCredentials → discoverable-credential (usernameless) flow.
    });
    setChallenge(res, { challenge: options.challenge });
    return res.json(options);
  } catch (err) {
    console.error(JSON.stringify({ event: 'passkey_login_challenge_error', error: err.message }));
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ── Passkey: verify authentication ─────────────────────────────────────────────
async function handlePasskeyLogin(req, res) {
  const chal = readChallenge(req);
  if (!chal) return res.status(400).json({ error: 'Challenge expired — request a new one' });

  const credentialId = req.body?.id;
  if (!credentialId || typeof credentialId !== 'string')
    return res.status(400).json({ error: 'Invalid passkey response' });

  try {
    const rows = await sql`
      SELECT user_id, credential_id, public_key, counter
      FROM passkey_credentials WHERE credential_id = ${credentialId}`;
    const cred = rows[0];
    if (!cred) return res.status(401).json({ error: 'Passkey not recognised' });

    const { verifyAuthenticationResponse } = await wa();
    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: chal.challenge,
      expectedOrigin: expectedOrigins(),
      expectedRPID: getRpId(),
      requireUserVerification: true,
      credential: {
        id: cred.credential_id,
        publicKey: new Uint8Array(Buffer.from(cred.public_key, 'base64url')),
        counter: Number(cred.counter),
      },
    });
    clearChallenge(res);

    if (!verification.verified) return res.status(401).json({ error: 'Passkey verification failed' });

    await sql`
      UPDATE passkey_credentials SET counter = ${verification.authenticationInfo.newCounter}
      WHERE credential_id = ${credentialId}`;

    console.log(JSON.stringify({ event: 'passkey_login', userId: cred.user_id }));
    createSession(res, cred.user_id);
    return res.json({ ok: true });
  } catch (err) {
    clearChallenge(res);
    console.error(JSON.stringify({ event: 'passkey_login_error', error: err.message }));
    return res.status(401).json({ error: 'Passkey sign-in failed' });
  }
}

// ── Passkey: status ─────────────────────────────────────────────────────────────
async function handlePasskeyStatus(req, res) {
  const sess = readSession(req);
  if (!sess) return res.json({ registered: false });
  const rows = await sql`SELECT id FROM passkey_credentials WHERE user_id = ${sess.userId}`;
  return res.json({ registered: rows.length > 0 });
}

// ── Auth middleware (session required, sliding window) ──────────────────────────
function auth(req, res, next) {
  const sess = readSession(req);
  if (!sess) return res.status(401).json({ error: 'Unauthorized' });
  req.userId = sess.userId;
  createSession(res, sess.userId); // refresh expiry
  next();
}

module.exports = {
  auth,
  handleLogin, handleLogout, handleSignup, handleMe, handleForgotPassword,
  handlePasskeyRegisterChallenge, handlePasskeyRegister,
  handlePasskeyLoginChallenge, handlePasskeyLogin, handlePasskeyStatus,
};
