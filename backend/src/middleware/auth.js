// src/middleware/auth.js
// Auth via Supabase Auth JWT — verify token, extract user_id
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const isProd = process.env.NODE_ENV === 'production';

// Auth middleware — expects Authorization: Bearer <supabase_access_token>
async function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }
  const token = authHeader.slice(7);
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid or expired token' });
    req.user   = user;
    req.userId = user.id;
    next();
  } catch {
    return res.status(401).json({ error: 'Token verification failed' });
  }
}

// Signup — creates user in Supabase Auth, seeds default settings
async function handleSignup(req, res) {
  const { email, password, name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      user_metadata: { name: (name || '').trim() },
      email_confirm: true,
    });
    if (error) {
      if (error.message?.toLowerCase().includes('already')) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }
      return res.status(400).json({ error: error.message });
    }
    // Seed default settings for new user
    await supabase.from('settings').insert([
      { user_id: data.user.id, key: 'contractRenewal', value: '' },
      { user_id: data.user.id, key: 'lastResetDate',   value: '' },
      { user_id: data.user.id, key: 'onboarded',       value: 'false' },
    ]);
    return res.status(201).json({ ok: true, message: 'Account created.' });
  } catch (err) {
    console.error('Signup error:', err.message);
    return res.status(500).json({ error: 'Signup failed' });
  }
}

// Login — returns JWT tokens
async function handleLogin(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(), password,
    });
    if (error) return res.status(401).json({ error: 'Invalid email or password' });
    return res.json({
      ok: true,
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in:    data.session.expires_in,
      user: { id: data.user.id, email: data.user.email, name: data.user.user_metadata?.name || '' }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ error: 'Login failed' });
  }
}

// Refresh access token
async function handleRefresh(req, res) {
  const { refresh_token } = req.body || {};
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token required' });
  try {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });
    if (error) return res.status(401).json({ error: 'Session refresh failed' });
    return res.json({
      ok: true,
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in:    data.session.expires_in,
    });
  } catch {
    return res.status(500).json({ error: 'Refresh failed' });
  }
}

// Forgot password — sends reset email via Supabase
async function handleForgotPassword(req, res) {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
      redirectTo: process.env.FRONTEND_URL + '/reset-password',
    });
  } catch {}
  // Always return success — prevents user enumeration
  return res.json({ ok: true, message: 'If that email exists, a reset link has been sent.' });
}

// Logout
async function handleLogout(req, res) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try { await supabase.auth.admin.signOut(authHeader.slice(7)); } catch {}
  }
  return res.json({ ok: true });
}

// Get current user info
async function handleMe(req, res) {
  return res.json({
    id:    req.user.id,
    email: req.user.email,
    name:  req.user.user_metadata?.name || '',
  });
}

module.exports = { auth, handleSignup, handleLogin, handleRefresh, handleForgotPassword, handleLogout, handleMe };
