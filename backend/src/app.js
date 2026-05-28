// src/app.js
// Builds and exports the Express app. No app.listen() and no boot-time seeding
// here — this module is imported both by the local dev entry (src/index.js) and
// by the Vercel serverless function (../../api/[...path].js).
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit    = require('express-rate-limit');
const crypto       = require('crypto');

const leaveRoutes     = require('./routes/leave');
const settingsRoutes  = require('./routes/settings');
const recipientRoutes = require('./routes/recipients');
const viberRoutes     = require('./routes/viber');
const {
  auth,
  handleLogin, handleLogout, handleSignup, handleMe, handleForgotPassword,
  handlePasskeyRegisterChallenge, handlePasskeyRegister,
  handlePasskeyLoginChallenge, handlePasskeyLogin, handlePasskeyStatus,
} = require('./middleware/auth');

const app    = express();
const isProd = process.env.NODE_ENV === 'production';
const FRONTEND_URL = process.env.FRONTEND_URL;
if (isProd && !FRONTEND_URL) { console.error('FATAL: FRONTEND_URL must be set.'); process.exit(1); }

// Vercel terminates TLS and proxies; trust one hop so rate-limiters see the real IP.
app.set('trust proxy', isProd ? 1 : false);

// Request ID
app.use((req, res, next) => { req.id = crypto.randomUUID(); res.setHeader('X-Request-Id', req.id); next(); });

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'", 'https://fonts.googleapis.com'],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
      connectSrc:  ["'self'"],
      imgSrc:      ["'self'", 'data:'],
      frameSrc:    ["'none'"],
      objectSrc:   ["'none'"],
    },
  },
  hsts: isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
}));

// Same-origin in production (frontend + API share the Vercel domain), so CORS is
// effectively a no-op there. Kept for cross-origin local dev flexibility.
app.use(cors({
  origin:         FRONTEND_URL || 'http://localhost:5173',
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials:    true,
}));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// ── Rate limiters (in-memory → best-effort per serverless instance) ────────────
const apiLimiter    = rateLimit({ windowMs: 60_000,      max: 60,  standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests.' } });
const authLimiter   = rateLimit({ windowMs: 15 * 60_000, max: 20,  message: { error: 'Too many login attempts. Please wait 15 minutes.' } });
const healthLimiter = rateLimit({ windowMs: 60_000,      max: 30 });

// ── Health (both paths so it works locally and behind the Vercel /api function) ─
const health = (_req, res) => res.json({ ok: true });
app.get('/health',     healthLimiter, health);
app.get('/api/health', healthLimiter, health);

// ── Auth — no session required ─────────────────────────────────────────────────
app.post('/api/auth/signup',          authLimiter, handleSignup);
app.post('/api/auth/login',           authLimiter, handleLogin);
app.post('/api/auth/logout',                       handleLogout);
app.post('/api/auth/forgot-password', authLimiter, handleForgotPassword);
app.get( '/api/auth/me',                           handleMe);

// Passkey login (no session)
app.get( '/api/auth/passkey/login-challenge', authLimiter, handlePasskeyLoginChallenge);
app.post('/api/auth/passkey/login',           authLimiter, handlePasskeyLogin);

// Passkey registration (session checked inside the handlers, which run before `auth`)
app.get( '/api/auth/passkey/register-challenge', authLimiter, handlePasskeyRegisterChallenge);
app.post('/api/auth/passkey/register',           authLimiter, handlePasskeyRegister);
app.get( '/api/auth/passkey/status',                          handlePasskeyStatus);

// ── Protected routes (session required) ──────────────────────────────────────
app.use('/api', apiLimiter, auth);
app.use('/api/leave',      leaveRoutes);
app.use('/api/settings',   settingsRoutes);
app.use('/api/recipients', recipientRoutes);
app.use('/api/viber',      viberRoutes);

// ── Catch-all + error handler ──────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, _next) => {
  console.error(JSON.stringify({ requestId: req.id, path: req.path, error: err.message }));
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
