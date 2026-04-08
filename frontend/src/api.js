// src/api.js — Bearer token auth (Supabase JWT)
const BASE = import.meta.env.VITE_API_URL || '';

// Access token in memory (safe from XSS), refresh token in sessionStorage
let _accessToken  = null;
let _refreshToken = sessionStorage.getItem('lm_refresh') || null;
let _refreshTimer = null;

export function setTokens(access, refresh, expiresIn) {
  _accessToken = access;
  if (refresh) { _refreshToken = refresh; sessionStorage.setItem('lm_refresh', refresh); }
  if (_refreshTimer) clearTimeout(_refreshTimer);
  const delay = Math.max(10_000, (expiresIn - 60) * 1000);
  _refreshTimer = setTimeout(refreshSession, delay);
}

export function clearTokens() {
  _accessToken = null; _refreshToken = null;
  sessionStorage.removeItem('lm_refresh');
  if (_refreshTimer) clearTimeout(_refreshTimer);
}

export function hasRefreshToken() { return !!_refreshToken; }

async function refreshSession() {
  if (!_refreshToken) return;
  try {
    const data = await _req('POST', '/api/auth/refresh', { refresh_token: _refreshToken }, true);
    setTokens(data.access_token, data.refresh_token, data.expires_in);
  } catch {
    clearTokens();
    window.dispatchEvent(new Event('auth:required'));
  }
}

export async function restoreSession() {
  if (!_refreshToken) return false;
  try {
    const data = await _req('POST', '/api/auth/refresh', { refresh_token: _refreshToken }, true);
    setTokens(data.access_token, data.refresh_token, data.expires_in);
    return true;
  } catch { clearTokens(); return false; }
}

async function _req(method, path, body, skipAuth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (!skipAuth && _accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;
  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (res.status === 401 && !skipAuth) {
    window.dispatchEvent(new Event('auth:required'));
    throw new Error('Authentication required');
  }
  if (!res.ok) {
    let msg = `Request failed: ${res.status}`;
    try { const d = await res.json(); msg = d.error || msg; } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Auth
export const signup          = (email, password, name) => _req('POST', '/api/auth/signup', { email, password, name });
export const login           = async (email, password) => {
  const data = await _req('POST', '/api/auth/login', { email, password });
  setTokens(data.access_token, data.refresh_token, data.expires_in);
  return data;
};
export const logout          = async () => { try { await _req('POST', '/api/auth/logout'); } catch {} clearTokens(); };
export const forgotPassword  = (email) => _req('POST', '/api/auth/forgot-password', { email });
export const getMe           = () => _req('GET', '/api/me');

// Leave types
export const getLeaveTypes   = () => _req('GET', '/api/leave/types');
export const addLeaveType    = (data) => _req('POST', '/api/leave/types', data);
export const updateLeaveType = (id, data) => _req('PUT', `/api/leave/types/${id}`, data);
export const deleteLeaveType = (id) => _req('DELETE', `/api/leave/types/${id}`);

// Leave history
export const getHistory  = () => _req('GET', '/api/leave/history');
export const applyLeave  = (d) => _req('POST', '/api/leave/apply', d);
export const cancelLeave = (id) => _req('DELETE', `/api/leave/history/${id}`);

// Settings
export const getSettings    = () => _req('GET', '/api/settings');
export const updateSettings = (d) => _req('PUT', '/api/settings', d);

// Recipients / Viber
export const getRecipients   = () => _req('GET', '/api/recipients');
export const addRecipient    = (d) => _req('POST', '/api/recipients', d);
export const deleteRecipient = (id) => _req('DELETE', `/api/recipients/${id}`);
export const getViberLinks   = (leaveHistoryId) => _req('POST', '/api/viber/links', { leaveHistoryId });
