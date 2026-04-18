// src/App.jsx — Leave Manager UI, redesigned to "warm editorial minimalism".
// Paper + ink + one teal accent. No gradients. Hairlines over shadows.
import { useState, useEffect, useRef } from 'react';
import * as api from './api.js';
import './tokens.css';

// ─── Utils ────────────────────────────────────────────────────────────────────
function weekdays(a, b) {
  let n = 0, c = new Date(a), e = new Date(b), g = 0;
  while (c <= e && g++ < 400) { const d = c.getDay(); if (d && d < 6) n++; c.setDate(c.getDate()+1); }
  return n;
}
function daysTo(s) {
  if (!s) return null;
  const t = new Date(); t.setHours(0,0,0,0);
  const d = new Date(s); d.setHours(0,0,0,0);
  return Math.ceil((d-t)/86400000);
}
function fmt(s) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}
function uid() { return Math.random().toString(36).slice(2,9); }
const today = () => new Date().toISOString().split('T')[0];

async function copyText(s) {
  if (!s) return false;
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(s); return true; }
  } catch {}
  try {
    const ta = document.createElement('textarea');
    ta.value = s; ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.top = '-1000px';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

// ─── WebAuthn helpers ─────────────────────────────────────────────────────────
const b64urlToUint8 = s => {
  const b64 = s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'=');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
};
const uint8ToB64url = u =>
  btoa(String.fromCharCode(...new Uint8Array(u))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');

// ─── Theme ────────────────────────────────────────────────────────────────────
function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('lm_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    localStorage.setItem('lm_theme', dark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#15140F' : '#F6F2EA');
  }, [dark]);
  return [dark, () => setDark(d => !d)];
}

// ─── Icon (Lucide stroke set) ────────────────────────────────────────────────
function Icon({ name, size = 18, style }) {
  const paths = {
    home: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>,
    'calendar-plus': <><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="M16 19h6"/><path d="M19 16v6"/></>,
    clock: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
    settings: <><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></>,
    'message-circle': <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>,
    'trash-2': <><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></>,
    pencil: <><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></>,
    check: <polyline points="20 6 9 17 4 12"/>,
    x: <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>,
    calendar: <><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></>,
    fingerprint: <><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/></>,
    'arrow-right': <><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></>,
    info: <><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></>,
    plus: <><path d="M5 12h14"/><path d="M12 5v14"/></>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></>,
    moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>,
    'chevron-right': <path d="m9 18 6-6-6-6"/>,
    user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    'rotate-ccw': <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></>,
    lock: <><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></>,
    'eye-off': <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></>,
    mail: <><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></>,
    copy: <><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────
const buttonBase = (size, full, disabled) => ({
  fontFamily: 'var(--ff-text)', fontWeight: 600, letterSpacing: '-0.005em',
  border: '1px solid transparent', borderRadius: 10,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  padding: size === 'sm' ? '8px 12px' : size === 'lg' ? '14px 20px' : '12px 16px',
  fontSize: size === 'sm' ? 13 : 15,
  width: full ? '100%' : undefined,
  opacity: disabled ? 0.45 : 1,
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'background var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out), transform var(--dur-fast) var(--ease-spring)',
});

function Btn({ children, variant = 'primary', size = 'md', full, leading, trailing, onClick, disabled, loading, type = 'button', style }) {
  const variants = {
    primary:   { background: 'var(--accent)', color: 'var(--accent-ink)' },
    secondary: { background: 'var(--surface)', color: 'var(--ink)', borderColor: 'var(--rule)' },
    ghost:     { background: 'transparent', color: 'var(--ink)' },
    danger:    { background: 'var(--surface)', color: 'var(--danger)', borderColor: 'var(--rule)' },
    viber:     { background: 'var(--viber)', color: '#fff' },
  };
  return (
    <button type={type} className="lm-press" onClick={(disabled || loading) ? undefined : onClick} disabled={disabled || loading}
      style={{ ...buttonBase(size, full, disabled || loading), ...variants[variant], ...style }}>
      {loading
        ? <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'lmSpin .7s linear infinite' }}/>
        : <>
            {leading && <Icon name={leading} size={size === 'sm' ? 14 : 16} />}
            {children}
            {trailing && <Icon name={trailing} size={size === 'sm' ? 14 : 16} />}
          </>}
    </button>
  );
}

function Card({ children, style, pad = 20, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 16,
      padding: pad, boxShadow: 'var(--shadow-1)',
      cursor: onClick ? 'pointer' : undefined,
      ...style,
    }}>{children}</div>
  );
}

function Field({ label, helper, error, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <span className="lm-eyebrow">{label}</span>}
      {children}
      {error ? <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>
        : helper ? <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{helper}</span> : null}
    </label>
  );
}

function Input({ label, helper, error, rightSlot, ...props }) {
  const [f, setF] = useState(false);
  const inputStyle = {
    fontFamily: 'var(--ff-text)', fontSize: 15,
    background: 'var(--surface)', color: 'var(--ink)',
    border: `1px solid ${error ? 'var(--danger)' : f ? 'var(--accent)' : 'var(--rule)'}`,
    borderRadius: 10, padding: rightSlot ? '10px 40px 10px 12px' : '10px 12px',
    outline: 'none', width: '100%', boxSizing: 'border-box',
    boxShadow: f ? 'var(--shadow-focus)' : 'none',
    transition: 'border-color var(--dur), box-shadow var(--dur)',
  };
  return (
    <Field label={label} helper={helper} error={error}>
      <div style={{ position: 'relative' }}>
        <input {...props}
          onFocus={e => { setF(true); props.onFocus?.(e); }}
          onBlur={e => { setF(false); props.onBlur?.(e); }}
          style={inputStyle}/>
        {rightSlot && (
          <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
            {rightSlot}
          </div>
        )}
      </div>
    </Field>
  );
}

function Select({ label, helper, children, ...props }) {
  const [f, setF] = useState(false);
  return (
    <Field label={label} helper={helper}>
      <div style={{ position: 'relative' }}>
        <select {...props}
          onFocus={() => setF(true)} onBlur={() => setF(false)}
          style={{
            fontFamily: 'var(--ff-text)', fontSize: 15,
            background: 'var(--surface)', color: 'var(--ink)',
            border: `1px solid ${f ? 'var(--accent)' : 'var(--rule)'}`,
            borderRadius: 10, padding: '10px 36px 10px 12px',
            outline: 'none', width: '100%', appearance: 'none', boxSizing: 'border-box',
            boxShadow: f ? 'var(--shadow-focus)' : 'none',
          }}>{children}</select>
        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%) rotate(90deg)', color: 'var(--ink-3)', pointerEvents: 'none', display: 'inline-flex' }}>
          <Icon name="chevron-right" size={14}/>
        </span>
      </div>
    </Field>
  );
}

function Pill({ tone = 'neutral', children }) {
  const tones = {
    neutral: { bg: 'var(--paper-2)', fg: 'var(--ink-2)', dot: 'var(--ink-3)' },
    accent:  { bg: 'var(--accent-soft)', fg: 'var(--accent)', dot: 'var(--accent)' },
    ok:      { bg: 'var(--ok-soft)', fg: 'var(--ok)', dot: 'var(--ok)' },
    warn:    { bg: 'var(--warn-soft)', fg: 'var(--warn)', dot: 'var(--warn)' },
    danger:  { bg: 'var(--danger-soft)', fg: 'var(--danger)', dot: 'var(--danger)' },
    viber:   { bg: 'var(--viber-soft)', fg: 'var(--viber)', dot: 'var(--viber)' },
  };
  const t = tones[tone];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: t.bg, color: t.fg,
      fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 999, background: t.dot }}/>
      {children}
    </span>
  );
}

function Sheet({ title, onClose, children, maxWidth = 480 }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(19,19,18,0.4)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 500,
        animation: 'lmFadeIn var(--dur) var(--ease-out)',
      }}>
      <div style={{
        background: 'var(--surface)', borderRadius: '22px 22px 0 0',
        width: '100%', maxWidth, maxHeight: '92vh', overflowY: 'auto',
        padding: '8px 20px calc(env(safe-area-inset-bottom, 0px) + 28px)',
        boxShadow: 'var(--shadow-2)',
        animation: 'lmSlideUp var(--dur-slow) var(--ease-out)',
        border: '1px solid var(--rule)', borderBottom: 'none',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 6 }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: 'var(--ink-4)' }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0 14px', gap: 12 }}>
          <h2 className="lm-h2" style={{ flex: 1, minWidth: 0 }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" style={{
            background: 'var(--paper-2)', border: '1px solid var(--rule)', borderRadius: 10,
            width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-2)', flexShrink: 0,
          }}><Icon name="x" size={14}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toast({ message, tone = 'ok' }) {
  const tones = {
    ok: { bg: 'var(--ink)', fg: 'var(--paper)' },
    error: { bg: 'var(--danger)', fg: '#fff' },
  };
  const t = tones[tone] || tones.ok;
  return (
    <div role="status" aria-live="polite" style={{
      position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
      left: '50%', transform: 'translateX(-50%)',
      background: t.bg, color: t.fg,
      padding: '10px 18px', borderRadius: 999, fontSize: 13, fontWeight: 500,
      boxShadow: 'var(--shadow-2)', zIndex: 2000,
      animation: 'lmFadeIn var(--dur) var(--ease-out)',
      pointerEvents: 'none', maxWidth: 320, textAlign: 'center',
    }}>{message}</div>
  );
}

function Spinner({ label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 60 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: '2px solid var(--rule)', borderTopColor: 'var(--accent)',
        animation: 'lmSpin .7s linear infinite',
      }}/>
      {label && <span className="lm-meta">{label}</span>}
    </div>
  );
}

function ThemeToggle({ dark, onToggle }) {
  return (
    <button onClick={onToggle} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} style={{
      width: 36, height: 36, borderRadius: 10,
      background: 'var(--surface)', border: '1px solid var(--rule)',
      color: 'var(--ink-2)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon name={dark ? 'sun' : 'moon'} size={16}/>
    </button>
  );
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function AuthScreen({ onLogin, dark, onToggleDark }) {
  const [view, setView] = useState('login');
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 20px 0' }}>
        <span className="lm-eyebrow">Leave Manager</span>
        <ThemeToggle dark={dark} onToggle={onToggleDark}/>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 420, margin: '0 auto', width: '100%', padding: '24px 24px calc(env(safe-area-inset-bottom, 0px) + 32px)' }}>
        {view === 'login'  && <LoginForm  onLogin={onLogin} onSwitch={setView}/>}
        {view === 'signup' && <SignupForm onLogin={onLogin} onSwitch={setView}/>}
        {view === 'forgot' && <ForgotForm onSwitch={setView}/>}
      </div>
    </div>
  );
}

function AuthHero({ title, body }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h1 className="lm-display" style={{ fontSize: 44, lineHeight: 1.02, margin: 0, letterSpacing: '-0.025em', maxWidth: 340 }}>
        {title}
      </h1>
      <p style={{ marginTop: 14, fontSize: 15, color: 'var(--ink-2)', maxWidth: 320, lineHeight: 1.5 }}>{body}</p>
    </div>
  );
}

function PasswordInput({ value, onChange, label = 'Password', placeholder, autoComplete = 'current-password', error }) {
  const [show, setShow] = useState(false);
  return (
    <Input label={label} type={show ? 'text' : 'password'} value={value}
      onChange={onChange} placeholder={placeholder} autoComplete={autoComplete}
      error={error}
      rightSlot={
        <button type="button" onClick={() => setShow(s => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          style={{ background: 'transparent', border: 0, padding: 6, color: 'var(--ink-3)', display: 'inline-flex' }}>
          <Icon name={show ? 'eye-off' : 'eye'} size={16}/>
        </button>
      }/>
  );
}

function LoginForm({ onLogin, onSwitch }) {
  const [email, setEmail] = useState('');
  const [pw, setPw]       = useState('');
  const [err, setErr]     = useState('');
  const [loading, setLoading] = useState(false);
  const [pkLoading, setPkLoad] = useState(false);

  async function submit(e) {
    e?.preventDefault?.();
    if (!email.trim() || !pw) { setErr('Email and password are required.'); return; }
    setLoading(true); setErr('');
    try { await api.login(email.trim(), pw); onLogin(); }
    catch { setErr('Invalid email or password.'); }
    finally { setLoading(false); }
  }

  async function signInWithPasskey() {
    if (!window.PublicKeyCredential) { setErr('Passkeys are not supported on this browser.'); return; }
    setPkLoad(true); setErr('');
    try {
      const { challenge, challengeId, rpId } = await api.getPasskeyChallenge();
      const assertion = await navigator.credentials.get({
        publicKey: { challenge: b64urlToUint8(challenge), rpId, allowCredentials: [], userVerification: 'required', timeout: 60000 },
      });
      if (!assertion) throw new Error('No credential returned');
      await api.loginPasskey({ credentialId: assertion.id, challengeId, verified: true });
      onLogin();
    } catch (e) {
      if (e.name === 'NotAllowedError') setErr('Passkey sign-in was cancelled.');
      else setErr(e.message || 'Passkey sign-in failed.');
    } finally { setPkLoad(false); }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <AuthHero title="Time, tracked quietly." body="Your personal leave balance — on your phone, in your pocket."/>
      <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="your@email.com" autoComplete="email"/>
      <PasswordInput value={pw} onChange={e => setPw(e.target.value)}
        placeholder="Your password" autoComplete="current-password" error={err}/>
      <Btn full size="lg" type="submit" loading={loading} trailing="arrow-right">Sign in</Btn>

      {window.PublicKeyCredential && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }}/>
            <span className="lm-eyebrow">or</span>
            <div style={{ flex: 1, height: 1, background: 'var(--rule)' }}/>
          </div>
          <Btn full variant="secondary" leading="fingerprint" loading={pkLoading} onClick={signInWithPasskey}>
            Continue with passkey
          </Btn>
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <button type="button" onClick={() => onSwitch('forgot')}
          style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--ink-3)', padding: 4 }}>
          Forgot password?
        </button>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', margin: 0 }}>
          No account? <button type="button" onClick={() => onSwitch('signup')}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, fontSize: 13, padding: 0 }}>Sign up</button>
        </p>
      </div>
    </form>
  );
}

function SignupForm({ onLogin, onSwitch }) {
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw]       = useState('');
  const [pw2, setPw2]     = useState('');
  const [err, setErr]     = useState('');
  const [loading, setLoad]= useState(false);

  async function submit(e) {
    e?.preventDefault?.(); setErr('');
    if (!email.trim() || !pw) { setErr('Email and password are required.'); return; }
    if (pw.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    if (pw !== pw2) { setErr('Passwords do not match.'); return; }
    setLoad(true);
    try { await api.signup(email.trim(), pw, name.trim()); onLogin(); }
    catch (e) { setErr(e.message?.includes('already exists') ? 'An account with this email already exists.' : (e.message || 'Sign up failed.')); }
    finally { setLoad(false); }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <AuthHero title="Create your account." body="One account, one device. Your data stays yours."/>
      <Input label="Name (optional)" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoComplete="name"/>
      <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email"/>
      <PasswordInput value={pw} onChange={e => setPw(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password"/>
      <PasswordInput label="Confirm password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Repeat password" autoComplete="new-password" error={err}/>
      <Btn full size="lg" type="submit" loading={loading} trailing="arrow-right">Create account</Btn>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', marginTop: 4 }}>
        Already have an account? <button type="button" onClick={() => onSwitch('login')}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, fontSize: 13, padding: 0 }}>Sign in</button>
      </p>
    </form>
  );
}

function ForgotForm({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [loading, setLoad] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e) {
    e?.preventDefault?.();
    if (!email.trim()) return;
    setLoad(true);
    try { await api.forgotPassword(email.trim()); } catch {}
    finally { setSent(true); setLoad(false); }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <AuthHero title="Reset your password." body="We'll send a reset link if an account exists for that email."/>
      {sent ? (
        <Card pad={20} style={{ background: 'var(--accent-soft)', borderColor: 'transparent' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="mail" size={16}/>
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Check your email.</p>
              <p style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4, lineHeight: 1.5 }}>
                If an account exists for <strong>{email}</strong>, a reset link has been sent.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com" autoComplete="email"/>
          <Btn full size="lg" type="submit" loading={loading}>Send reset link</Btn>
        </>
      )}
      <p style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', marginTop: 4 }}>
        <button type="button" onClick={() => onSwitch('login')}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, fontSize: 13, padding: 0 }}>← Back to sign in</button>
      </p>
    </form>
  );
}

// ─── Onboarding ──────────────────────────────────────────────────────────────
function Onboarding({ onDone }) {
  const [date, setDate] = useState('');
  const [saving, setSave] = useState(false);
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, maxWidth: 420, margin: '0 auto', width: '100%', padding: 'calc(env(safe-area-inset-top, 0px) + 32px) 24px calc(env(safe-area-inset-bottom, 0px) + 24px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <div className="lm-eyebrow" style={{ marginBottom: 10 }}>Step 1 of 1</div>
          <h1 className="lm-display" style={{ fontSize: 36, lineHeight: 1.05, margin: 0, letterSpacing: '-0.025em' }}>
            When does your contract renew?
          </h1>
          <p style={{ marginTop: 14, fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.5 }}>
            Your balances reset to full on this date, each year.
          </p>
          <div style={{ marginTop: 24 }}>
            <Input label="Renewal date" type="date" value={date} onChange={e => setDate(e.target.value)}/>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Btn full size="lg" trailing="arrow-right" loading={saving}
            onClick={async () => { setSave(true); await onDone(date); setSave(false); }}>
            Continue
          </Btn>
          <Btn full variant="ghost" onClick={() => onDone('')}>Skip for now</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Home ────────────────────────────────────────────────────────────────────
function BalanceCard({ type }) {
  const remaining = Math.max(0, type.total - type.used);
  const pct = type.total ? type.used / type.total : 0;
  const tone = remaining === 0 ? 'danger' : pct > 0.7 ? 'warn' : 'ok';
  const numColor = tone === 'danger' ? 'var(--danger)' : tone === 'warn' ? 'var(--warn)' : 'var(--ink)';
  const barColor = tone === 'danger' ? 'var(--danger)' : tone === 'warn' ? 'var(--warn)' : 'var(--accent)';
  const meta = remaining === 0 ? 'Used up' : tone === 'warn' ? 'Running low' : `${type.used} used`;
  return (
    <Card pad={18} style={{ flex: 1, minWidth: 0 }}>
      <div className="lm-eyebrow" style={{ marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{type.name}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--ff-display)', fontSize: 48, lineHeight: 0.95, letterSpacing: '-0.03em', color: numColor }}>{remaining}</span>
        <span className="lm-num" style={{ fontSize: 12, color: 'var(--ink-3)' }}>/ {type.total}</span>
      </div>
      <div style={{ height: 3, borderRadius: 99, background: 'var(--paper-2)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, pct * 100)}%`, background: barColor, transition: 'width 600ms var(--ease-out)' }}/>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: tone === 'ok' ? 'var(--ink-3)' : numColor, fontFamily: 'var(--ff-text)' }}>
        {meta}
      </div>
    </Card>
  );
}

function HomeScreen({ leaveTypes, settings, history, onApply, justReset, onDismissReset }) {
  const renewal = daysTo(settings.contractRenewal);
  const urgent = renewal !== null && renewal <= 30;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {justReset && (
        <Card pad={14} style={{ background: 'var(--ok-soft)', borderColor: 'transparent' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface)', color: 'var(--ok)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="check" size={14}/>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>Balances reset for your new contract year.</p>
              {settings.contractRenewal && (
                <p className="lm-meta" style={{ fontSize: 12, marginTop: 2 }}>Next reset: {fmt(settings.contractRenewal)}.</p>
              )}
            </div>
            <button onClick={onDismissReset} aria-label="Dismiss" style={{ background: 'transparent', border: 0, color: 'var(--ink-3)', padding: 4, alignSelf: 'flex-start' }}>
              <Icon name="x" size={14}/>
            </button>
          </div>
        </Card>
      )}

      {settings.contractRenewal ? (
        <Card pad={16} style={{ background: 'var(--paper-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface)', border: '1px solid var(--rule)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: urgent ? 'var(--warn)' : 'var(--ink-2)' }}>
              <Icon name="rotate-ccw" size={16}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="lm-eyebrow" style={{ marginBottom: 2 }}>Next reset</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {fmt(settings.contractRenewal)}{' '}
                <span className="lm-num" style={{ color: urgent ? 'var(--warn)' : 'var(--ink-3)', fontWeight: 400, fontSize: 12 }}>
                  · {renewal === null ? '' : renewal > 0 ? `${renewal}d away` : renewal === 0 ? 'today' : `${Math.abs(renewal)}d overdue`}
                </span>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card pad={14} style={{ borderStyle: 'dashed' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="info" size={16} style={{ color: 'var(--ink-3)' }}/>
            <p className="lm-meta" style={{ fontSize: 13 }}>Set a renewal date in <strong style={{ color: 'var(--ink)' }}>Settings → Contract</strong> to enable auto-reset.</p>
          </div>
        </Card>
      )}

      {leaveTypes.length > 0 && (
        <div>
          <div className="lm-eyebrow" style={{ marginBottom: 10 }}>Balances</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {leaveTypes.map(t => <BalanceCard key={t.id} type={t}/>)}
          </div>
        </div>
      )}

      <Btn full size="lg" leading="plus" onClick={onApply}>Apply for leave</Btn>

      {history.length > 0 && (
        <div>
          <div className="lm-eyebrow" style={{ marginBottom: 10 }}>Recent</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.slice(0, 3).map(h => <HistoryRow key={h.id} item={h}/>)}
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryRow({ item, onCancel, busy }) {
  const name = item.typeName || item.type_name;
  const sd = item.startDate || item.start_date;
  const ed = item.endDate || item.end_date;
  return (
    <Card pad={14} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--paper-2)', color: 'var(--ink-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name="calendar" size={16}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{name}</span>
          <Pill tone="accent">{item.days}d</Pill>
        </div>
        <div className="lm-meta" style={{ fontSize: 12 }}>
          {fmt(sd)}{sd !== ed ? ` → ${fmt(ed)}` : ''}
        </div>
        {item.reason && (
          <div className="lm-meta" style={{ fontSize: 12, marginTop: 2, fontStyle: 'italic', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            "{item.reason}"
          </div>
        )}
      </div>
      {onCancel && (
        <button onClick={() => onCancel(item.id)} aria-label="Cancel leave" disabled={busy}
          style={{ background: 'transparent', border: 0, color: 'var(--ink-3)', padding: 6, opacity: busy ? 0.4 : 1 }}>
          <Icon name="trash-2" size={16}/>
        </button>
      )}
    </Card>
  );
}

// ─── Apply ───────────────────────────────────────────────────────────────────
function ApplySuccess({ entry, links, onClose, toast }) {
  const sd = entry.startDate || entry.start_date;
  const ed = entry.endDate || entry.end_date;
  const typeName = entry.typeName || entry.type_name;
  const message = links[0]?.messagePreview || '';
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (links.length > 0) {
      copyText(message);
      const t = setTimeout(() => { window.location.href = links[0].viberUrl; }, 300);
      return () => clearTimeout(t);
    }
  }, []);

  async function handleCopy() {
    const ok = await copyText(message);
    if (ok) {
      setCopied(true);
      toast?.('Message copied to clipboard.');
      setTimeout(() => setCopied(false), 1600);
    } else {
      toast?.('Copy failed. Long-press the message to select it.', 'error');
    }
  }

  async function openViber(lk) {
    await copyText(message);
    window.location.href = lk.viberUrl;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--ok-soft)', color: 'var(--ok)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="check" size={16}/>
        </div>
        <div>
          <h2 className="lm-h2" style={{ margin: 0, fontSize: 24 }}>Leave submitted.</h2>
          <div className="lm-meta" style={{ marginTop: 2 }}>
            {typeName} · {entry.days} day{entry.days > 1 ? 's' : ''} · {fmt(sd)}{sd !== ed ? ` → ${fmt(ed)}` : ''}
          </div>
        </div>
      </div>

      {links.length > 0 ? (
        <>
          <Card pad={14} style={{ background: 'var(--paper-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div className="lm-eyebrow">Message preview</div>
              <button onClick={handleCopy} aria-label="Copy message" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'var(--surface)', border: '1px solid var(--rule)', borderRadius: 8,
                padding: '4px 8px', color: copied ? 'var(--accent)' : 'var(--ink-2)',
                fontFamily: 'var(--ff-text)', fontSize: 11, fontWeight: 600, letterSpacing: '-0.005em',
                transition: 'color var(--dur), border-color var(--dur)',
              }}>
                <Icon name={copied ? 'check' : 'copy'} size={12}/>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              {message}
            </p>
          </Card>
          <p className="lm-meta" style={{ fontSize: 12, marginTop: -6 }}>
            The message is copied to your clipboard — paste it if Viber doesn't pre-fill.
          </p>
          <div className="lm-eyebrow">Notify via Viber</div>
          {links.map(lk => (
            <Card key={lk.id} pad={14} onClick={() => openViber(lk)}
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--viber-soft)', color: 'var(--viber)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="message-circle" size={16}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lk.recipientName}</div>
                <div className="lm-num" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{lk.phone}</div>
              </div>
              <div style={{ color: 'var(--accent)' }}><Icon name="arrow-right" size={16}/></div>
            </Card>
          ))}
        </>
      ) : (
        <Card pad={14} style={{ borderStyle: 'dashed' }}>
          <p className="lm-meta" style={{ fontSize: 13 }}>
            No Viber recipients yet. Add them in <strong style={{ color: 'var(--ink)' }}>Settings → Viber</strong>.
          </p>
        </Card>
      )}

      <Btn full variant="secondary" onClick={onClose}>Done</Btn>
    </div>
  );
}

function ApplyScreen({ leaveTypes, recipients, onClose, onSuccess, toast }) {
  const t0 = today();
  const [typeId, setTypeId] = useState(leaveTypes[0]?.id || '');
  const [start, setStart] = useState(t0);
  const [end, setEnd] = useState(t0);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [entry, setEntry] = useState(null);
  const [links, setLinks] = useState(null);

  const sel = leaveTypes.find(l => l.id === typeId);
  const days = (start && end) ? weekdays(start, end) : 0;
  const remain = sel ? Math.max(0, sel.total - sel.used) : 0;
  const over = days > remain;

  async function submit() {
    if (!sel || days <= 0 || over) return;
    setSubmitting(true);
    try {
      const newEntry = await api.applyLeave({ leaveTypeId: typeId, startDate: start, endDate: end, reason });
      setEntry(newEntry);
      if (recipients.length > 0) {
        const { links: vl } = await api.getViberLinks(newEntry.id);
        setLinks(vl);
      } else { setLinks([]); }
    } catch (err) { toast(err.message, 'error'); }
    finally { setSubmitting(false); }
  }

  if (leaveTypes.length === 0) return (
    <div style={{ padding: 8 }}>
      <Card pad={20} style={{ borderStyle: 'dashed', textAlign: 'center' }}>
        <p className="lm-meta" style={{ fontSize: 13, lineHeight: 1.6 }}>
          No leave types configured. Go to <strong style={{ color: 'var(--ink)' }}>Settings → Leaves</strong>.
        </p>
      </Card>
    </div>
  );

  if (entry && links !== null) return <ApplySuccess entry={entry} links={links} onClose={onSuccess} toast={toast}/>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Select label="Leave type" value={typeId} onChange={e => setTypeId(e.target.value)}>
        {leaveTypes.map(l => (
          <option key={l.id} value={l.id}>
            {l.name} — {Math.max(0, l.total - l.used)} day{(l.total - l.used) !== 1 ? 's' : ''} left
          </option>
        ))}
      </Select>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Input label="Start" type="date" value={start} min={t0}
          onChange={e => { setStart(e.target.value); if (e.target.value > end) setEnd(e.target.value); }}/>
        <Input label="End" type="date" value={end} min={start} onChange={e => setEnd(e.target.value)}/>
      </div>
      {days > 0 && (
        <Card pad={14} style={{
          background: over ? 'var(--danger-soft)' : 'var(--accent-soft)',
          borderColor: 'transparent',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: over ? 'var(--danger)' : 'var(--accent)' }}>
              {days} working day{days > 1 ? 's' : ''}
            </span>
            {over && <span style={{ fontSize: 12, color: 'var(--danger)' }}>Only {remain} left</span>}
          </div>
        </Card>
      )}
      <Input label="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)}
        placeholder="Family trip, medical…"/>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Btn variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        <Btn onClick={submit} disabled={days <= 0 || over} loading={submitting} style={{ flex: 2 }}>Submit</Btn>
      </div>
    </div>
  );
}

// ─── History ─────────────────────────────────────────────────────────────────
function HistoryScreen({ leaveTypes, history, onRefresh, toast }) {
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(null);

  async function cancel(id) {
    setBusy(id);
    try { await api.cancelLeave(id); toast('Leave cancelled. Your balance is restored.'); onRefresh(); }
    catch (err) { toast(err.message, 'error'); }
    finally { setBusy(null); }
  }

  const filtered = filter === 'all'
    ? history
    : history.filter(h => (h.leaveTypeId || h.leave_type_id) === filter);

  if (history.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--paper-2)', color: 'var(--ink-3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="clock" size={28}/>
      </div>
      <div>
        <p style={{ fontSize: 15, fontWeight: 600 }}>No leave history yet.</p>
        <p className="lm-meta" style={{ fontSize: 13, marginTop: 4 }}>Apply for your first leave to see it here.</p>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card pad={16}>
        <div className="lm-eyebrow" style={{ marginBottom: 12 }}>Period summary</div>
        {leaveTypes.map(lt => {
          const pct = lt.total > 0 ? Math.min(100, (lt.used / lt.total) * 100) : 0;
          return (
            <div key={lt.id} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{lt.name}</span>
                <span className="lm-num" style={{ fontSize: 13, color: 'var(--ink)' }}>{lt.used} / {lt.total}d</span>
              </div>
              <div style={{ height: 3, borderRadius: 99, background: 'var(--paper-2)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, background: 'var(--accent)', width: `${pct}%`, transition: 'width 600ms var(--ease-out)' }}/>
              </div>
            </div>
          );
        })}
      </Card>

      {leaveTypes.length > 1 && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {[{ id: 'all', name: 'All' }, ...leaveTypes].map(opt => {
            const active = filter === opt.id;
            return (
              <button key={opt.id} onClick={() => setFilter(opt.id)} style={{
                padding: '6px 12px', borderRadius: 999,
                border: `1px solid ${active ? 'var(--accent)' : 'var(--rule)'}`,
                background: active ? 'var(--accent-soft)' : 'var(--surface)',
                color: active ? 'var(--accent)' : 'var(--ink-2)',
                fontSize: 12, fontWeight: 600, fontFamily: 'var(--ff-text)',
                whiteSpace: 'nowrap', flexShrink: 0,
              }}>{opt.name}</button>
            );
          })}
        </div>
      )}

      <p className="lm-meta" style={{ fontSize: 12 }}>Cancel a leave to restore its balance.</p>

      {filtered.length === 0
        ? <p style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 13, padding: '20px 0' }}>No entries for this filter.</p>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(h => <HistoryRow key={h.id} item={h} onCancel={cancel} busy={busy === h.id}/>)}
          </div>
      }
    </div>
  );
}

// ─── Settings ────────────────────────────────────────────────────────────────
function SettingsScreen({ leaveTypes, recipients, settings, onRefresh, onLogout, toast }) {
  const [tab, setTab] = useState('leaves');
  const tabs = [['leaves', 'Leaves'], ['viber', 'Viber'], ['contract', 'Contract'], ['account', 'Account']];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 4, background: 'var(--paper-2)', padding: 4, borderRadius: 10 }}>
        {tabs.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, border: 0, background: tab === id ? 'var(--surface)' : 'transparent',
            color: tab === id ? 'var(--ink)' : 'var(--ink-3)',
            padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            fontFamily: 'var(--ff-text)',
            boxShadow: tab === id ? 'var(--shadow-1)' : 'none',
            transition: 'background var(--dur), color var(--dur)',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'leaves' && <LeaveTypesTab leaveTypes={leaveTypes} onRefresh={onRefresh} toast={toast}/>}
      {tab === 'viber' && <RecipientsTab recipients={recipients} onRefresh={onRefresh} toast={toast}/>}
      {tab === 'contract' && <ContractTab settings={settings} onRefresh={onRefresh} toast={toast}/>}
      {tab === 'account' && <AccountTab onLogout={onLogout} toast={toast}/>}
    </div>
  );
}

const iconMiniStyle = {
  width: 28, height: 28, borderRadius: 8,
  background: 'var(--paper-2)', border: '1px solid var(--rule)',
  color: 'var(--ink-2)',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
};

function LeaveTypesTab({ leaveTypes, onRefresh, toast }) {
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save(vals) {
    setBusy(true);
    try {
      if (editing.id) {
        await api.updateLeaveType(editing.id, { name: vals.name, total: Number(vals.total), color: editing.color || '#0F5F55' });
        toast('Leave type updated.');
      } else {
        await api.addLeaveType({ name: vals.name, total: Number(vals.total), color: '#0F5F55' });
        toast('Leave type added.');
      }
      setEditing(null);
      onRefresh();
    } catch (err) { toast(err.message, 'error'); }
    finally { setBusy(false); }
  }

  async function remove(id) {
    try { await api.deleteLeaveType(id); toast('Leave type deleted.'); onRefresh(); }
    catch (err) { toast(err.message, 'error'); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {leaveTypes.map(lt => (
        <Card key={lt.id} pad={16}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1, fontWeight: 600, fontSize: 14, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lt.name}</span>
            <button style={iconMiniStyle} onClick={() => setEditing({ id: lt.id, name: lt.name, total: lt.total, color: lt.color })} aria-label="Edit">
              <Icon name="pencil" size={14}/>
            </button>
            <button style={iconMiniStyle} onClick={() => setConfirm({
              msg: `Delete "${lt.name}" leave type? History entries will stay.`,
              confirmLabel: 'Delete', danger: true,
              onConfirm: () => remove(lt.id),
            })} aria-label="Delete">
              <Icon name="trash-2" size={14}/>
            </button>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <span className="lm-meta" style={{ fontSize: 12 }}>Total <b style={{ color: 'var(--ink)' }}>{lt.total}d</b></span>
            <span className="lm-meta" style={{ fontSize: 12 }}>Used <b style={{ color: 'var(--ink)' }}>{lt.used}d</b></span>
            <span className="lm-meta" style={{ fontSize: 12 }}>Left <b style={{ color: 'var(--ink)' }}>{Math.max(0, lt.total - lt.used)}d</b></span>
          </div>
        </Card>
      ))}
      {leaveTypes.length === 0 && (
        <Card pad={20} style={{ textAlign: 'center', background: 'var(--paper-2)' }}>
          <p className="lm-meta" style={{ fontSize: 13 }}>No leave types yet.</p>
        </Card>
      )}
      <Btn variant="secondary" full leading="plus" onClick={() => setEditing({ name: '', total: 10 })}>
        Add leave type
      </Btn>

      {editing && (
        <LeaveTypeSheet initial={editing} onClose={() => setEditing(null)} onSave={save} busy={busy}/>
      )}
      {confirm && <ConfirmSheet {...confirm} onClose={() => setConfirm(null)}/>}
    </div>
  );
}

function LeaveTypeSheet({ initial, onClose, onSave, busy }) {
  const [name, setName] = useState(initial.name || '');
  const [total, setTotal] = useState(initial.total ?? 10);
  const canSave = name.trim().length > 0 && Number(total) > 0;
  return (
    <Sheet title={initial.id ? 'Edit leave type' : 'Add leave type'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Name" placeholder="e.g. Annual, Sick…" value={name}
          onChange={e => setName(e.target.value)} autoFocus/>
        <Input label="Total days per year" type="number" min="1" value={total}
          onChange={e => setTotal(e.target.value)}/>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Btn variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
          <Btn onClick={() => onSave({ name: name.trim(), total })} disabled={!canSave} loading={busy} style={{ flex: 2 }}>
            {initial.id ? 'Save' : 'Add'}
          </Btn>
        </div>
      </div>
    </Sheet>
  );
}

function RecipientsTab({ recipients, onRefresh, toast }) {
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save(vals) {
    setBusy(true);
    try {
      await api.addRecipient(vals);
      toast('Contact added.');
      setEditing(null);
      onRefresh();
    } catch (err) { toast(err.message, 'error'); }
    finally { setBusy(false); }
  }

  async function remove(id) {
    try { await api.deleteRecipient(id); toast('Contact removed.'); onRefresh(); }
    catch (err) { toast(err.message, 'error'); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <Card pad={14} style={{ background: 'var(--viber-soft)', borderColor: 'transparent' }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--viber)', lineHeight: 1.5 }}>
          After applying, the app opens Viber with a pre-filled message. One tap to send.
        </p>
      </Card>
      {recipients.map(c => (
        <Card key={c.id} pad={14} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--viber-soft)', color: 'var(--viber)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="user" size={16}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
            <div className="lm-num" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{c.phone}</div>
          </div>
          <button style={iconMiniStyle} onClick={() => setConfirm({
            msg: `Remove ${c.name}?`,
            confirmLabel: 'Remove', danger: true,
            onConfirm: () => remove(c.id),
          })} aria-label="Remove">
            <Icon name="trash-2" size={14}/>
          </button>
        </Card>
      ))}
      {recipients.length === 0 && (
        <Card pad={20} style={{ textAlign: 'center', background: 'var(--paper-2)' }}>
          <p className="lm-meta" style={{ fontSize: 13 }}>No contacts yet. Add your manager or HR.</p>
        </Card>
      )}
      <Btn variant="secondary" full leading="plus" onClick={() => setEditing({ name: '', phone: '' })}>
        Add contact
      </Btn>

      {editing && <ContactSheet initial={editing} onClose={() => setEditing(null)} onSave={save} busy={busy}/>}
      {confirm && <ConfirmSheet {...confirm} onClose={() => setConfirm(null)}/>}
    </div>
  );
}

function ContactSheet({ initial, onClose, onSave, busy }) {
  const [name, setName] = useState(initial.name || '');
  const [phone, setPhone] = useState(initial.phone || '');
  const canSave = name.trim().length > 0 && phone.trim().length > 0;
  return (
    <Sheet title={initial.id ? 'Edit contact' : 'Add contact'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Name" placeholder="e.g. Zaha (manager)" value={name}
          onChange={e => setName(e.target.value)} autoFocus/>
        <Input label="Viber phone number" placeholder="+960 ..." value={phone}
          onChange={e => setPhone(e.target.value)}
          helper="Must include country code for the Viber deep-link."/>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Btn variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
          <Btn onClick={() => onSave({ name: name.trim(), phone: phone.trim() })}
            disabled={!canSave} loading={busy} style={{ flex: 2 }}>
            {initial.id ? 'Save' : 'Add'}
          </Btn>
        </div>
      </div>
    </Sheet>
  );
}

function ContractTab({ settings, onRefresh, toast }) {
  const [date, setDate] = useState(settings.contractRenewal || '');
  const [saving, setSaving] = useState(false);
  const saved = date === (settings.contractRenewal || '');
  const days = daysTo(date);

  async function save() {
    setSaving(true);
    try { await api.updateSettings({ contractRenewal: date }); toast('Renewal date saved.'); onRefresh(); }
    catch (err) { toast(err.message, 'error'); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card pad={14} style={{ background: 'var(--accent-soft)', borderColor: 'transparent' }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--accent)', lineHeight: 1.5 }}>
          On the renewal date, all balances reset to full and the date advances by one year.
        </p>
      </Card>
      <Input label="Next renewal date" type="date" value={date} onChange={e => setDate(e.target.value)}/>
      {date && days !== null && (
        <Card pad={12} style={{ background: days <= 30 ? 'var(--warn-soft)' : 'var(--paper-2)', borderColor: 'transparent' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: days <= 30 ? 'var(--warn)' : 'var(--ink-2)' }}>
            {days > 0 ? `${days} days until reset` : days === 0 ? 'Resets today.' : `${Math.abs(days)} days overdue`}
          </p>
        </Card>
      )}
      {settings.lastResetDate && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--paper-2)', borderRadius: 10 }}>
          <Icon name="rotate-ccw" size={14} style={{ color: 'var(--ink-3)' }}/>
          <p className="lm-meta" style={{ fontSize: 12 }}>Last reset: <strong style={{ color: 'var(--ink)' }}>{fmt(settings.lastResetDate)}</strong></p>
        </div>
      )}
      <Btn full onClick={save} disabled={saved || saving} loading={saving}>
        {saved ? 'Saved' : 'Save'}
      </Btn>
    </div>
  );
}

function AccountTab({ onLogout, toast }) {
  const [pkStatus, setPkStatus] = useState(null);
  const [pkLoad, setPkLoad] = useState(false);
  const [logoutLoad, setLogoutLoad] = useState(false);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    api.getPasskeyStatus().then(({ registered }) => setPkStatus(registered)).catch(() => setPkStatus(false));
  }, []);

  async function handleLogout() {
    setLogoutLoad(true);
    try { await api.logout(); onLogout(); }
    catch { toast('Sign out failed.', 'error'); }
    finally { setLogoutLoad(false); }
  }

  async function registerPasskey() {
    if (!window.PublicKeyCredential) { toast('Passkeys are not supported on this browser.', 'error'); return; }
    setPkLoad(true);
    try {
      const { challenge, challengeId, rpId, rpName, userId } = await api.getPasskeyChallenge();
      const userIdBytes = userId
        ? new Uint8Array(userId.replace(/-/g, '').match(/.{2}/g).map(b => parseInt(b, 16)))
        : crypto.getRandomValues(new Uint8Array(16));
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: b64urlToUint8(challenge), rp: { id: rpId, name: rpName || 'Leave Manager' },
          user: { id: userIdBytes, name: 'user', displayName: 'Leave Manager' },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
          timeout: 60000,
        },
      });
      if (!credential) throw new Error('No credential created');
      let pkBytes;
      try { pkBytes = credential.response.getPublicKey?.() || credential.response.clientDataJSON; }
      catch { pkBytes = credential.response.clientDataJSON; }
      await api.registerPasskey({ credentialId: credential.id, publicKey: uint8ToB64url(pkBytes), challengeId });
      toast('Passkey registered. You can sign in with biometrics next time.');
      setPkStatus(true);
    } catch (e) {
      if (e.name === 'NotAllowedError') toast('Passkey registration cancelled.', 'error');
      else toast(e.message || 'Failed to register passkey.', 'error');
    } finally { setPkLoad(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card pad={16}>
        <div className="lm-eyebrow" style={{ marginBottom: 6 }}>Signed in</div>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Sessions last 30 days.</div>
      </Card>

      {window.PublicKeyCredential && (
        <Card pad={16}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Icon name="fingerprint" size={18} style={{ color: 'var(--accent)' }}/>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Passkey</span>
            {pkStatus === true && <Pill tone="ok">Active</Pill>}
            {pkStatus === false && <Pill tone="neutral">Off</Pill>}
          </div>
          {pkStatus === null ? (
            <p className="lm-meta" style={{ fontSize: 12 }}>Checking…</p>
          ) : pkStatus ? (
            <p className="lm-meta" style={{ fontSize: 12 }}>You can sign in with Face ID or fingerprint.</p>
          ) : (
            <>
              <p className="lm-meta" style={{ fontSize: 12, marginBottom: 12 }}>
                Register your fingerprint or Face ID to skip the password.
              </p>
              <Btn variant="secondary" full size="sm" leading="fingerprint" loading={pkLoad} onClick={registerPasskey}>
                Register passkey
              </Btn>
            </>
          )}
        </Card>
      )}

      <Btn variant="danger" full onClick={() => setConfirm({
        msg: 'Sign out? You can sign back in any time.',
        confirmLabel: 'Sign out', danger: true,
        onConfirm: handleLogout,
      })} loading={logoutLoad}>Sign out</Btn>

      {confirm && <ConfirmSheet {...confirm} onClose={() => setConfirm(null)}/>}
    </div>
  );
}

function ConfirmSheet({ msg, confirmLabel = 'Confirm', danger, onConfirm, onClose }) {
  return (
    <Sheet title="Confirm" onClose={onClose}>
      <p style={{ margin: '0 0 18px', fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.5 }}>{msg}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose(); }} style={{ flex: 2 }}>
          {confirmLabel}
        </Btn>
      </div>
    </Sheet>
  );
}

// ─── Root App ────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, toggleDark] = useTheme();
  const [authed, setAuthed] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [history, setHistory] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('home');
  const [applyOpen, setApplyOpen] = useState(false);
  const [justReset, setJustReset] = useState(false);
  const [toast, setToastState] = useState(null);

  function showToast(msg, tone = 'ok') { setToastState({ msg, tone, key: uid() }); }

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToastState(null), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const h = () => { setAuthed(false); setLoading(false); };
    window.addEventListener('auth:required', h);
    return () => window.removeEventListener('auth:required', h);
  }, []);

  async function loadAll() {
    try {
      const [typesRes, hist, recs, setts] = await Promise.all([
        api.getLeaveTypes(), api.getHistory(), api.getRecipients(), api.getSettings(),
      ]);
      setLeaveTypes(typesRes.types);
      if (typesRes.resetOccurred) setJustReset(true);
      setHistory(hist);
      setRecipients(recs);
      setSettings(setts);
      setError(null);
      setAuthed(true);
    } catch (err) {
      if (err.message !== 'Authentication required') setError(err.message);
    }
  }

  useEffect(() => {
    api.restoreSession().then(ok => {
      if (ok) { setAuthed(true); return loadAll(); }
    }).finally(() => { setAuthReady(true); setLoading(false); });
  }, []);

  async function onLogin() { setLoading(true); await loadAll(); setLoading(false); }
  function onLogout() { setAuthed(false); setTab('home'); }
  async function completeOnboarding(renewalDate) {
    await api.updateSettings({ onboarded: 'true', contractRenewal: renewalDate || '' });
    await loadAll();
  }

  if (!authReady || loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--paper)' }}>
      <Spinner/>
    </div>
  );

  if (!authed) return <AuthScreen onLogin={onLogin} dark={dark} onToggleDark={toggleDark}/>;

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--paper)', padding: 32, textAlign: 'center', gap: 14 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--danger-soft)', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="info" size={24}/>
      </div>
      <h2 className="lm-h2" style={{ margin: 0 }}>Can't reach the server.</h2>
      <p className="lm-meta" style={{ maxWidth: 320 }}>Check your connection and try again.</p>
      <p style={{ fontSize: 11, color: 'var(--ink-3)', background: 'var(--paper-2)', padding: '6px 10px', borderRadius: 8 }}>{error}</p>
      <Btn onClick={() => { setLoading(true); loadAll().finally(() => setLoading(false)); }}>Retry</Btn>
    </div>
  );

  if (settings.onboarded !== 'true') return <Onboarding onDone={completeOnboarding}/>;

  const tabTitles = { home: 'Today', apply: 'Apply', history: 'History', settings: 'Settings' };
  const tabEyebrow = {
    home: new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
    apply: 'Request leave',
    history: 'Past leave',
    settings: 'Preferences',
  };

  return (
    <>
      {toast && <Toast key={toast.key} message={toast.msg} tone={toast.tone}/>}

      <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: 'var(--paper)', position: 'relative' }}>
        <div style={{
          padding: 'calc(env(safe-area-inset-top, 0px) + 16px) 20px 14px',
          borderBottom: '1px solid var(--rule)',
          background: 'color-mix(in srgb, var(--paper) 92%, transparent)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12,
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="lm-eyebrow" style={{ marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tabEyebrow[tab]}
            </div>
            <h1 className="lm-display" style={{ fontSize: 30, lineHeight: 1, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tabTitles[tab]}
            </h1>
          </div>
          <ThemeToggle dark={dark} onToggle={toggleDark}/>
        </div>

        <div style={{ padding: '20px 20px calc(env(safe-area-inset-bottom, 0px) + 100px)' }}>
          {tab === 'home' && (
            <HomeScreen leaveTypes={leaveTypes} settings={settings} history={history}
              onApply={() => setApplyOpen(true)} justReset={justReset}
              onDismissReset={() => setJustReset(false)}/>
          )}
          {tab === 'apply' && (
            <ApplyScreen leaveTypes={leaveTypes} recipients={recipients}
              onClose={() => setTab('home')}
              onSuccess={() => { loadAll(); setTab('home'); showToast('Leave submitted.'); }}
              toast={showToast}/>
          )}
          {tab === 'history' && (
            <HistoryScreen leaveTypes={leaveTypes} history={history}
              onRefresh={loadAll} toast={showToast}/>
          )}
          {tab === 'settings' && (
            <SettingsScreen leaveTypes={leaveTypes} recipients={recipients} settings={settings}
              onRefresh={loadAll} onLogout={onLogout} toast={showToast}/>
          )}
        </div>

        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 480, zIndex: 200,
          padding: '10px 20px calc(env(safe-area-inset-bottom, 0px) + 12px)',
          background: 'color-mix(in srgb, var(--paper) 92%, transparent)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--rule)',
          display: 'flex', gap: 4,
        }}>
          {[
            { id: 'home', label: 'Home', icon: 'home' },
            { id: 'apply', label: 'Apply', icon: 'calendar-plus' },
            { id: 'history', label: 'History', icon: 'clock' },
            { id: 'settings', label: 'Settings', icon: 'settings' },
          ].map(it => {
            const active = tab === it.id;
            return (
              <button key={it.id} onClick={() => { if (it.id === 'apply') setApplyOpen(true); else setTab(it.id); }}
                aria-label={it.label}
                style={{
                  flex: 1, border: 0, background: active ? 'var(--accent-soft)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--ink-3)',
                  padding: '8px 4px', borderRadius: 10,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  fontFamily: 'var(--ff-text)', fontSize: 10, fontWeight: 600,
                  transition: 'background var(--dur), color var(--dur)',
                }}>
                <Icon name={it.icon} size={18}/>
                {it.label}
              </button>
            );
          })}
        </div>

        {applyOpen && (
          <Sheet title="Apply for leave" onClose={() => setApplyOpen(false)}>
            <ApplyScreen leaveTypes={leaveTypes} recipients={recipients}
              onClose={() => setApplyOpen(false)}
              onSuccess={() => { loadAll(); setApplyOpen(false); showToast('Leave submitted.'); }}
              toast={showToast}/>
          </Sheet>
        )}
      </div>
    </>
  );
}
