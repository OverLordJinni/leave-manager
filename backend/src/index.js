// src/index.js
require('dotenv').config();
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
const { auth, handleLogin, handleLogout, handlePasskeyChallenge, handlePasskeyRegister, handlePasskeyLogin, handlePasskeyStatus } = require('./middleware/auth');
const { seedDefaults } = require('./db/seed');

const app    = express();
const PORT   = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';
const FRONTEND_URL = process.env.FRONTEND_URL;
if (isProd && !FRONTEND_URL) { console.error('FATAL: FRONTEND_URL must be set.'); process.exit(1); }

app.use((req, res, next) => {
  if (isProd && req.headers['x-forwarded-proto'] === 'http') return res.redirect(301, `https://${req.headers.host}${req.url}`);
  next();
});
app.use((req, res, next) => { req.id = crypto.randomUUID(); res.setHeader('X-Request-Id', req.id); next(); });
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'",'https://fonts.googleapis.com'],fontSrc:["'self'",'https://fonts.gstatic.com'],connectSrc:["'self'"],imgSrc:["'self'",'data:'],frameSrc:["'none'"],objectSrc:["'none'"]}},hsts:isProd?{maxAge:31536000,includeSubDomains:true}:false}));
app.use(cors({ origin: FRONTEND_URL||'http://localhost:5173', methods:['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders:['Content-Type'], credentials:true }));
app.use(express.json({ limit:'10kb' }));
app.use(cookieParser());
const apiLimiter = rateLimit({ windowMs:60_000, max:60, standardHeaders:true, legacyHeaders:false, message:{error:'Too many requests.'} });
const authLimiter = rateLimit({ windowMs:15*60_000, max:10, message:{error:'Too many login attempts.'} });
const healthLimiter = rateLimit({ windowMs:60_000, max:10 });
app.get('/health', healthLimiter, (_,res) => res.json({ok:true}));
app.post('/api/auth/login', authLimiter, handleLogin);
app.post('/api/auth/logout', handleLogout);
app.get('/api/auth/passkey/challenge', authLimiter, handlePasskeyChallenge);
app.post('/api/auth/passkey/register', authLimiter, handlePasskeyRegister);
app.post('/api/auth/passkey/login', authLimiter, handlePasskeyLogin);
app.get('/api/auth/passkey/status', handlePasskeyStatus);
app.use('/api', apiLimiter, auth);
app.use('/api/leave',leaveRoutes);app.use('/api/settings',settingsRoutes);app.use('/api/recipients', recipientRoutes);app.use('/api/viber',viberRoutes);
app.use((req,res) => res.status(404).json({error:'Not found'}));
app.use((err, req, res, next) => { console.error(JSON.stringify({requestId:req.id,path:req.path,error:err.message})); res.status(500).json({error:'Internal server error'}); });
app.listen(PORT, async () => { console.log(`Leave Manager API -- port ${PORT}`); await seedDefaults(); });
