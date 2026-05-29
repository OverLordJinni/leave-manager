// src/App.jsx — Salam. iOS-native (Cupertino) UI, sunset coral→amber accent.
import React, { useState, useEffect } from 'react';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
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
  return new Date(s).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
}
function fmtShort(s) {
  if (!s) return '';
  return new Date(s).toLocaleDateString('en-GB', { day:'numeric', month:'short' });
}
const uid = () => Math.random().toString(36).slice(2,9);
const today = () => new Date().toISOString().split('T')[0];
// Strip the backend's urgent-task marker for display
const cleanReason = r => (r || '').split('\n__UT__:')[0].trim();
const urgentTaskOf = r => { const p = (r || '').split('\n__UT__:'); return p.length > 1 ? p[1].trim() : ''; };

async function copyText(s) {
  if (!s) return false;
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(s); return true; } } catch {}
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

// ─── Theme ──────────────────────────────────────────────────────────────────
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
    if (meta) meta.setAttribute('content', dark ? '#000000' : '#F2F2F7');
  }, [dark]);
  return [dark, () => setDark(d => !d)];
}

// ─── Icon (Lucide stroke set) ────────────────────────────────────────────────
function Icon({ name, size = 18, style, strokeWidth = 1.9 }) {
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
    'chevron-down': <path d="m6 9 6 6 6-6"/>,
    user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    'rotate-ccw': <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></>,
    lock: <><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
    eye: <><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></>,
    'eye-off': <><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></>,
    mail: <><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></>,
    copy: <><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></>,
    'log-out': <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></>,
    sparkles: <path d="M9.94 14.06A2 2 0 0 0 8.5 12.6l-5.6-1.45a.5.5 0 0 1 0-.96L8.5 8.74A2 2 0 0 0 9.94 7.3l1.45-5.6a.5.5 0 0 1 .96 0l1.45 5.6a2 2 0 0 0 1.44 1.44l5.6 1.45a.5.5 0 0 1 0 .96l-5.6 1.45a2 2 0 0 0-1.44 1.44l-1.45 5.6a.5.5 0 0 1-.96 0z"/>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────
function Spin({ size = 18, color = 'currentColor' }) {
  return <span style={{ width: size, height: size, borderRadius: '50%', display: 'inline-block',
    border: `2px solid color-mix(in srgb, ${color} 28%, transparent)`, borderTopColor: color,
    animation: 'spin .7s linear infinite' }}/>;
}

function Spinner({ label }) {
  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: 60 }}>
    <Spin size={30} color="var(--accent)"/>{label && <span className="t-subhead">{label}</span>}
  </div>;
}

function Btn({ children, variant = 'primary', size = 'lg', full, leading, trailing, onClick, disabled, loading, type = 'button', style }) {
  const pad = size === 'sm' ? '9px 14px' : size === 'md' ? '12px 18px' : '15px 20px';
  const minH = size === 'sm' ? 38 : size === 'md' ? 46 : 52;
  const fz = size === 'sm' ? 15 : 17;
  const variants = {
    primary:   { background: 'var(--accent-grad)', color: 'var(--accent-ink)', boxShadow: 'var(--shadow-accent)' },
    secondary: { background: 'var(--fill)', color: 'var(--label)' },
    tinted:    { background: 'var(--accent-soft)', color: 'var(--tint)' },
    plain:     { background: 'transparent', color: 'var(--tint)' },
    danger:    { background: 'var(--danger-soft)', color: 'var(--danger)' },
    viber:     { background: 'var(--viber)', color: '#fff' },
  };
  return (
    <button type={type} className="press" disabled={disabled || loading}
      onClick={(disabled || loading) ? undefined : onClick}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        border: 'none', borderRadius: 'var(--r-control)', padding: pad, minHeight: minH,
        fontSize: fz, fontWeight: 600, letterSpacing: '-0.01em', width: full ? '100%' : undefined,
        opacity: disabled ? 0.4 : 1, cursor: disabled ? 'default' : 'pointer',
        ...variants[variant], ...style }}>
      {loading ? <Spin size={size === 'sm' ? 16 : 19}/> : <>
        {leading && <Icon name={leading} size={size === 'sm' ? 16 : 19}/>}
        {children}
        {trailing && <Icon name={trailing} size={size === 'sm' ? 16 : 19}/>}
      </>}
    </button>
  );
}

function Card({ children, style, pad = 16, onClick }) {
  return <div onClick={onClick} className={onClick ? 'press' : undefined}
    style={{ background: 'var(--surface)', borderRadius: 'var(--r-card)', padding: pad,
      boxShadow: 'var(--shadow-1)', cursor: onClick ? 'pointer' : undefined, ...style }}>{children}</div>;
}

// iOS inset grouped list
function Group({ header, footer, children, style }) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (items.length === 0) return null;
  return (
    <section style={style}>
      {header && <div className="t-section" style={{ padding: '0 16px 7px' }}>{header}</div>}
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--r-card)', overflow: 'hidden', boxShadow: 'var(--shadow-1)' }}>
        {items.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div style={{ height: 1, background: 'var(--separator)', marginLeft: 16, transform: 'scaleY(0.5)' }}/>}
            {c}
          </React.Fragment>
        ))}
      </div>
      {footer && <div className="t-footnote" style={{ padding: '8px 16px 0' }}>{footer}</div>}
    </section>
  );
}

function Row({ icon, iconBg, iconColor = '#fff', title, subtitle, value, chevron, onClick, danger, trailing, titleWeight = 400 }) {
  return (
    <div onClick={onClick} className={onClick ? 'row-press' : undefined}
      style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 16px', minHeight: 50,
        cursor: onClick ? 'pointer' : 'default' }}>
      {icon && <span style={{ width: 30, height: 30, borderRadius: 8, background: iconBg || 'var(--fill)', color: iconColor,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name={icon} size={17}/></span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="t-body" style={{ color: danger ? 'var(--danger)' : 'var(--label)', fontWeight: titleWeight,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
        {subtitle && <div className="t-footnote" style={{ marginTop: 1 }}>{subtitle}</div>}
      </div>
      {value != null && <span className="t-body num" style={{ color: 'var(--label-2)' }}>{value}</span>}
      {trailing}
      {chevron && <span style={{ color: 'var(--label-4)', display: 'inline-flex', marginRight: -4 }}><Icon name="chevron-right" size={18}/></span>}
    </div>
  );
}

function Field({ label, hint, error, children }) {
  return (
    <label style={{ display: 'block' }}>
      {label && <div className="t-footnote" style={{ marginBottom: 7, paddingLeft: 4, color: 'var(--label-2)', fontWeight: 500 }}>{label}</div>}
      {children}
      {(error || hint) && <div className="t-caption" style={{ marginTop: 6, paddingLeft: 4, color: error ? 'var(--danger)' : 'var(--label-3)' }}>{error || hint}</div>}
    </label>
  );
}

function Input({ label, hint, error, rightSlot, ...props }) {
  const [f, setF] = useState(false);
  return (
    <Field label={label} hint={hint} error={error}>
      <div style={{ position: 'relative' }}>
        <input {...props}
          onFocus={e => { setF(true); props.onFocus?.(e); }}
          onBlur={e => { setF(false); props.onBlur?.(e); }}
          style={{ width: '100%', boxSizing: 'border-box', fontSize: 17, lineHeight: 1.3,
            padding: rightSlot ? '13px 44px 13px 14px' : '13px 14px',
            background: 'var(--surface)', color: 'var(--label)',
            border: `1.5px solid ${error ? 'var(--danger)' : f ? 'var(--accent)' : 'var(--separator)'}`,
            borderRadius: 'var(--r-field)', outline: 'none',
            boxShadow: f ? 'var(--ring)' : 'none', transition: 'border-color var(--dur), box-shadow var(--dur)' }}/>
        {rightSlot && <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>{rightSlot}</div>}
      </div>
    </Field>
  );
}

function PasswordInput({ value, onChange, label = 'Password', placeholder, autoComplete = 'current-password', error }) {
  const [show, setShow] = useState(false);
  return (
    <Input label={label} type={show ? 'text' : 'password'} value={value} onChange={onChange}
      placeholder={placeholder} autoComplete={autoComplete} error={error}
      rightSlot={
        <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide' : 'Show'}
          style={{ background: 'transparent', border: 0, padding: 8, color: 'var(--label-3)', display: 'inline-flex' }}>
          <Icon name={show ? 'eye-off' : 'eye'} size={18}/>
        </button>
      }/>
  );
}

function Select({ label, hint, children, ...props }) {
  const [f, setF] = useState(false);
  return (
    <Field label={label} hint={hint}>
      <div style={{ position: 'relative' }}>
        <select {...props} onFocus={() => setF(true)} onBlur={() => setF(false)}
          style={{ width: '100%', boxSizing: 'border-box', fontSize: 17, appearance: 'none',
            padding: '13px 40px 13px 14px', background: 'var(--surface)', color: 'var(--label)',
            border: `1.5px solid ${f ? 'var(--accent)' : 'var(--separator)'}`,
            borderRadius: 'var(--r-field)', outline: 'none', boxShadow: f ? 'var(--ring)' : 'none' }}>
          {children}
        </select>
        <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--label-3)', pointerEvents: 'none', display: 'inline-flex' }}>
          <Icon name="chevron-down" size={18}/>
        </span>
      </div>
    </Field>
  );
}

function Pill({ tone = 'neutral', children }) {
  const tones = {
    neutral: ['var(--fill)', 'var(--label-2)'], accent: ['var(--accent-soft)', 'var(--tint)'],
    ok: ['var(--ok-soft)', 'var(--ok)'], warn: ['var(--warn-soft)', 'var(--warn)'],
    danger: ['var(--danger-soft)', 'var(--danger)'], viber: ['var(--viber-soft)', 'var(--viber)'],
  };
  const [bg, fg] = tones[tone] || tones.neutral;
  return <span className="t-caption num" style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
    background: bg, color: fg, fontWeight: 600, padding: '3px 9px', borderRadius: 999, flexShrink: 0 }}>{children}</span>;
}

function Progress({ pct, color = 'var(--accent)', h = 8 }) {
  return <div style={{ height: h, borderRadius: 99, background: 'var(--fill)', overflow: 'hidden' }}>
    <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, pct))}%`, background: color, borderRadius: 99, transition: 'width 700ms var(--ease)' }}/>
  </div>;
}

function Segmented({ value, onChange, options }) {
  return (
    <div style={{ display: 'flex', background: 'var(--fill)', borderRadius: 10, padding: 2, gap: 2 }}>
      {options.map(o => {
        const active = o.value === value;
        return <button key={o.value} onClick={() => onChange(o.value)} className="press"
          style={{ flex: 1, minWidth: 0, padding: '7px 6px', borderRadius: 8, fontSize: 14, fontWeight: 600,
            color: active ? 'var(--label)' : 'var(--label-2)', background: active ? 'var(--surface)' : 'transparent',
            boxShadow: active ? '0 1px 3px rgba(0,0,0,0.14)' : 'none', whiteSpace: 'nowrap',
            transition: 'background var(--dur), color var(--dur)' }}>{o.label}</button>;
      })}
    </div>
  );
}

function Sheet({ title, onClose, children, maxWidth = 480 }) {
  useEffect(() => {
    const k = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} className="fade"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex',
        alignItems: 'flex-end', justifyContent: 'center', zIndex: 500 }}>
      <div style={{ background: 'var(--bg)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth,
        maxHeight: '92vh', overflowY: 'auto', boxShadow: 'var(--shadow-2)',
        padding: '10px 18px calc(env(safe-area-inset-bottom, 0px) + 24px)',
        animation: 'slideUp var(--dur-slow) var(--ease)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 10 }}>
          <div style={{ width: 38, height: 5, borderRadius: 99, background: 'var(--label-4)' }}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <h2 className="t-title3" style={{ flex: 1, minWidth: 0 }}>{title}</h2>
          <button onClick={onClose} aria-label="Close" className="press"
            style={{ width: 30, height: 30, borderRadius: 99, background: 'var(--fill)', color: 'var(--label-2)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="x" size={16}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Toast({ message, tone = 'ok' }) {
  const bg = tone === 'error' ? 'var(--danger)' : 'var(--label)';
  const fg = tone === 'error' ? '#fff' : 'var(--bg)';
  return <div role="status" aria-live="polite" className="rise"
    style={{ position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 94px)', left: '50%',
      transform: 'translateX(-50%)', background: bg, color: fg, padding: '11px 18px', borderRadius: 999,
      fontSize: 14, fontWeight: 600, boxShadow: 'var(--shadow-2)', zIndex: 2000, pointerEvents: 'none',
      maxWidth: 'calc(100% - 40px)', textAlign: 'center' }}>{message}</div>;
}

function ThemeToggle({ dark, onToggle }) {
  return <button onClick={onToggle} aria-label="Toggle theme" className="press"
    style={{ width: 38, height: 38, borderRadius: 999, background: 'var(--fill)', color: 'var(--label-2)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    <Icon name={dark ? 'sun' : 'moon'} size={18}/>
  </button>;
}

function Brand({ size = 66, icon = 'sun' }) {
  return <div style={{ width: size, height: size, borderRadius: size * 0.28, background: 'var(--accent-grad)',
    boxShadow: 'var(--shadow-accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
    <Icon name={icon} size={size * 0.5} strokeWidth={2.2}/>
  </div>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
function AuthScreen({ onLogin, dark, onToggleDark }) {
  const [sheet, setSheet] = useState(null); // 'login' | 'signup' | 'forgot'
  const [pkErr, setPkErr] = useState('');
  const [pkLoading, setPkLoad] = useState(false);

  async function signInWithPasskey() {
    if (!window.PublicKeyCredential) { setPkErr('Passkeys are not supported on this browser.'); return; }
    setPkLoad(true); setPkErr('');
    try {
      const options = await api.getPasskeyLoginChallenge();
      const authResp = await startAuthentication({ optionsJSON: options });
      await api.loginPasskey(authResp);
      onLogin();
    } catch (e) {
      if (e.name === 'NotAllowedError' || e.name === 'AbortError') setPkErr('Passkey sign-in was cancelled.');
      else setPkErr(e.message || 'Passkey sign-in failed.');
    } finally { setPkLoad(false); }
  }

  const titles = { login: 'Welcome back', signup: 'Create account', forgot: 'Reset password' };

  return (
    <div style={{ minHeight: '100dvh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg, #1A1430 0%, #281629 46%, #3A2016 100%)' }}>
      {/* sunset glow */}
      <div aria-hidden style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 540, height: 540, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(255,122,61,0.55), rgba(255,178,77,0.16) 42%, transparent 68%)' }}/>
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(180deg, transparent 48%, rgba(18,11,20,0.88) 100%)' }}/>

      <button onClick={onToggleDark} aria-label="Toggle theme" className="press"
        style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 14px)', right: 18, zIndex: 3,
          width: 38, height: 38, borderRadius: 999, background: 'rgba(255,255,255,0.14)',
          border: '1px solid rgba(255,255,255,0.25)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={dark ? 'sun' : 'moon'} size={18}/>
      </button>

      {/* brand */}
      <div style={{ flex: 1, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
        <div style={{ width: 60, height: 60, borderRadius: 18, background: 'var(--accent-grad)', boxShadow: '0 10px 28px rgba(255,106,61,0.45)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
          <Icon name="sun" size={30} style={{ color: '#fff' }}/>
        </div>
        <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: '0.16em', color: '#fff', textIndent: '0.16em', lineHeight: 1 }}>SALAM</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 14 }}>
          <span style={{ width: 20, height: 2, background: 'var(--accent)', borderRadius: 2 }}/>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2.5px', color: 'var(--accent)' }}>PERSONAL LEAVE TRACKER</span>
          <span style={{ width: 20, height: 2, background: 'var(--accent)', borderRadius: 2 }}/>
        </div>
      </div>

      {/* bottom auth */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 460, margin: '0 auto',
        padding: '0 24px calc(env(safe-area-inset-bottom, 0px) + 28px)', display: 'flex', flexDirection: 'column', gap: 11 }}>
        <Btn full leading="mail" onClick={() => setSheet('login')}>Continue with email</Btn>
        {window.PublicKeyCredential && (
          <button onClick={signInWithPasskey} className="press"
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', minHeight: 52,
              borderRadius: 'var(--r-control)', background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)',
              color: '#fff', fontSize: 17, fontWeight: 600 }}>
            {pkLoading ? <Spin size={19} color="#fff"/> : <><Icon name="fingerprint" size={19}/>Continue with passkey</>}
          </button>
        )}
        <button onClick={() => setSheet('signup')} className="press"
          style={{ background: 'none', border: 0, color: 'var(--accent)', fontSize: 15, fontWeight: 600, padding: 8, minHeight: 44 }}>Create account</button>
        {pkErr && <p style={{ color: '#FF9A7E', fontSize: 13, textAlign: 'center', margin: 0 }}>{pkErr}</p>}
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, textAlign: 'center', margin: '2px 0 0' }}>By continuing you agree to the Terms &amp; Privacy Policy.</p>
      </div>

      {sheet && (
        <Sheet title={titles[sheet]} onClose={() => setSheet(null)}>
          {sheet === 'login'  && <LoginForm  onLogin={onLogin} onSwitch={setSheet}/>}
          {sheet === 'signup' && <SignupForm onLogin={onLogin} onSwitch={setSheet}/>}
          {sheet === 'forgot' && <ForgotForm onSwitch={setSheet}/>}
        </Sheet>
      )}
    </div>
  );
}

function LinkBtn({ children, onClick }) {
  return <button type="button" onClick={onClick} style={{ background: 'none', border: 0, color: 'var(--tint)', fontWeight: 600, fontSize: 15, padding: 2 }}>{children}</button>;
}

function LoginForm({ onLogin, onSwitch }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e?.preventDefault?.();
    if (!email.trim() || !pw) { setErr('Email and password are required.'); return; }
    setLoading(true); setErr('');
    try { await api.login(email.trim(), pw); onLogin(); }
    catch { setErr('Invalid email or password.'); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="you@email.com" autoComplete="email" autoFocus/>
      <PasswordInput value={pw} onChange={e => setPw(e.target.value)} placeholder="Your password"
        autoComplete="current-password" error={err}/>
      <Btn full type="submit" loading={loading}>Sign in</Btn>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <LinkBtn onClick={() => onSwitch('forgot')}>Forgot password?</LinkBtn>
        <span className="t-subhead">New here? <LinkBtn onClick={() => onSwitch('signup')}>Create account</LinkBtn></span>
      </div>
    </form>
  );
}

function SignupForm({ onLogin, onSwitch }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoad] = useState(false);

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
      <Input label="Name (optional)" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoComplete="name"/>
      <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email"/>
      <PasswordInput value={pw} onChange={e => setPw(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password"/>
      <PasswordInput label="Confirm password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Repeat password" autoComplete="new-password" error={err}/>
      <Btn full type="submit" loading={loading}>Create account</Btn>
      <p className="t-subhead" style={{ textAlign: 'center', marginTop: 4 }}>
        Already have an account? <LinkBtn onClick={() => onSwitch('login')}>Sign in</LinkBtn>
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
      {sent ? (
        <Card pad={16} style={{ background: 'var(--accent-soft)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--surface)', color: 'var(--tint)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="check" size={17}/></span>
            <div>
              <p className="t-headline">Check your email.</p>
              <p className="t-footnote" style={{ marginTop: 3 }}>If an account exists for <strong style={{ color: 'var(--label)' }}>{email}</strong>, a reset link is on its way.</p>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email"/>
          <Btn full type="submit" loading={loading}>Send reset link</Btn>
        </>
      )}
      <p className="t-subhead" style={{ textAlign: 'center', marginTop: 4 }}>
        <LinkBtn onClick={() => onSwitch('login')}>← Back to sign in</LinkBtn>
      </p>
    </form>
  );
}

// ─── Onboarding ──────────────────────────────────────────────────────────────
function Onboarding({ onDone }) {
  const [date, setDate] = useState('');
  const [saving, setSave] = useState(false);
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)', display: 'flex', flexDirection: 'column',
      maxWidth: 420, margin: '0 auto', width: '100%',
      padding: 'calc(env(safe-area-inset-top, 0px) + 40px) 22px calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
      <div style={{ flex: 1 }}>
        <Brand icon="rotate-ccw"/>
        <h1 className="t-large" style={{ marginTop: 22 }}>When does your contract renew?</h1>
        <p className="t-body" style={{ marginTop: 10, color: 'var(--label-2)' }}>
          Your balances reset to full on this date, every year.
        </p>
        <div style={{ marginTop: 26 }}>
          <Input label="Renewal date" type="date" value={date} onChange={e => setDate(e.target.value)}/>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Btn full trailing="arrow-right" loading={saving}
          onClick={async () => { setSave(true); await onDone(date); setSave(false); }}>Continue</Btn>
        <Btn full variant="plain" onClick={() => onDone('')}>Skip for now</Btn>
      </div>
    </div>
  );
}

// ─── Home ────────────────────────────────────────────────────────────────────
function BalanceCard({ type }) {
  const remaining = Math.max(0, type.total - type.used);
  const pct = type.total ? type.used / type.total : 0;
  const tone = remaining === 0 ? 'danger' : pct > 0.7 ? 'warn' : 'ok';
  const color = tone === 'danger' ? 'var(--danger)' : tone === 'warn' ? 'var(--warn)' : 'var(--accent)';
  const numColor = tone === 'ok' ? 'var(--label)' : color;
  const pill = remaining === 0
    ? <Pill tone="danger">Used up</Pill>
    : tone === 'warn' ? <Pill tone="warn">Running low</Pill>
    : <Pill tone="neutral">{type.used} used</Pill>;
  return (
    <Card pad={18}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div className="t-subhead" style={{ fontWeight: 500, color: 'var(--label-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{type.name}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 5 }}>
            <span className="rounded" style={{ fontSize: 46, fontWeight: 800, lineHeight: 0.95, letterSpacing: '-0.03em', color: numColor }}>{remaining}</span>
            <span className="t-subhead num">/ {type.total} days</span>
          </div>
        </div>
        {pill}
      </div>
      <div style={{ marginTop: 14 }}><Progress pct={pct * 100} color={color}/></div>
    </Card>
  );
}

function HomeScreen({ leaveTypes, settings, history, onApply, justReset, onDismissReset }) {
  const renewal = daysTo(settings.contractRenewal);
  const urgent = renewal !== null && renewal <= 30;
  const renewalLabel = renewal === null ? '' : renewal > 0 ? `${renewal}d away` : renewal === 0 ? 'Today' : `${Math.abs(renewal)}d overdue`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {justReset && (
        <Card pad={14} style={{ background: 'var(--ok-soft)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface)', color: 'var(--ok)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="sparkles" size={16}/></span>
            <div style={{ flex: 1 }}>
              <p className="t-headline" style={{ color: 'var(--label)' }}>Balances reset for your new contract year.</p>
              {settings.contractRenewal && <p className="t-footnote" style={{ marginTop: 2 }}>Next reset: {fmt(settings.contractRenewal)}.</p>}
            </div>
            <button onClick={onDismissReset} aria-label="Dismiss" style={{ background: 'transparent', border: 0, color: 'var(--label-3)', padding: 2, alignSelf: 'flex-start' }}><Icon name="x" size={16}/></button>
          </div>
        </Card>
      )}

      {leaveTypes.length > 0 && (
        <div>
          <div className="t-section" style={{ padding: '0 4px 9px' }}>Balances</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {leaveTypes.map(t => <BalanceCard key={t.id} type={t}/>)}
          </div>
        </div>
      )}

      <Btn full leading="calendar-plus" onClick={onApply}>Request leave</Btn>

      {settings.contractRenewal ? (
        <Group header="Auto-reset">
          <Row icon="rotate-ccw" iconBg="var(--fill)" iconColor="var(--label-2)" title="Next reset" subtitle={fmt(settings.contractRenewal)}
            trailing={<span className="t-subhead num" style={{ color: urgent ? 'var(--warn)' : 'var(--label-2)', fontWeight: urgent ? 600 : 400 }}>{renewalLabel}</span>}/>
        </Group>
      ) : (
        <Card pad={14}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <Icon name="info" size={18} style={{ color: 'var(--label-3)', flexShrink: 0 }}/>
            <p className="t-footnote">Set a renewal date in <strong style={{ color: 'var(--label)' }}>Settings → Contract</strong> to enable auto-reset.</p>
          </div>
        </Card>
      )}

      {history.length > 0 && (
        <Group header="Recent">
          {history.slice(0, 3).map(h => <HistoryRow key={h.id} item={h}/>)}
        </Group>
      )}
    </div>
  );
}

function HistoryRow({ item, onCancel, busy, onOpen }) {
  const name = item.typeName || item.type_name;
  const sd = item.startDate || item.start_date;
  const ed = item.endDate || item.end_date;
  const reason = cleanReason(item.reason);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px' }}>
      <div onClick={onOpen} className={onOpen ? 'press' : undefined}
        style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, cursor: onOpen ? 'pointer' : undefined }}>
        <span style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--accent-soft)', color: 'var(--tint)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="calendar" size={17}/>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="t-body" style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
            <Pill tone="neutral">{item.days}d</Pill>
          </div>
          <div className="t-footnote" style={{ marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {fmtShort(sd)}{sd !== ed ? ` → ${fmtShort(ed)}` : ''}{reason ? ` · ${reason}` : ''}
          </div>
        </div>
      </div>
      {onOpen && <Icon name="chevron-right" size={18} style={{ color: 'var(--label-4)', flexShrink: 0 }}/>}
      {onCancel && (
        <button onClick={() => onCancel(item.id)} disabled={busy} aria-label="Cancel leave" className="press"
          style={{ color: 'var(--danger)', padding: 6, opacity: busy ? 0.4 : 1, display: 'inline-flex', flexShrink: 0 }}>
          {busy ? <Spin size={16} color="var(--danger)"/> : <Icon name="trash-2" size={18}/>}
        </button>
      )}
    </div>
  );
}

function LeaveDetailSheet({ item, onClose, onCancel, toast }) {
  const name = item.typeName || item.type_name;
  const sd = item.startDate || item.start_date;
  const ed = item.endDate || item.end_date;
  const reason = cleanReason(item.reason);
  const urgent = urgentTaskOf(item.reason);
  const dates = sd === ed ? fmt(sd) : `${fmt(sd)} → ${fmt(ed)}`;
  const [links, setLinks] = useState(null);
  const [loadingV, setLoadingV] = useState(false);
  const [copied, setCopied] = useState(false);

  async function notify() {
    setLoadingV(true);
    try {
      const { links: vl } = await api.getViberLinks(item.id);
      setLinks(vl);
      if (vl[0]) await copyText(vl[0].messagePreview);
    } catch (e) { toast(e.message, 'error'); }
    finally { setLoadingV(false); }
  }
  async function openViber(lk) { await copyText(lk.messagePreview); window.location.href = lk.viberUrl; }

  const Detail = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '11px 16px' }}>
      <span className="t-body" style={{ color: 'var(--label-2)' }}>{label}</span>
      <span className="t-body" style={{ fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );

  return (
    <Sheet title="Leave details" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Group>
          <Detail label="Type" value={name}/>
          <Detail label="Duration" value={`${item.days} working day${item.days > 1 ? 's' : ''}`}/>
          <Detail label="Dates" value={dates}/>
        </Group>
        {(reason || urgent) && (
          <Card pad={14} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {reason && <div><div className="t-caption">Reason</div><div className="t-body" style={{ marginTop: 2 }}>{reason}</div></div>}
            {urgent && <div><div className="t-caption">Urgent task / handover</div><div className="t-body" style={{ marginTop: 2 }}>{urgent}</div></div>}
          </Card>
        )}

        {links === null
          ? <Btn variant="viber" full leading="message-circle" loading={loadingV} onClick={notify}>Notify via Viber</Btn>
          : links.length === 0
            ? <Card pad={14}><p className="t-footnote">No Viber recipients. Add them in Settings → Viber.</p></Card>
            : <Group header="Open in Viber">
                {links.map(lk => (
                  <Row key={lk.id} onClick={() => openViber(lk)} icon="message-circle" iconBg="var(--viber-soft)" iconColor="var(--viber)"
                    title={lk.recipientName} titleWeight={600} subtitle={lk.phone}
                    trailing={<span style={{ color: 'var(--tint)', display: 'inline-flex' }}><Icon name="arrow-right" size={18}/></span>}/>
                ))}
              </Group>}
        {links && links.length > 0 && (
          <button onClick={async () => { const ok = await copyText(links[0].messagePreview); setCopied(ok); toast(ok ? 'Message copied.' : 'Copy failed.', ok ? 'ok' : 'error'); }}
            className="press" style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--fill)', borderRadius: 8, padding: '6px 12px', color: copied ? 'var(--ok)' : 'var(--tint)', fontSize: 13, fontWeight: 600 }}>
            <Icon name={copied ? 'check' : 'copy'} size={14}/>{copied ? 'Copied' : 'Copy message'}
          </button>
        )}

        <Btn variant="danger" full leading="trash-2" onClick={() => onCancel(item.id)}>Cancel this leave</Btn>
      </div>
    </Sheet>
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
    if (ok) { setCopied(true); toast?.('Message copied.'); setTimeout(() => setCopied(false), 1600); }
    else toast?.('Copy failed. Long-press the message to select it.', 'error');
  }
  async function openViber(lk) { await copyText(message); window.location.href = lk.viberUrl; }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--ok-soft)', color: 'var(--ok)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="check" size={20} strokeWidth={2.4}/></span>
        <div style={{ minWidth: 0 }}>
          <h2 className="t-title3">Leave submitted</h2>
          <div className="t-footnote" style={{ marginTop: 1 }}>{typeName} · {entry.days} day{entry.days > 1 ? 's' : ''} · {fmtShort(sd)}{sd !== ed ? ` → ${fmtShort(ed)}` : ''}</div>
        </div>
      </div>

      {links.length > 0 ? (
        <>
          <Card pad={14} style={{ background: 'var(--fill-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div className="t-section">Message preview</div>
              <button onClick={handleCopy} aria-label="Copy" className="press" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--surface)', borderRadius: 8, padding: '5px 10px', color: copied ? 'var(--ok)' : 'var(--tint)', fontSize: 12, fontWeight: 600, boxShadow: 'var(--shadow-1)' }}>
                <Icon name={copied ? 'check' : 'copy'} size={13}/>{copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--label-2)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{message}</p>
          </Card>
          <p className="t-footnote" style={{ marginTop: -8 }}>Copied to your clipboard — paste it if Viber doesn't pre-fill.</p>
          <Group header="Notify via Viber">
            {links.map(lk => (
              <Row key={lk.id} onClick={() => openViber(lk)} icon="message-circle" iconBg="var(--viber-soft)" iconColor="var(--viber)"
                title={lk.recipientName} titleWeight={600} subtitle={lk.phone}
                trailing={<span style={{ color: 'var(--tint)', display: 'inline-flex' }}><Icon name="arrow-right" size={18}/></span>}/>
            ))}
          </Group>
        </>
      ) : (
        <Card pad={14}>
          <p className="t-footnote">No Viber recipients yet. Add them in <strong style={{ color: 'var(--label)' }}>Settings → Viber</strong>.</p>
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
      if (recipients.length > 0) { const { links: vl } = await api.getViberLinks(newEntry.id); setLinks(vl); }
      else setLinks([]);
    } catch (err) { toast(err.message, 'error'); }
    finally { setSubmitting(false); }
  }

  if (leaveTypes.length === 0) return (
    <Card pad={18}><p className="t-footnote" style={{ textAlign: 'center', lineHeight: 1.6 }}>No leave types yet. Add one in <strong style={{ color: 'var(--label)' }}>Settings → Leaves</strong>.</p></Card>
  );

  if (entry && links !== null) return <ApplySuccess entry={entry} links={links} onClose={onSuccess} toast={toast}/>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Select label="Leave type" value={typeId} onChange={e => setTypeId(e.target.value)}>
        {leaveTypes.map(l => (
          <option key={l.id} value={l.id}>{l.name} — {Math.max(0, l.total - l.used)} left</option>
        ))}
      </Select>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Input label="Start" type="date" value={start} min={t0}
          onChange={e => { setStart(e.target.value); if (e.target.value > end) setEnd(e.target.value); }}/>
        <Input label="End" type="date" value={end} min={start} onChange={e => setEnd(e.target.value)}/>
      </div>
      {days > 0 && (
        <Card pad={14} style={{ background: over ? 'var(--danger-soft)' : 'var(--accent-soft)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <span className="t-headline" style={{ color: over ? 'var(--danger)' : 'var(--tint)' }}>{days} working day{days > 1 ? 's' : ''}</span>
            {over && <span className="t-footnote" style={{ color: 'var(--danger)' }}>Only {remain} left</span>}
          </div>
        </Card>
      )}
      <Input label="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} placeholder="Family trip, medical…"/>
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
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
  const [detail, setDetail] = useState(null);

  async function cancel(id) {
    setBusy(id);
    try { await api.cancelLeave(id); toast('Leave cancelled. Balance restored.'); onRefresh(); }
    catch (err) { toast(err.message, 'error'); }
    finally { setBusy(null); }
  }

  const filtered = filter === 'all' ? history : history.filter(h => (h.leaveTypeId || h.leave_type_id) === filter);

  if (history.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '70px 20px', textAlign: 'center' }}>
      <span style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--fill)', color: 'var(--label-3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="clock" size={30}/></span>
      <div>
        <p className="t-headline">No leave history yet</p>
        <p className="t-footnote" style={{ marginTop: 4 }}>Request your first leave to see it here.</p>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card pad={16}>
        <div className="t-section" style={{ marginBottom: 12 }}>This period</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {leaveTypes.map(lt => {
            const pct = lt.total > 0 ? Math.min(100, (lt.used / lt.total) * 100) : 0;
            return (
              <div key={lt.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className="t-subhead" style={{ color: 'var(--label)' }}>{lt.name}</span>
                  <span className="t-subhead num" style={{ color: 'var(--label-2)' }}>{lt.used} / {lt.total}d</span>
                </div>
                <Progress pct={pct} h={6}/>
              </div>
            );
          })}
        </div>
      </Card>

      {leaveTypes.length > 1 && (
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 2, margin: '0 -2px' }}>
          {[{ id: 'all', name: 'All' }, ...leaveTypes].map(opt => {
            const active = filter === opt.id;
            return (
              <button key={opt.id} onClick={() => setFilter(opt.id)} className="press"
                style={{ padding: '7px 14px', borderRadius: 999, border: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                  fontSize: 14, fontWeight: 600,
                  background: active ? 'var(--accent)' : 'var(--fill)', color: active ? '#fff' : 'var(--label-2)' }}>{opt.name}</button>
            );
          })}
        </div>
      )}

      {filtered.length === 0
        ? <p className="t-footnote" style={{ textAlign: 'center', padding: '16px 0' }}>No entries for this filter.</p>
        : <Group footer="Tap a leave for full details. Or cancel to restore its balance.">
            {filtered.map(h => <HistoryRow key={h.id} item={h} onCancel={cancel} busy={busy === h.id} onOpen={() => setDetail(h)}/>)}
          </Group>}

      {detail && (
        <LeaveDetailSheet item={detail} toast={toast}
          onClose={() => setDetail(null)}
          onCancel={(id) => { setDetail(null); cancel(id); }}/>
      )}
    </div>
  );
}

// ─── Settings ────────────────────────────────────────────────────────────────
function SettingsScreen({ leaveTypes, recipients, settings, onRefresh, onLogout, toast }) {
  const [tab, setTab] = useState('leaves');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <Segmented value={tab} onChange={setTab} options={[
        { value: 'leaves', label: 'Leaves' }, { value: 'viber', label: 'Viber' },
        { value: 'contract', label: 'Contract' }, { value: 'account', label: 'Account' },
      ]}/>
      {tab === 'leaves' && <LeaveTypesTab leaveTypes={leaveTypes} onRefresh={onRefresh} toast={toast}/>}
      {tab === 'viber' && <RecipientsTab recipients={recipients} onRefresh={onRefresh} toast={toast}/>}
      {tab === 'contract' && <ContractTab settings={settings} onRefresh={onRefresh} toast={toast}/>}
      {tab === 'account' && <AccountTab onLogout={onLogout} toast={toast}/>}
    </div>
  );
}

function LeaveTypesTab({ leaveTypes, onRefresh, toast }) {
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save(vals) {
    setBusy(true);
    try {
      if (editing.id) { await api.updateLeaveType(editing.id, { name: vals.name, total: Number(vals.total), used: Number(vals.used), color: editing.color || '#FF6A3D' }); toast('Leave type updated.'); }
      else { await api.addLeaveType({ name: vals.name, total: Number(vals.total), color: '#FF6A3D' }); toast('Leave type added.'); }
      setEditing(null); onRefresh();
    } catch (err) { toast(err.message, 'error'); }
    finally { setBusy(false); }
  }
  async function remove(id) {
    try { await api.deleteLeaveType(id); toast('Leave type deleted.'); onRefresh(); }
    catch (err) { toast(err.message, 'error'); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {leaveTypes.length > 0 ? (
        <Group footer="Deleting a type keeps its past history entries.">
          {leaveTypes.map(lt => (
            <Row key={lt.id} title={lt.name} titleWeight={600}
              subtitle={`${lt.used} used · ${Math.max(0, lt.total - lt.used)} left · ${lt.total} total`}
              trailing={
                <span style={{ display: 'inline-flex', gap: 4 }}>
                  <button className="press" onClick={() => setEditing({ id: lt.id, name: lt.name, total: lt.total, used: lt.used, color: lt.color })} aria-label="Edit" style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--fill)', color: 'var(--label-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="pencil" size={15}/></button>
                  <button className="press" onClick={() => setConfirm({ msg: `Delete "${lt.name}"? Past history stays.`, confirmLabel: 'Delete', danger: true, onConfirm: () => remove(lt.id) })} aria-label="Delete" style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--fill)', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="trash-2" size={15}/></button>
                </span>
              }/>
          ))}
        </Group>
      ) : (
        <Card pad={18}><p className="t-footnote" style={{ textAlign: 'center' }}>No leave types yet.</p></Card>
      )}
      <Btn variant="tinted" full leading="plus" onClick={() => setEditing({ name: '', total: 10 })}>Add leave type</Btn>
      {editing && <LeaveTypeSheet initial={editing} onClose={() => setEditing(null)} onSave={save} busy={busy}/>}
      {confirm && <ConfirmSheet {...confirm} onClose={() => setConfirm(null)}/>}
    </div>
  );
}

function LeaveTypeSheet({ initial, onClose, onSave, busy }) {
  const [name, setName] = useState(initial.name || '');
  const [total, setTotal] = useState(initial.total ?? 10);
  const [used, setUsed] = useState(initial.used ?? 0);
  const canSave = name.trim().length > 0 && Number(total) > 0 && Number(used) >= 0;
  return (
    <Sheet title={initial.id ? 'Edit leave type' : 'Add leave type'} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Input label="Name" placeholder="e.g. Annual, Sick…" value={name} onChange={e => setName(e.target.value)} autoFocus/>
        <Input label="Total days per year" type="number" min="1" value={total} onChange={e => setTotal(e.target.value)}/>
        {initial.id && (
          <Input label="Days used" type="number" min="0" value={used} onChange={e => setUsed(e.target.value)}
            hint="Adjust to correct your balance — e.g. when setting up, or after a manual change."/>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <Btn variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
          <Btn onClick={() => onSave({ name: name.trim(), total, used })} disabled={!canSave} loading={busy} style={{ flex: 2 }}>{initial.id ? 'Save' : 'Add'}</Btn>
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
    try { await api.addRecipient(vals); toast('Contact added.'); setEditing(null); onRefresh(); }
    catch (err) { toast(err.message, 'error'); }
    finally { setBusy(false); }
  }
  async function remove(id) {
    try { await api.deleteRecipient(id); toast('Contact removed.'); onRefresh(); }
    catch (err) { toast(err.message, 'error'); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <Card pad={14} style={{ background: 'var(--viber-soft)' }}>
        <p className="t-footnote" style={{ color: 'var(--viber)' }}>After you apply, the app opens Viber with a pre-filled message — one tap to send.</p>
      </Card>
      {recipients.length > 0 && (
        <Group>
          {recipients.map(c => (
            <Row key={c.id} icon="user" iconBg="var(--viber-soft)" iconColor="var(--viber)" title={c.name} titleWeight={600} subtitle={c.phone}
              trailing={<button className="press" onClick={() => setConfirm({ msg: `Remove ${c.name}?`, confirmLabel: 'Remove', danger: true, onConfirm: () => remove(c.id) })} aria-label="Remove" style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--fill)', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="trash-2" size={15}/></button>}/>
          ))}
        </Group>
      )}
      {recipients.length === 0 && <Card pad={18}><p className="t-footnote" style={{ textAlign: 'center' }}>No contacts yet. Add your manager or HR.</p></Card>}
      <Btn variant="tinted" full leading="plus" onClick={() => setEditing({ name: '', phone: '' })}>Add contact</Btn>
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
        <Input label="Name" placeholder="e.g. Zaha (manager)" value={name} onChange={e => setName(e.target.value)} autoFocus/>
        <Input label="Viber phone number" placeholder="+960 …" value={phone} onChange={e => setPhone(e.target.value)}
          hint="Include the country code for the Viber deep-link."/>
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <Btn variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
          <Btn onClick={() => onSave({ name: name.trim(), phone: phone.trim() })} disabled={!canSave} loading={busy} style={{ flex: 2 }}>{initial.id ? 'Save' : 'Add'}</Btn>
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
      <Card pad={14} style={{ background: 'var(--accent-soft)' }}>
        <p className="t-footnote" style={{ color: 'var(--tint)' }}>On the renewal date, all balances reset to full and the date advances by one year.</p>
      </Card>
      <Input label="Next renewal date" type="date" value={date} onChange={e => setDate(e.target.value)}/>
      {date && days !== null && (
        <Card pad={13} style={{ background: days <= 30 ? 'var(--warn-soft)' : 'var(--fill-2)' }}>
          <p className="t-subhead" style={{ fontWeight: 600, color: days <= 30 ? 'var(--warn)' : 'var(--label-2)' }}>
            {days > 0 ? `${days} days until reset` : days === 0 ? 'Resets today.' : `${Math.abs(days)} days overdue`}
          </p>
        </Card>
      )}
      {settings.lastResetDate && (
        <Group>
          <Row icon="rotate-ccw" iconBg="var(--fill)" iconColor="var(--label-2)" title="Last reset" value={fmt(settings.lastResetDate)}/>
        </Group>
      )}
      <Btn full onClick={save} disabled={saved || saving} loading={saving}>{saved ? 'Saved' : 'Save'}</Btn>
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
      const options = await api.getPasskeyRegisterChallenge();
      const attResp = await startRegistration({ optionsJSON: options });
      await api.registerPasskey(attResp);
      toast('Passkey registered.'); setPkStatus(true);
    } catch (e) {
      if (e.name === 'NotAllowedError' || e.name === 'AbortError') toast('Passkey registration cancelled.', 'error');
      else toast(e.message || 'Failed to register passkey.', 'error');
    } finally { setPkLoad(false); }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {window.PublicKeyCredential && (
        <Group header="Passkey" footer={pkStatus ? 'You can sign in with Face ID or your fingerprint.' : 'Register your fingerprint or Face ID to skip the password next time.'}>
          <Row icon="fingerprint" iconBg="var(--accent-soft)" iconColor="var(--tint)" title="Biometric sign-in"
            trailing={
              pkStatus === null ? <Spin size={16} color="var(--label-3)"/>
              : pkStatus ? <Pill tone="ok">Active</Pill>
              : <Btn size="sm" variant="tinted" loading={pkLoad} onClick={registerPasskey}>Set up</Btn>
            }/>
        </Group>
      )}
      <Group footer="Sessions last 30 days on this device.">
        <Row icon="log-out" iconBg="var(--danger-soft)" iconColor="var(--danger)" title="Sign out" danger
          onClick={() => setConfirm({ msg: 'Sign out? You can sign back in any time.', confirmLabel: 'Sign out', danger: true, onConfirm: handleLogout })}
          trailing={logoutLoad ? <Spin size={16} color="var(--danger)"/> : null}/>
      </Group>
      {confirm && <ConfirmSheet {...confirm} onClose={() => setConfirm(null)}/>}
    </div>
  );
}

function ConfirmSheet({ msg, confirmLabel = 'Confirm', danger, onConfirm, onClose }) {
  return (
    <Sheet title="Confirm" onClose={onClose}>
      <p className="t-body" style={{ margin: '0 0 18px', color: 'var(--label-2)', lineHeight: 1.5 }}>{msg}</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn variant="secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</Btn>
        <Btn variant={danger ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose(); }} style={{ flex: 2 }}>{confirmLabel}</Btn>
      </div>
    </Sheet>
  );
}

// ─── Root App ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'apply', label: 'Apply', icon: 'calendar-plus' },
  { id: 'history', label: 'History', icon: 'clock' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: 'var(--bg)' }}><Spinner/></div>
  );

  if (!authed) return <AuthScreen onLogin={onLogin} dark={dark} onToggleDark={toggleDark}/>;

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: 'var(--bg)', padding: 32, textAlign: 'center', gap: 14 }}>
      <span style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--danger-soft)', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="info" size={26}/></span>
      <h2 className="t-title3">Can't reach the server</h2>
      <p className="t-footnote" style={{ maxWidth: 300 }}>Check your connection and try again.</p>
      <Btn onClick={() => { setLoading(true); loadAll().finally(() => setLoading(false)); }}>Retry</Btn>
    </div>
  );

  if (settings.onboarded !== 'true') return <Onboarding onDone={completeOnboarding}/>;

  const titles = { home: 'Today', apply: 'Apply', history: 'History', settings: 'Settings' };
  const eyebrows = {
    home: new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }),
    apply: 'Request leave', history: 'Past leave', settings: 'Preferences',
  };

  return (
    <>
      {toast && <Toast key={toast.key} message={toast.msg} tone={toast.tone}/>}

      <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
        <div className="app-col">
          {/* Large-title header */}
          <header style={{ position: 'sticky', top: 0, zIndex: 100,
            padding: 'calc(env(safe-area-inset-top, 0px) + 12px) 20px 12px',
            background: 'var(--bar)', backdropFilter: 'var(--blur)', WebkitBackdropFilter: 'var(--blur)',
            borderBottom: '1px solid var(--separator)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="t-footnote" style={{ fontWeight: 600, color: 'var(--label-3)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{eyebrows[tab]}</div>
              <h1 className="t-large">{titles[tab]}</h1>
            </div>
            <ThemeToggle dark={dark} onToggle={toggleDark}/>
          </header>

          {/* Content */}
          <main key={tab} className="fade" style={{ padding: '18px 16px calc(env(safe-area-inset-bottom, 0px) + 104px)' }}>
            {tab === 'home' && <HomeScreen leaveTypes={leaveTypes} settings={settings} history={history}
              onApply={() => setApplyOpen(true)} justReset={justReset} onDismissReset={() => setJustReset(false)}/>}
            {tab === 'history' && <HistoryScreen leaveTypes={leaveTypes} history={history} onRefresh={loadAll} toast={showToast}/>}
            {tab === 'settings' && <SettingsScreen leaveTypes={leaveTypes} recipients={recipients} settings={settings} onRefresh={loadAll} onLogout={onLogout} toast={showToast}/>}
          </main>

          {/* Tab bar */}
          <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 480, zIndex: 200, display: 'flex',
            padding: '9px 10px calc(env(safe-area-inset-bottom, 0px) + 9px)',
            background: 'var(--bar)', backdropFilter: 'var(--blur)', WebkitBackdropFilter: 'var(--blur)',
            borderTop: '1px solid var(--separator)' }}>
            {TABS.map(it => {
              const active = tab === it.id && !(it.id === 'apply');
              return (
                <button key={it.id} aria-label={it.label} className="press"
                  onClick={() => { if (it.id === 'apply') setApplyOpen(true); else setTab(it.id); }}
                  style={{ flex: 1, border: 0, background: 'transparent', padding: '5px 4px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    color: active ? 'var(--tint)' : 'var(--label-3)', fontSize: 10.5, fontWeight: 600 }}>
                  <Icon name={it.icon} size={24} strokeWidth={active ? 2.2 : 1.9}/>
                  {it.label}
                </button>
              );
            })}
          </nav>
        </div>

        {applyOpen && (
          <Sheet title="Request leave" onClose={() => setApplyOpen(false)}>
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
