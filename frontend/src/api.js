// src/api.js
const BASE = import.meta.env.VITE_API_URL || '';

async function req(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (res.status === 401) {
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
export const login = (password) => req('POST','/api/auth/login',{ password });
export const logout = () => req('POST','/api/auth/logout');
export const getPasskeyChallenge = () => req('GET','/api/auth/passkey/challenge');
export const registerPasskey = (d) => req('POST','/api/auth/passkey/register',d);
export const loginPasskey = (d) => req('POST','/api/auth/passkey/login',d);
export const getPasskeyStatus = () => req('GET','/api/auth/passkey/status');
export const getLeaveTypes = () => req('GET','/api/leave/types');
export const addLeaveType = (data) => req('POST','/api/leave/types',data);
export const updateLeaveType = (id,data) => req('PUT',`/api/leave/types/${id}`,data);
export const deleteLeaveType = (id) => req('DELETE',`/api/leave/types/${id}`);
export const getHistory = () => req('GET','/api/leave/history');
export const applyLeave = (d) => req('POST','/api/leave/apply',d);
export const cancelLeave = (id) => req('DELETE',`/api/leave/history/${id}`);
export const getSettings = () => req('GET','/api/settings');
export const updateSettings = (d) => req('PUT','/api/settings',d);
export const getRecipients = () => req('GET','/api/recipients');
export const addRecipient = (d) => req('POST','/api/recipients',d);
export const deleteRecipient = (id) => req('DELETE',`/api/recipients/${id}`);
export const getViberLinks = (leaveHistoryId) => req('POST','/api/viber/links',{leaveHistoryId});
