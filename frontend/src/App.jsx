// src/App.jsx — full UI redesign: dark mode, animations, glassmorphism
import { useState, useEffect, useRef } from 'react';
import * as api from './api.js';

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

// ─── WebAuthn helpers ─────────────────────────────────────────────────────────
const b64urlToUint8 = s => {
  const b64 = s.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(s.length/4)*4,'=');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
};
const uint8ToB64url = u =>
  btoa(String.fromCharCode(...new Uint8Array(u))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');

// ─── Theme ────────────────────────────────────────────────────────────────────
const LIGHT = {
  bg:         '#F0F0F5',
  surface:    '#FFFFFF',
  surfaceHigh:'#FFFFFF',
  glass:      'rgba(255,255,255,0.75)',
  glassBorder:'rgba(255,255,255,0.6)',
  border:     '#E5E4F0',
  text:       '#0D0D1A',
  textSub:    '#555570',
  muted:      '#9898B0',
  faint:      '#F5F5FA',
  accent:     '#6C47FF',
  accentSoft: 'rgba(108,71,255,0.12)',
  accentGrad: 'linear-gradient(135deg,#6C47FF 0%,#A855F7 100%)',
  green:      '#10B981',
  greenSoft:  'rgba(16,185,129,0.12)',
  orange:     '#F59E0B',
  orangeSoft: 'rgba(245,158,11,0.12)',
  red:        '#EF4444',
  redSoft:    'rgba(239,68,68,0.12)',
  viber:      '#7360F2',
  shadow:     '0 4px 24px rgba(108,71,255,0.08), 0 1px 4px rgba(0,0,0,0.04)',
  shadowLg:   '0 20px 60px rgba(108,71,255,0.15), 0 4px 16px rgba(0,0,0,0.06)',
  navBg:      'rgba(255,255,255,0.85)',
};

const DARK = {
  bg:         '#0A0A12',
  surface:    '#13131F',
  surfaceHigh:'#1C1C2E',
  glass:      'rgba(19,19,31,0.85)',
  glassBorder:'rgba(255,255,255,0.08)',
  border:     '#2A2A3D',
  text:       '#F0F0FF',
  textSub:    '#9898C0',
  muted:      '#5A5A7A',
  faint:      '#1A1A2E',
  accent:     '#7C5CFF',
  accentSoft: 'rgba(124,92,255,0.15)',
  accentGrad: 'linear-gradient(135deg,#7C5CFF 0%,#C084FC 100%)',
  green:      '#34D399',
  greenSoft:  'rgba(52,211,153,0.12)',
  orange:     '#FBBF24',
  orangeSoft: 'rgba(251,191,36,0.12)',
  red:        '#F87171',
  redSoft:    'rgba(248,113,113,0.12)',
  viber:      '#9B8BFF',
  shadow:     '0 4px 24px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.2)',
  shadowLg:   '0 20px 60px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)',
  navBg:      'rgba(13,13,22,0.92)',
};

const PALETTE = ['#6C47FF','#10B981','#EF4444','#F59E0B','#7C3AED','#0891B2','#EC4899','#059669','#F97316'];

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = ({ n, size=20, color='currentColor' }) => {
  const p = {
    home:    <><path d="M3 12L12 3l9 9"/><path d="M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9"/></>,
    plus:    <><path d="M12 5v14M5 12h14"/></>,
    apply:   <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M8 14h4M8 18h6"/></>,
    hist:    <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
    cog:     <><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41M21 12h-2M5 12H3M12 21v-2M12 5V3"/></>,
    viber:   <><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a6 6 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M13 3a9 9 0 018 8.5 8.5 8.5 0 01-8.5 8.5C9.89 20 7 18.5 5 16l-3 1 1-3C1.5 12 1 10.11 1 8.5A8.5 8.5 0 019.5 0"/></>,
    trash:   <><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></>,
    edit:    <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    check:   <><path d="M20 6L9 17l-5-5"/></>,
    x:       <><path d="M18 6L6 18M6 6l12 12"/></>,
    cal:     <><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
    user:    <><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></>,
    info:    <><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></>,
    arrow:   <><path d="M5 12h14M12 5l7 7-7 7"/></>,
    refresh: <><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></>,
    lock:    <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>,
    eye:     <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    eyeoff:  <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>,
    sun:     <><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></>,
    moon:    <><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></>,
    sparkle: <><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17z"/></>,
    fingerprint: <><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 17.5a14.5 14.5 0 0 0 4.24 5.2"/><path d="M6 10a6 6 0 0 1 11.73-1"/><path d="M9.52 19.85a19 19 0 0 1 .38-5.05"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {p[n]}
    </svg>
  );
};

// ─── Global CSS injected once ─────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Cal+Sans:wght@600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  html{-webkit-text-size-adjust:100%;}
  body{overscroll-behavior:none;-webkit-font-smoothing:antialiased;}
  input,select,button,textarea{font-family:'Inter',sans-serif;}
  button,a{touch-action:manipulation;}
  button{-webkit-user-select:none;user-select:none;}
  input[type=date]::-webkit-calendar-picker-indicator{opacity:.5;cursor:pointer;filter:var(--cal-filter,none);}
  ::-webkit-scrollbar{width:3px;}
  ::-webkit-scrollbar-thumb{background:rgba(128,128,180,0.25);border-radius:3px;}
  @keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes slideDown{from{transform:translateY(-12px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeInScale{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
  @keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
  @keyframes popIn{0%{transform:scale(.8);opacity:0}70%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
  @keyframes gradShift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  @keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(-12px) scale(.95)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
  button:active:not(:disabled){transform:scale(.97);}
  a:active{opacity:.75;}
`;

// ─── Primitives ───────────────────────────────────────────────────────────────
function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('lm_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => { localStorage.setItem('lm_theme', dark ? 'dark' : 'light'); }, [dark]);
  return [dark ? DARK : LIGHT, dark, () => setDark(d => !d)];
}

const Btn = ({ children, variant='primary', full, sm, loading, style:sx, disabled, onClick }) => {
  const [C] = useTheme();
  const variants = {
    primary: { background: C.accentGrad, color:'#fff', border:'none', boxShadow:`0 4px 15px ${C.accentSoft}` },
    ghost:   { background: C.faint, color: C.text, border:`1.5px solid ${C.border}` },
    danger:  { background: C.redSoft, color: C.red, border:`1.5px solid ${C.red}30` },
    viber:   { background:'linear-gradient(135deg,#7360F2,#9B8BFF)', color:'#fff', border:'none' },
    glass:   { background: C.glass, color: C.text, border:`1.5px solid ${C.glassBorder}`, backdropFilter:'blur(12px)' },
  };
  const base = {
    borderRadius:14, fontWeight:600, cursor:(disabled||loading)?'not-allowed':'pointer',
    fontFamily:"'Inter',sans-serif", display:'inline-flex', alignItems:'center', justifyContent:'center',
    gap:8, transition:'all .2s cubic-bezier(.34,1.56,.64,1)',
    padding: sm ? '8px 16px' : '13px 22px',
    fontSize: sm ? 13 : 15,
    width: full ? '100%' : undefined,
    opacity: (disabled||loading) ? 0.5 : 1,
    letterSpacing: '-0.01em',
  };
  return (
    <button style={{ ...base, ...variants[variant], ...sx }}
      disabled={disabled||loading}
      onClick={(!disabled && !loading) ? onClick : undefined}>
      {loading
        ? <span style={{ width:16, height:16, border:'2.5px solid currentColor', borderTopColor:'transparent', borderRadius:'50%', display:'inline-block', animation:'spin .6s linear infinite' }}/>
        : children}
    </button>
  );
};

const Card = ({ children, style:sx, glass, onClick }) => {
  const [C] = useTheme();
  return (
    <div onClick={onClick} style={{
      background: glass ? C.glass : C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 20,
      boxShadow: C.shadow,
      backdropFilter: glass ? 'blur(20px)' : undefined,
      transition: 'all .2s ease',
      cursor: onClick ? 'pointer' : undefined,
      ...(sx||{})
    }}>
      {children}
    </div>
  );
};

const Field = ({ label, helper, children }) => {
  const [C] = useTheme();
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {label && <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.08em' }}>{label}</label>}
      {children}
      {helper && <p style={{ fontSize:11, color:C.muted, marginTop:1, lineHeight:1.5 }}>{helper}</p>}
    </div>
  );
};

const TInput = ({ label, helper, style:sx, ...props }) => {
  const [C] = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <Field label={label} helper={helper}>
      <input {...props}
        onFocus={e => { setFocused(true); props.onFocus?.(e); }}
        onBlur={e => { setFocused(false); props.onBlur?.(e); }}
        style={{
          border: `1.5px solid ${focused ? C.accent : C.border}`,
          borderRadius: 12, padding: '12px 14px',
          fontSize: 16, background: C.faint, outline: 'none',
          fontFamily: "'Inter',sans-serif", color: C.text,
          transition: 'border-color .2s, box-shadow .2s',
          boxShadow: focused ? `0 0 0 3px ${C.accentSoft}` : 'none',
          ...(sx||{})
        }}/>
    </Field>
  );
};

const SelInput = ({ label, helper, children, ...props }) => {
  const [C] = useTheme();
  return (
    <Field label={label} helper={helper}>
      <div style={{ position:'relative' }}>
        <select {...props} style={{
          border:`1.5px solid ${C.border}`, borderRadius:12, padding:'12px 40px 12px 14px',
          fontSize:16, background:C.faint, outline:'none',
          fontFamily:"'Inter',sans-serif", color:C.text, appearance:'none', width:'100%',
          transition:'border-color .2s',
        }}>{children}</select>
        <span style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:C.muted, fontSize:10 }}>▾</span>
      </div>
    </Field>
  );
};

const Pill = ({ color, label }) => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:4,
    background:`${color}18`, color, borderRadius:99, padding:'3px 10px', fontSize:11, fontWeight:700 }}>
    <span style={{ width:5, height:5, borderRadius:'50%', background:color, display:'inline-block' }}/>
    {label}
  </span>
);

const Toast = ({ msg, type='success', onDone }) => {
  const [C] = useTheme();
  useEffect(() => { const t = setTimeout(onDone, 3500); return () => clearTimeout(t); }, []);
  const isErr = type === 'error';
  return (
    <div style={{
      position:'fixed', top:'calc(env(safe-area-inset-top, 0px) + 60px)', left:'50%',
      transform:'translateX(-50%)',
      background: isErr ? C.redSoft : C.greenSoft,
      border:`1.5px solid ${isErr ? C.red : C.green}40`,
      borderRadius:16, padding:'12px 20px',
      fontSize:13, fontWeight:600, color: isErr ? C.red : C.green,
      zIndex:9999, maxWidth:340, textAlign:'center',
      boxShadow: C.shadowLg,
      animation:'toastIn .3s cubic-bezier(.34,1.56,.64,1)',
      fontFamily:"'Inter',sans-serif", whiteSpace:'pre-line',
      backdropFilter:'blur(20px)',
    }}>
      {isErr ? '⚠ ' : '✓ '}{msg}
    </div>
  );
};

const Sheet = ({ title, onClose, children }) => {
  const [C] = useTheme();
  return (
    <div style={{
      position:'fixed', inset:0,
      background:'rgba(0,0,0,.6)',
      zIndex:500,
      display:'flex', alignItems:'flex-end', justifyContent:'center',
      backdropFilter:'blur(4px)',
      animation:'fadeInScale .2s ease',
    }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{
        background: C.surface,
        borderRadius:'24px 24px 0 0',
        width:'100%', maxWidth:480,
        maxHeight:'92vh', overflowY:'auto',
        WebkitOverflowScrolling:'touch',
        paddingBottom:'calc(env(safe-area-inset-bottom, 0px) + 40px)',
        boxShadow: C.shadowLg,
        animation:'slideUp .3s cubic-bezier(.32,.72,0,1)',
        border:`1px solid ${C.border}`,
        borderBottom:'none',
      }}>
        <div style={{ display:'flex', justifyContent:'center', padding:'14px 0 4px' }}>
          <div style={{ width:40, height:4, borderRadius:99, background:C.border }}/>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 20px 18px' }}>
          <h2 style={{ margin:0, fontSize:20, fontWeight:700, color:C.text, fontFamily:"'Cal Sans','Inter',sans-serif", letterSpacing:'-0.02em' }}>{title}</h2>
          <button onClick={onClose} style={{
            background:C.faint, border:`1px solid ${C.border}`, borderRadius:12,
            width:34, height:34, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
            transition:'all .15s',
          }}>
            <Icon n="x" size={15} color={C.muted}/>
          </button>
        </div>
        <div style={{ padding:'0 20px' }}>{children}</div>
      </div>
    </div>
  );
};

const Spinner = ({ label='Loading…' }) => {
  const [C] = useTheme();
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      gap:14, padding:'60px 20px', color:C.muted, fontFamily:"'Inter',sans-serif" }}>
      <div style={{
        width:36, height:36,
        borderRadius:'50%',
        border:`3px solid ${C.accentSoft}`,
        borderTopColor: C.accent,
        animation:'spin .7s linear infinite',
      }}/>
      <span style={{ fontSize:13, fontWeight:500 }}>{label}</span>
    </div>
  );
};

// ─── Dark Mode Toggle ─────────────────────────────────────────────────────────
function DarkToggle({ dark, onToggle }) {
  const [C] = useTheme();
  return (
    <button onClick={onToggle} style={{
      width:42, height:24, borderRadius:99, border:'none', cursor:'pointer',
      background: dark ? C.accentGrad : C.faint,
      border: `1.5px solid ${C.border}`,
      position:'relative', transition:'all .3s ease',
      display:'flex', alignItems:'center',
      padding:'2px 3px',
      flexShrink:0,
    }}>
      <div style={{
        width:18, height:18, borderRadius:'50%',
        background: dark ? '#fff' : C.accent,
        transform: dark ? 'translateX(18px)' : 'translateX(0)',
        transition:'transform .3s cubic-bezier(.34,1.56,.64,1)',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow:'0 1px 4px rgba(0,0,0,.2)',
      }}>
        <Icon n={dark ? 'moon' : 'sun'} size={10} color={dark ? '#6C47FF' : '#fff'}/>
      </div>
    </button>
  );
}

// ─── Ring ─────────────────────────────────────────────────────────────────────
function Ring({ total, used, color, name, size=100 }) {
  const [C] = useTheme();
  const rem = Math.max(0, total-used), pct = total>0 ? rem/total : 1;
  const r = size/2-9, circ = 2*Math.PI*r;
  const usedPct = total>0 ? used/total : 0;
  const statusColor = usedPct > 0.8 ? C.red : usedPct > 0.5 ? C.orange : color;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, animation:'fadeIn .5s ease both' }}>
      <div style={{ position:'relative', width:size, height:size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.faint} strokeWidth="9"/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={statusColor} strokeWidth="9"
            strokeDasharray={`${circ*pct} ${circ}`} strokeLinecap="round"
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{ transition:'stroke-dasharray .9s cubic-bezier(.4,0,.2,1)', filter:`drop-shadow(0 0 6px ${statusColor}60)` }}/>
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:20, fontWeight:800, color:C.text, lineHeight:1, letterSpacing:'-0.03em' }}>{rem}</span>
          <span style={{ fontSize:9, color:C.muted, fontWeight:600, letterSpacing:'0.04em', marginTop:1 }}>/ {total}</span>
        </div>
      </div>
      <span style={{ fontSize:11, color:C.textSub, fontWeight:600, textAlign:'center', maxWidth:90, lineHeight:1.3 }}>{name}</span>
    </div>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [view, setView] = useState('login');
  const [C, dark, toggleDark] = useTheme();
  return (
    <div style={{
      minHeight:'100vh',
      background: dark
        ? 'radial-gradient(ellipse at 20% 20%, #1A0A3C 0%, #0A0A12 50%, #0A1A1A 100%)'
        : 'radial-gradient(ellipse at 20% 20%, #EDE8FF 0%, #F0F0F5 50%, #E8F0FF 100%)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      padding:'32px 20px', fontFamily:"'Inter',sans-serif",
      position:'relative', overflow:'hidden',
    }}>
      {/* Background orbs */}
      <div style={{ position:'absolute', top:'10%', left:'15%', width:200, height:200, borderRadius:'50%', background: dark ? 'rgba(108,71,255,0.08)' : 'rgba(108,71,255,0.06)', filter:'blur(60px)', animation:'float 6s ease-in-out infinite', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', bottom:'15%', right:'10%', width:160, height:160, borderRadius:'50%', background: dark ? 'rgba(168,85,247,0.06)' : 'rgba(168,85,247,0.05)', filter:'blur(50px)', animation:'float 8s ease-in-out infinite reverse', pointerEvents:'none' }}/>

      <div style={{ position:'absolute', top:20, right:20 }}>
        <DarkToggle dark={dark} onToggle={toggleDark}/>
      </div>

      <div style={{ animation:'fadeInScale .4s ease' }}>
        {view === 'login'  && <LoginForm  onLogin={onLogin} onSwitch={setView}/>}
        {view === 'signup' && <SignupForm onLogin={onLogin} onSwitch={setView}/>}
        {view === 'forgot' && <ForgotForm onSwitch={setView}/>}
      </div>
    </div>
  );
}

function AuthCard({ subtitle, children }) {
  const [C] = useTheme();
  return (
    <div style={{ width:'100%', maxWidth:380, display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{
          width:64, height:64, borderRadius:20,
          background: C.accentGrad,
          display:'flex', alignItems:'center', justifyContent:'center',
          margin:'0 auto 18px',
          boxShadow:`0 8px 30px ${C.accentSoft}`,
          animation:'popIn .5s cubic-bezier(.34,1.56,.64,1)',
        }}>
          <Icon n="sparkle" size={28} color="#fff"/>
        </div>
        <h1 style={{ fontSize:26, fontWeight:800, color:C.text, fontFamily:"'Cal Sans','Inter',sans-serif", margin:'0 0 6px', letterSpacing:'-0.03em' }}>Leave Manager</h1>
        <p style={{ fontSize:14, color:C.muted, margin:0, fontWeight:500 }}>{subtitle}</p>
      </div>
      <div style={{ background: C.surface, border:`1px solid ${C.border}`, borderRadius:24, padding:'28px 24px', boxShadow: C.shadow }}>
        {children}
      </div>
    </div>
  );
}

function AuthInput({ label, type='text', value, onChange, placeholder, autoComplete, error }) {
  const [C] = useTheme();
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const isPw = type === 'password';
  return (
    <Field label={label}>
      <div style={{ position:'relative' }}>
        <input
          type={isPw && show ? 'text' : type}
          value={value} onChange={onChange}
          placeholder={placeholder} autoComplete={autoComplete}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            border: `1.5px solid ${error ? C.red : focused ? C.accent : C.border}`,
            borderRadius:12,
            padding: isPw ? '13px 46px 13px 14px' : '13px 14px',
            fontSize:15, background:C.faint, outline:'none', width:'100%',
            fontFamily:"'Inter',sans-serif", color:C.text, boxSizing:'border-box',
            transition:'border-color .2s, box-shadow .2s',
            boxShadow: focused ? `0 0 0 3px ${error ? C.redSoft : C.accentSoft}` : 'none',
          }}/>
        {isPw && (
          <button type="button" onClick={() => setShow(s => !s)}
            style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
              background:'none', border:'none', cursor:'pointer', padding:4, borderRadius:6 }}>
            <Icon n={show ? 'eyeoff' : 'eye'} size={16} color={C.muted}/>
          </button>
        )}
      </div>
      {error && <p style={{ fontSize:12, color:C.red, margin:'4px 0 0', fontWeight:500 }}>{error}</p>}
    </Field>
  );
}

function LoginForm({ onLogin, onSwitch }) {
  const [C] = useTheme();
  const [email, setEmail]     = useState('');
  const [pw, setPw]           = useState('');
  const [err, setErr]         = useState('');
  const [loading, setLoading] = useState(false);
  const [pkLoading, setPKLoad]= useState(false);

  async function submit(e) {
    e?.preventDefault?.();
    if (!email.trim() || !pw) { setErr('Email and password are required.'); return; }
    setLoading(true); setErr('');
    try { await api.login(email.trim(), pw); onLogin(); }
    catch { setErr('Invalid email or password.'); }
    finally { setLoading(false); }
  }

  async function signInWithPasskey() {
    if (!window.PublicKeyCredential) { setErr('Passkeys not supported on this browser.'); return; }
    setPKLoad(true); setErr('');
    try {
      const { challenge, challengeId, rpId } = await api.getPasskeyChallenge();
      const assertion = await navigator.credentials.get({
        publicKey: { challenge: b64urlToUint8(challenge), rpId, allowCredentials:[], userVerification:'required', timeout:60000 },
      });
      if (!assertion) throw new Error('No credential returned');
      await api.loginPasskey({ credentialId: assertion.id, challengeId, verified: true });
      onLogin();
    } catch(e) {
      if (e.name==='NotAllowedError') setErr('Passkey sign-in was cancelled.');
      else setErr(e.message || 'Passkey sign-in failed.');
    } finally { setPKLoad(false); }
  }

  return (
    <AuthCard subtitle="Sign in to your account">
      <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <AuthInput label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email"/>
        <AuthInput label="Password" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Your password" autoComplete="current-password" error={err}/>
        <Btn full onClick={submit} loading={loading} style={{ marginTop:4 }}>
          Sign In <Icon n="arrow" size={16} color="#fff"/>
        </Btn>
      </form>
      {window.PublicKeyCredential && (
        <>
          <div style={{ display:'flex', alignItems:'center', gap:10, margin:'18px 0' }}>
            <div style={{ flex:1, height:1, background:C.border }}/><span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>OR</span><div style={{ flex:1, height:1, background:C.border }}/>
          </div>
          <Btn full variant="glass" onClick={signInWithPasskey} loading={pkLoading}>
            <Icon n="fingerprint" size={17}/> Sign in with Passkey
          </Btn>
        </>
      )}
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, marginTop:18 }}>
        <button onClick={()=>onSwitch('forgot')} style={{ background:'none', border:'none', fontSize:13, color:C.muted, cursor:'pointer', fontWeight:500 }}>Forgot password?</button>
        <p style={{ fontSize:13, color:C.muted, margin:0 }}>No account? <span style={{ color:C.accent, fontWeight:700, cursor:'pointer' }} onClick={()=>onSwitch('signup')}>Sign up</span></p>
      </div>
    </AuthCard>
  );
}

function SignupForm({ onLogin, onSwitch }) {
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw]       = useState('');
  const [pw2, setPw2]     = useState('');
  const [err, setErr]     = useState('');
  const [loading, setLoad]= useState(false);
  const [C]               = useTheme();

  async function submit(e) {
    e?.preventDefault?.(); setErr('');
    if (!email.trim() || !pw) { setErr('Email and password are required.'); return; }
    if (pw.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    if (pw !== pw2) { setErr('Passwords do not match.'); return; }
    setLoad(true);
    try { await api.signup(email.trim(), pw, name.trim()); onLogin(); }
    catch(e) { setErr(e.message?.includes('already exists') ? 'An account with this email already exists.' : (e.message||'Signup failed.')); }
    finally { setLoad(false); }
  }

  return (
    <AuthCard subtitle="Create your account">
      <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <AuthInput label="Name (optional)" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" autoComplete="name"/>
        <AuthInput label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email"/>
        <AuthInput label="Password" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password"/>
        <AuthInput label="Confirm Password" type="password" value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="Repeat password" autoComplete="new-password" error={err}/>
        <Btn full onClick={submit} loading={loading} style={{ marginTop:6 }}>
          Create Account <Icon n="arrow" size={16} color="#fff"/>
        </Btn>
      </form>
      <p style={{ fontSize:13, color:C.muted, textAlign:'center', marginTop:18 }}>
        Already have an account? <span style={{ color:C.accent, fontWeight:700, cursor:'pointer' }} onClick={()=>onSwitch('login')}>Sign in</span>
      </p>
    </AuthCard>
  );
}

function ForgotForm({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [loading, setLoad]= useState(false);
  const [sent, setSent]   = useState(false);
  const [C]               = useTheme();

  async function submit(e) {
    e?.preventDefault?.();
    if (!email.trim()) return;
    setLoad(true);
    try { await api.forgotPassword(email.trim()); } catch {}
    finally { setSent(true); setLoad(false); }
  }

  return (
    <AuthCard subtitle="Reset your password">
      {sent ? (
        <div style={{ textAlign:'center', padding:'8px 0' }}>
          <div style={{ fontSize:48, marginBottom:16, animation:'float 3s ease-in-out infinite' }}>📧</div>
          <p style={{ color:C.text, fontWeight:700, fontSize:16, marginBottom:8 }}>Check your email</p>
          <p style={{ color:C.muted, fontSize:13, lineHeight:1.6 }}>If an account exists for <strong>{email}</strong>, a reset link has been sent.</p>
          <button onClick={()=>onSwitch('login')} style={{ marginTop:20, background:'none', border:'none', color:C.accent, fontWeight:700, fontSize:14, cursor:'pointer' }}>← Back to Sign In</button>
        </div>
      ) : (
        <>
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <AuthInput label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email"/>
            <Btn full onClick={submit} loading={loading} style={{ marginTop:4 }}>Send Reset Link</Btn>
          </form>
          <p style={{ fontSize:13, color:C.muted, textAlign:'center', marginTop:18 }}>
            <span style={{ color:C.accent, fontWeight:700, cursor:'pointer' }} onClick={()=>onSwitch('login')}>← Back to Sign In</span>
          </p>
        </>
      )}
    </AuthCard>
  );
}

// ─── Onboarding ───────────────────────────────────────────────────────────────
function Onboarding({ onDone }) {
  const [step, setStep]   = useState(0);
  const [date, setDate]   = useState('');
  const [saving, setSave] = useState(false);
  const [C]               = useTheme();

  const slides = [
    { emoji:'🗓️', title:'Track your leave,\nstay in control.', body:'Manage all your leave balances in one place. Know exactly how many days you have left.', color:'#6C47FF' },
    { emoji:'💬', title:'Notify via Viber,\ninstantly.', body:'After applying for leave, the app opens Viber with a pre-filled message. One tap to send.', color:'#7360F2' },
    { emoji:'🔄', title:'Auto-resets on\ncontract renewal.', body:'Set your contract renewal date once. Every year, all balances reset automatically.', color:'#10B981' },
  ];

  if (step < 3) {
    const s = slides[step];
    return (
      <div style={{ minHeight:'100vh', background: C.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, fontFamily:"'Inter',sans-serif", position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'5%', right:'10%', width:180, height:180, borderRadius:'50%', background:`${s.color}10`, filter:'blur(50px)', transition:'all .5s ease', pointerEvents:'none' }}/>
        <div style={{ width:'100%', maxWidth:360, display:'flex', flexDirection:'column', gap:32, alignItems:'center', animation:'fadeInScale .4s ease' }}>
          <span style={{ fontSize:72, animation:'float 4s ease-in-out infinite', filter:`drop-shadow(0 8px 20px ${s.color}40)` }}>{s.emoji}</span>
          <div style={{ textAlign:'center' }}>
            <h1 style={{ fontSize:28, fontWeight:800, color:C.text, fontFamily:"'Cal Sans','Inter',sans-serif", whiteSpace:'pre-line', lineHeight:1.2, margin:'0 0 14px', letterSpacing:'-0.03em' }}>{s.title}</h1>
            <p style={{ fontSize:15, color:C.textSub, lineHeight:1.7 }}>{s.body}</p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {slides.map((_,i) => <div key={i} style={{ width:i===step?28:7, height:7, borderRadius:99, background:i===step?C.accent:C.border, transition:'all .4s cubic-bezier(.34,1.56,.64,1)' }}/>)}
          </div>
          <Btn full onClick={()=>setStep(s=>s+1)} style={{ borderRadius:16 }}>
            {step < 2 ? 'Continue' : 'Set up my app'} <Icon n="arrow" size={16} color="#fff"/>
          </Btn>
          {step > 0 && <button onClick={()=>setStep(s=>s-1)} style={{ background:'none', border:'none', color:C.muted, fontSize:13, cursor:'pointer', fontFamily:"'Inter',sans-serif", fontWeight:500 }}>← Back</button>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, fontFamily:"'Inter',sans-serif" }}>
      <div style={{ width:'100%', maxWidth:360, display:'flex', flexDirection:'column', gap:24, animation:'fadeInScale .4s ease' }}>
        <div style={{ textAlign:'center' }}>
          <span style={{ fontSize:56, animation:'float 3s ease-in-out infinite', display:'inline-block' }}>📅</span>
          <h1 style={{ fontSize:24, fontWeight:800, color:C.text, fontFamily:"'Cal Sans','Inter',sans-serif", margin:'16px 0 10px', letterSpacing:'-0.02em' }}>When does your contract renew?</h1>
          <p style={{ fontSize:14, color:C.textSub, lineHeight:1.65 }}>Balances reset to full on this date each year.</p>
        </div>
        <Card style={{ padding:20 }}>
          <TInput label="Contract Renewal Date" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
        </Card>
        <Btn full onClick={async()=>{setSave(true);await onDone(date);setSave(false);}} loading={saving} style={{ borderRadius:16 }}>
          Let's go <Icon n="arrow" size={16} color="#fff"/>
        </Btn>
        <button onClick={()=>onDone('')} style={{ background:'none', border:'none', color:C.muted, fontSize:13, cursor:'pointer', textAlign:'center', fontFamily:"'Inter',sans-serif", fontWeight:500 }}>Skip for now</button>
      </div>
    </div>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────
function HomeScreen({ leaveTypes, settings, history, onApply, justReset, onDismissReset }) {
  const [C, dark] = useTheme();
  const renewal = daysTo(settings.contractRenewal);
  const urgent  = renewal !== null && renewal <= 30;
  const totalUsed = leaveTypes.reduce((a,l) => a+l.used, 0);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, animation:'fadeIn .4s ease' }}>
      {justReset && (
        <div style={{ background: C.greenSoft, borderRadius:18, padding:'16px 18px', border:`1px solid ${C.green}30`, display:'flex', gap:12, alignItems:'flex-start', animation:'popIn .4s ease' }}>
          <span style={{ fontSize:24, flexShrink:0 }}>🎉</span>
          <div style={{ flex:1 }}>
            <p style={{ fontWeight:700, color:C.green, fontSize:14, marginBottom:3 }}>Leave Balance Reset!</p>
            <p style={{ fontSize:12, color:C.green, opacity:.8, lineHeight:1.55 }}>Contract renewed — all balances back to full.{settings.contractRenewal && ` Next reset: ${fmt(settings.contractRenewal)}.`}</p>
          </div>
          <button onClick={onDismissReset} style={{ background:'none', border:'none', cursor:'pointer', padding:2 }}><Icon n="x" size={14} color={C.green}/></button>
        </div>
      )}

      {/* Contract renewal card */}
      {settings.contractRenewal ? (
        <Card style={{ padding:'16px 18px', background: urgent ? C.orangeSoft : C.surface, border:`1px solid ${urgent ? C.orange+'40' : C.border}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:46, height:46, borderRadius:14, background: urgent ? C.orangeSoft : C.accentSoft, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon n="cal" size={22} color={urgent ? C.orange : C.accent}/>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:11, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:3 }}>Balance resets on</p>
              <p style={{ fontSize:16, fontWeight:700, color: urgent ? C.orange : C.text }}>{fmt(settings.contractRenewal)}</p>
              <p style={{ fontSize:12, color: urgent ? C.orange : C.muted, marginTop:2, fontWeight:500 }}>
                {renewal===null?'':renewal>0?`${renewal} days away`:renewal===0?'Resets today 🔄':`${Math.abs(renewal)} days overdue`}
              </p>
            </div>
            {urgent && <div style={{ width:8, height:8, borderRadius:'50%', background:C.orange, animation:'pulse 2s infinite', flexShrink:0 }}/>}
          </div>
        </Card>
      ) : (
        <Card style={{ padding:'14px 16px', border:`1.5px dashed ${C.border}` }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <Icon n="info" size={16} color={C.muted}/>
            <p style={{ fontSize:13, color:C.muted, lineHeight:1.5 }}>Set a renewal date in <strong>Settings → Contract</strong> to enable auto-reset.</p>
          </div>
        </Card>
      )}

      {/* Leave balances */}
      <Card style={{ padding:'20px 18px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ fontSize:13, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.07em', margin:0 }}>Leave Balances</h2>
          {totalUsed > 0 && <span style={{ fontSize:12, color:C.muted, fontWeight:500 }}>{totalUsed} day{totalUsed!==1?'s':''} used</span>}
        </div>
        {leaveTypes.length === 0
          ? <p style={{ color:C.muted, fontSize:13, textAlign:'center', padding:'16px 0' }}>Add leave types in Settings.</p>
          : <div style={{ display:'flex', flexWrap:'wrap', gap:20, justifyContent:'space-around' }}>
              {leaveTypes.map((lt,i) => <Ring key={lt.id} name={lt.name} total={lt.total} used={lt.used} color={lt.color} style={{ animationDelay:`${i*80}ms` }}/>)}
            </div>
        }
      </Card>

      {/* Apply CTA */}
      <button onClick={onApply} style={{
        background: C.accentGrad,
        border:'none', borderRadius:20, padding:'18px',
        cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:10,
        boxShadow:`0 8px 30px ${C.accentSoft}`,
        fontSize:16, fontWeight:700, color:'#fff',
        fontFamily:"'Inter',sans-serif",
        transition:'all .2s cubic-bezier(.34,1.56,.64,1)',
        letterSpacing:'-0.01em',
        backgroundSize:'200% 200%',
        animation:'gradShift 4s ease infinite',
      }}>
        <Icon n="plus" size={22} color="#fff"/> Apply for Leave
      </button>

      {/* Recent */}
      {history.length > 0 && (
        <div>
          <h2 style={{ fontSize:13, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>Recent</h2>
          {history.slice(0,3).map((h,i) => <HistoryRow key={h.id} item={h} style={{ animationDelay:`${i*60}ms` }}/>)}
        </div>
      )}
    </div>
  );
}

// ─── History Row ──────────────────────────────────────────────────────────────
function HistoryRow({ item, onDelete, style:sx }) {
  const [C] = useTheme();
  const color = item.typeColor || item.type_color;
  const name  = item.typeName  || item.type_name;
  const sd    = item.startDate || item.start_date;
  const ed    = item.endDate   || item.end_date;
  return (
    <div style={{
      background:C.surface, borderRadius:16, padding:'14px 16px',
      border:`1px solid ${C.border}`, marginBottom:10,
      display:'flex', alignItems:'center', gap:13,
      boxShadow:C.shadow, animation:'fadeIn .4s ease both',
      transition:'all .2s ease', ...(sx||{})
    }}>
      <div style={{ width:42, height:42, borderRadius:13, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon n="cal" size={20} color={color}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
          <span style={{ fontWeight:700, fontSize:14, color:C.text }}>{name}</span>
          <Pill color={color} label={`${item.days}d`}/>
        </div>
        <p style={{ fontSize:12, color:C.muted, fontWeight:500 }}>{fmt(sd)}{sd!==ed?` → ${fmt(ed)}`:''}</p>
        {item.reason && <p style={{ fontSize:11, color:C.muted, marginTop:2, fontStyle:'italic', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', opacity:.7 }}>"{item.reason}"</p>}
      </div>
      {onDelete && (
        <button onClick={()=>onDelete(item.id)} style={{ background:C.faint, border:`1px solid ${C.border}`, cursor:'pointer', padding:'7px 8px', borderRadius:10, flexShrink:0, transition:'all .15s' }}>
          <Icon n="trash" size={15} color={C.muted}/>
        </button>
      )}
    </div>
  );
}

// ─── Apply Form ───────────────────────────────────────────────────────────────
function ApplyForm({ leaveTypes, recipients, onClose, onSuccess, toast }) {
  const [C] = useTheme();
  const t = today();
  const [form, setForm]   = useState({ typeId:leaveTypes[0]?.id||'', start:t, end:t, reason:'' });
  const [sub, setSub]     = useState(false);
  const [links, setLinks] = useState(null);
  const [entry, setEntry] = useState(null);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const sel    = leaveTypes.find(l=>l.id===form.typeId);
  const days   = form.start && form.end ? weekdays(form.start, form.end) : 0;
  const remain = sel ? sel.total - sel.used : 0;
  const over   = days > remain;

  async function submit() {
    if (!sel||days<=0||over) return;
    setSub(true);
    try {
      const newEntry = await api.applyLeave({ leaveTypeId:form.typeId, startDate:form.start, endDate:form.end, reason:form.reason });
      setEntry(newEntry);
      if (recipients.length > 0) {
        const { links:vl } = await api.getViberLinks(newEntry.id);
        setLinks(vl);
      } else { setLinks([]); }
    } catch(err) { toast?.(err.message, 'error'); }
    finally { setSub(false); }
  }

  if (leaveTypes.length === 0) return (
    <p style={{ textAlign:'center', color:C.muted, fontSize:14, lineHeight:1.7, padding:'20px 0' }}>
      No leave types configured.<br/>Go to <strong>Settings → Leave Types</strong>.
    </p>
  );

  if (entry && links !== null) {
    const sd = entry.startDate||entry.start_date, ed = entry.endDate||entry.end_date;
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ background:C.greenSoft, borderRadius:16, padding:'16px 18px', border:`1px solid ${C.green}30`, display:'flex', gap:12, alignItems:'center', animation:'popIn .4s ease' }}>
          <Icon n="check" size={24} color={C.green}/>
          <div>
            <p style={{ fontWeight:700, color:C.green, fontSize:14 }}>Leave Submitted!</p>
            <p style={{ color:C.green, opacity:.8, fontSize:12, marginTop:2 }}>
              {entry.typeName||entry.type_name} · {entry.days} day{entry.days>1?'s':''} · {fmt(sd)}{sd!==ed?` → ${fmt(ed)}`:''}
            </p>
          </div>
        </div>

        {links.length > 0 ? (
          <>
            <Card style={{ padding:'13px 16px', background:C.faint }}>
              <p style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Message preview</p>
              <p style={{ fontSize:13, color:C.textSub, lineHeight:1.6 }}>{links[0].messagePreview}</p>
            </Card>
            <p style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em' }}>Notify via Viber</p>
            {links.map(lk => (
              <a key={lk.id} href={lk.viberUrl} style={{ textDecoration:'none', display:'block' }}>
                <Card style={{ padding:'14px 16px', background:'linear-gradient(135deg,rgba(115,96,242,0.08),rgba(155,139,255,0.08))', border:`1px solid ${C.viber}30` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:42, height:42, borderRadius:13, background:C.viber, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon n="viber" size={20} color="#fff"/>
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontWeight:700, color:C.viber, fontSize:14 }}>{lk.recipientName}</p>
                      <p style={{ fontSize:12, color:C.muted }}>{lk.phone}</p>
                    </div>
                    <span style={{ fontSize:13, fontWeight:700, color:C.viber }}>Open →</span>
                  </div>
                </Card>
              </a>
            ))}
          </>
        ) : (
          <Card style={{ padding:'14px 16px', border:`1.5px dashed ${C.border}`, textAlign:'center' }}>
            <p style={{ fontSize:13, color:C.muted, lineHeight:1.6 }}>No Viber recipients yet.<br/>Add them in <strong>Settings → Viber</strong>.</p>
          </Card>
        )}
        <Btn full variant="ghost" onClick={onSuccess} style={{ marginTop:4 }}>Done</Btn>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SelInput label="Leave Type" value={form.typeId} onChange={e=>set('typeId',e.target.value)}>
        {leaveTypes.map(l => <option key={l.id} value={l.id}>{l.name} — {l.total-l.used} day{l.total-l.used!==1?'s':''} remaining</option>)}
      </SelInput>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <TInput label="Start Date" type="date" value={form.start} min={t} onChange={e=>{set('start',e.target.value);if(e.target.value>form.end)set('end',e.target.value);}}/>
        <TInput label="End Date" type="date" value={form.end} min={form.start} onChange={e=>set('end',e.target.value)}/>
      </div>
      {days > 0 && (
        <Card style={{ padding:'12px 16px', background: over ? C.redSoft : C.accentSoft, border:`1px solid ${over ? C.red : C.accent}30` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:14, fontWeight:700, color: over ? C.red : C.accent }}>{days} working day{days!==1?'s':''}</span>
            {over && <span style={{ fontSize:12, color:C.red, fontWeight:600 }}>Only {remain} day{remain!==1?'s':''} left</span>}
          </div>
        </Card>
      )}
      <TInput label="Reason (optional)" value={form.reason} placeholder="e.g. Family vacation, medical…" onChange={e=>set('reason',e.target.value)}/>
      <Btn full onClick={submit} disabled={days<=0||over} loading={sub} style={{ marginTop:4, padding:16, fontSize:16, borderRadius:16 }}>
        Submit Leave
      </Btn>
    </div>
  );
}

// ─── History Screen ───────────────────────────────────────────────────────────
function HistoryScreen({ leaveTypes, history, onRefresh, toast }) {
  const [C] = useTheme();
  const [filter, setFilter]   = useState('all');
  const [deleting, setDel]    = useState(null);

  async function cancel(id) {
    setDel(id);
    try { await api.cancelLeave(id); toast('Leave cancelled — balance restored.'); onRefresh(); }
    catch(err) { toast(err.message, 'error'); }
    finally { setDel(null); }
  }

  const filtered = filter==='all' ? history : history.filter(h=>(h.leaveTypeId||h.leave_type_id)===filter);

  if (history.length === 0) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:16, padding:'60px 20px', color:C.muted, textAlign:'center' }}>
      <div style={{ width:80, height:80, borderRadius:'50%', background:C.faint, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon n="hist" size={36} color={C.border}/>
      </div>
      <div>
        <p style={{ fontSize:16, fontWeight:700, color:C.textSub, marginBottom:6 }}>No leave history yet</p>
        <p style={{ fontSize:13, lineHeight:1.7, color:C.muted }}>Apply for leave to see it here.</p>
      </div>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16, animation:'fadeIn .4s ease' }}>
      {/* Summary */}
      <Card style={{ padding:'18px 16px' }}>
        <p style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:14 }}>Period Summary</p>
        {leaveTypes.map(lt => (
          <div key={lt.id} style={{ marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <span style={{ fontSize:13, fontWeight:600, color:C.textSub }}>{lt.name}</span>
              <span style={{ fontSize:13, fontWeight:700, color:lt.color }}>{lt.used} / {lt.total} days</span>
            </div>
            <div style={{ height:6, borderRadius:99, background:C.faint, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:99, background:lt.color, width:`${lt.total>0?Math.min(100,(lt.used/lt.total)*100):0}%`, transition:'width .8s cubic-bezier(.4,0,.2,1)', boxShadow:`0 0 8px ${lt.color}60` }}/>
            </div>
          </div>
        ))}
      </Card>

      {leaveTypes.length > 1 && (
        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2 }}>
          {['all', ...leaveTypes.map(l=>l.id)].map(t => {
            const lt = leaveTypes.find(l=>l.id===t);
            const active = filter===t;
            return (
              <button key={t} onClick={()=>setFilter(t)} style={{
                border:`1.5px solid ${active ? C.accent : C.border}`,
                background: active ? C.accent : C.surface,
                color: active ? '#fff' : C.muted,
                borderRadius:99, padding:'6px 16px', fontSize:12, fontWeight:600,
                cursor:'pointer', flexShrink:0, fontFamily:"'Inter',sans-serif",
                transition:'all .2s cubic-bezier(.34,1.56,.64,1)',
                boxShadow: active ? `0 4px 12px ${C.accentSoft}` : 'none',
              }}>{t==='all'?'All':lt?.name||t}</button>
            );
          })}
        </div>
      )}

      <p style={{ fontSize:12, color:C.muted, fontWeight:500 }}>Tap 🗑 to cancel a leave and restore the balance.</p>
      {filtered.length===0
        ? <p style={{ textAlign:'center', color:C.muted, fontSize:13, padding:'20px 0' }}>No entries for this type.</p>
        : filtered.map(h => <HistoryRow key={h.id} item={h} onDelete={deleting===h.id ? null : cancel}/>)
      }
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function AccountTab({ onClose, onLogout, toast }) {
  const [C] = useTheme();
  const [logoutLoad, setLogoutLoad] = useState(false);
  const [pkStatus, setPkStatus]     = useState(null);
  const [pkLoad, setPkLoad]         = useState(false);

  useEffect(() => {
    api.getPasskeyStatus().then(({ registered }) => setPkStatus(registered)).catch(() => setPkStatus(false));
  }, []);

  async function handleLogout() {
    setLogoutLoad(true);
    try { await api.logout(); onLogout(); onClose(); }
    catch { toast('Sign out failed', 'error'); }
    finally { setLogoutLoad(false); }
  }

  async function registerPasskey() {
    if (!window.PublicKeyCredential) { toast('Passkeys not supported on this browser.', 'error'); return; }
    setPkLoad(true);
    try {
      const { challenge, challengeId, rpId, rpName, userId } = await api.getPasskeyChallenge();
      const userIdBytes = userId
        ? new Uint8Array(userId.replace(/-/g,'').match(/.{2}/g).map(b=>parseInt(b,16)))
        : crypto.getRandomValues(new Uint8Array(16));
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: b64urlToUint8(challenge), rp:{ id:rpId, name:rpName||'Leave Manager' },
          user:{ id:userIdBytes, name:'user', displayName:'Leave Manager' },
          pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
          authenticatorSelection:{ authenticatorAttachment:'platform', userVerification:'required', residentKey:'preferred' },
          timeout:60000,
        },
      });
      if (!credential) throw new Error('No credential created');
      let pkBytes;
      try { pkBytes = credential.response.getPublicKey?.() || credential.response.clientDataJSON; }
      catch { pkBytes = credential.response.clientDataJSON; }
      await api.registerPasskey({ credentialId:credential.id, publicKey:uint8ToB64url(pkBytes), challengeId });
      toast('Passkey registered! Sign in with biometrics next time.');
      setPkStatus(true);
    } catch(e) {
      if (e.name==='NotAllowedError') toast('Passkey registration cancelled.', 'error');
      else toast(e.message||'Failed to register passkey.', 'error');
    } finally { setPkLoad(false); }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14, paddingBottom:16 }}>
      {window.PublicKeyCredential && (
        <Card style={{ padding:'16px 18px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:C.accentSoft, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon n="fingerprint" size={18} color={C.accent}/>
            </div>
            <p style={{ fontSize:14, fontWeight:700, color:C.text }}>Passkey (Biometric Sign-in)</p>
          </div>
          {pkStatus === null ? (
            <p style={{ fontSize:13, color:C.muted }}>Checking…</p>
          ) : pkStatus ? (
            <div style={{ display:'flex', alignItems:'center', gap:8, background:C.greenSoft, padding:'10px 14px', borderRadius:12 }}>
              <Icon n="check" size={16} color={C.green}/>
              <p style={{ fontSize:13, color:C.green, fontWeight:600 }}>Active — you can sign in with biometrics</p>
            </div>
          ) : (
            <>
              <p style={{ fontSize:13, color:C.textSub, lineHeight:1.6, marginBottom:12 }}>Register your fingerprint or Face ID to skip the password.</p>
              <Btn variant="ghost" full sm onClick={registerPasskey} loading={pkLoad}>
                <Icon n="fingerprint" size={15}/> Register Passkey
              </Btn>
            </>
          )}
        </Card>
      )}
      <p style={{ fontSize:13, color:C.muted, lineHeight:1.6 }}>You are signed in. Sessions last 30 days.</p>
      <Btn full variant="danger" onClick={handleLogout} loading={logoutLoad} style={{ borderRadius:14, padding:14 }}>
        Sign Out
      </Btn>
    </div>
  );
}

function SettingsModal({ leaveTypes, recipients, settings, onClose, onRefresh, onLogout, toast }) {
  const [tab, setTab] = useState('leaves');
  const [C]           = useTheme();
  const tabs = [['leaves','🌿','Leaves'],['recipients','💬','Viber'],['contract','📅','Contract'],['account','👤','Account']];
  return (
    <Sheet title="Settings" onClose={onClose}>
      <div style={{ display:'flex', background:C.faint, borderRadius:16, padding:4, marginBottom:22, gap:3 }}>
        {tabs.map(([id,em,label]) => (
          <button key={id} onClick={()=>setTab(id)} style={{
            flex:1, padding:'9px 4px', border:'none', borderRadius:13,
            fontWeight:600, fontSize:11, cursor:'pointer', fontFamily:"'Inter',sans-serif",
            background: tab===id ? C.surface : 'transparent',
            color: tab===id ? C.text : C.muted,
            boxShadow: tab===id ? C.shadow : 'none',
            transition:'all .2s ease',
          }}>
            {em} {label}
          </button>
        ))}
      </div>
      {tab==='leaves'     && <LeaveTypesTab  leaveTypes={leaveTypes} onRefresh={onRefresh} toast={toast}/>}
      {tab==='recipients' && <RecipientsTab  recipients={recipients} onRefresh={onRefresh} toast={toast}/>}
      {tab==='contract'   && <ContractTab    settings={settings}     onRefresh={onRefresh} toast={toast}/>}
      {tab==='account'    && <AccountTab     onClose={onClose}       onLogout={onLogout}   toast={toast}/>}
    </Sheet>
  );
}

function LeaveTypesTab({ leaveTypes, onRefresh, toast }) {
  const [C]               = useTheme();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]   = useState({ name:'', total:14, color:PALETTE[0] });
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!form.name.trim()) return;
    setSaving(true);
    try { await api.addLeaveType({ name:form.name.trim(), total:Number(form.total), color:form.color }); toast('Leave type added!'); onRefresh(); setAdding(false); setForm({ name:'', total:14, color:PALETTE[0] }); }
    catch(err) { toast(err.message, 'error'); }
    setSaving(false);
  }
  async function saveEdit() {
    setSaving(true);
    try { await api.updateLeaveType(editing.id, { name:editing.name, total:Number(editing.total), color:editing.color }); toast('Saved!'); onRefresh(); setEditing(null); }
    catch(err) { toast(err.message, 'error'); }
    setSaving(false);
  }
  async function remove(id) {
    try { await api.deleteLeaveType(id); toast('Leave type removed.'); onRefresh(); }
    catch(err) { toast(err.message, 'error'); }
  }

  const ColorPicker = ({ value, onChange }) => (
    <div>
      <p style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>Color</p>
      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
        {PALETTE.map(c => (
          <button key={c} onClick={()=>onChange(c)} style={{
            width:30, height:30, borderRadius:'50%', background:c, cursor:'pointer',
            border: value===c ? `3px solid ${C.text}` : '3px solid transparent',
            boxShadow: value===c ? `0 0 0 2px ${C.bg}` : 'none',
            transition:'all .2s ease',
          }}/>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {leaveTypes.map(lt => (
        <Card key={lt.id} style={{ padding:'14px 16px' }}>
          {editing?.id===lt.id ? (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <TInput label="Name" value={editing.name} onChange={e=>setEditing(p=>({...p,name:e.target.value}))}/>
              <TInput label="Total days / year" type="number" min="1" value={editing.total} onChange={e=>setEditing(p=>({...p,total:e.target.value}))}/>
              <ColorPicker value={editing.color} onChange={c=>setEditing(p=>({...p,color:c}))}/>
              <div style={{ display:'flex', gap:8 }}>
                <Btn variant="ghost" sm style={{ flex:1 }} onClick={()=>setEditing(null)}>Cancel</Btn>
                <Btn sm style={{ flex:1 }} onClick={saveEdit} loading={saving}>Save</Btn>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:14, height:14, borderRadius:'50%', background:lt.color, flexShrink:0, boxShadow:`0 0 8px ${lt.color}60` }}/>
                <span style={{ flex:1, fontWeight:700, fontSize:14, color:C.text }}>{lt.name}</span>
                <button onClick={()=>setEditing({id:lt.id,name:lt.name,total:lt.total,color:lt.color})} style={{ background:'none', border:'none', cursor:'pointer', padding:'4px 6px', borderRadius:8 }}><Icon n="edit" size={15} color={C.muted}/></button>
                <button onClick={()=>remove(lt.id)} style={{ background:'none', border:'none', cursor:'pointer', padding:'4px 6px', borderRadius:8 }}><Icon n="trash" size={15} color={C.muted}/></button>
              </div>
              <div style={{ display:'flex', gap:16, marginTop:10, marginLeft:24 }}>
                <span style={{ fontSize:12, color:C.muted }}>Total: <b style={{color:C.text}}>{lt.total}d</b></span>
                <span style={{ fontSize:12, color:C.muted }}>Used: <b style={{color:lt.color}}>{lt.used}d</b></span>
                <span style={{ fontSize:12, color:C.muted }}>Left: <b style={{color:C.text}}>{Math.max(0,lt.total-lt.used)}d</b></span>
              </div>
              <div style={{ height:5, borderRadius:99, background:C.faint, marginTop:10, marginLeft:24, overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:99, background:lt.color, width:`${lt.total>0?Math.min(100,(lt.used/lt.total)*100):0}%`, transition:'width .6s ease', boxShadow:`0 0 6px ${lt.color}50` }}/>
              </div>
            </>
          )}
        </Card>
      ))}
      {adding ? (
        <Card style={{ padding:16, border:`1.5px solid ${C.accent}30`, background:C.accentSoft }}>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <TInput label="Leave Type Name" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Study Leave, Maternity…"/>
            <TInput label="Total Days / Year" type="number" min="1" value={form.total} onChange={e=>setForm(p=>({...p,total:e.target.value}))}/>
            <ColorPicker value={form.color} onChange={c=>setForm(p=>({...p,color:c}))}/>
            <div style={{ display:'flex', gap:8 }}>
              <Btn variant="ghost" sm style={{ flex:1 }} onClick={()=>setAdding(false)}>Cancel</Btn>
              <Btn sm style={{ flex:1 }} onClick={add} loading={saving}>Add</Btn>
            </div>
          </div>
        </Card>
      ) : (
        <Btn variant="ghost" full onClick={()=>setAdding(true)}><Icon n="plus" size={16}/> Add Leave Type</Btn>
      )}
    </div>
  );
}

function RecipientsTab({ recipients, onRefresh, toast }) {
  const [C]               = useTheme();
  const [adding, setAdding] = useState(false);
  const [form, setForm]   = useState({ name:'', phone:'' });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  async function add() {
    if (!form.name.trim()||!form.phone.trim()) return;
    setSaving(true);
    try { await api.addRecipient({ name:form.name.trim(), phone:form.phone.trim() }); toast('Recipient added!'); onRefresh(); setForm({name:'',phone:''}); setAdding(false); }
    catch(err) { toast(err.message,'error'); }
    setSaving(false);
  }
  async function remove(id) {
    try { await api.deleteRecipient(id); toast('Recipient removed.'); onRefresh(); }
    catch(err) { toast(err.message,'error'); }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <Card style={{ padding:'12px 16px', background:'linear-gradient(135deg,rgba(115,96,242,0.08),rgba(155,139,255,0.08))', border:`1px solid ${C.viber}25` }}>
        <p style={{ fontSize:12, color:C.viber, lineHeight:1.65, fontWeight:500 }}>💬 After applying for leave, the app opens Viber with a pre-filled message. One tap to send.</p>
      </Card>
      {recipients.length===0&&!adding&&<p style={{ fontSize:13, color:C.muted, textAlign:'center', padding:'12px 0' }}>No contacts yet. Add your manager or HR.</p>}
      {recipients.map(r => (
        <Card key={r.id} style={{ padding:'13px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:13, background:'rgba(115,96,242,0.12)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Icon n="user" size={20} color={C.viber}/>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ fontWeight:700, fontSize:14, color:C.text }}>{r.name}</p>
              <p style={{ fontSize:12, color:C.muted, marginTop:1 }}>{r.phone}</p>
            </div>
            <button onClick={()=>remove(r.id)} style={{ background:C.faint, border:`1px solid ${C.border}`, cursor:'pointer', padding:'7px 8px', borderRadius:10, transition:'all .15s' }}><Icon n="trash" size={15} color={C.muted}/></button>
          </div>
        </Card>
      ))}
      {adding ? (
        <Card style={{ padding:16, border:`1.5px solid ${C.viber}30`, background:'rgba(115,96,242,0.05)' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <TInput label="Contact Name" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Manager, HR"/>
            <TInput label="Phone (with country code)" type="tel" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+960 7XX XXXX" helper="Must include country code for Viber deep-link."/>
            <div style={{ display:'flex', gap:8 }}>
              <Btn variant="ghost" sm style={{ flex:1 }} onClick={()=>setAdding(false)}>Cancel</Btn>
              <Btn variant="viber" sm style={{ flex:1 }} onClick={add} loading={saving}><Icon n="viber" size={15} color="#fff"/> Add</Btn>
            </div>
          </div>
        </Card>
      ) : (
        <Btn variant="ghost" full onClick={()=>setAdding(true)}><Icon n="plus" size={16}/> Add Viber Contact</Btn>
      )}
    </div>
  );
}

function ContractTab({ settings, onRefresh, toast }) {
  const [C]             = useTheme();
  const [date, setDate] = useState(settings.contractRenewal||'');
  const [saving, setSave] = useState(false);
  const saved = date===(settings.contractRenewal||'');
  const days  = daysTo(date);

  async function save() {
    setSave(true);
    try { await api.updateSettings({ contractRenewal:date }); toast('Contract date saved!'); onRefresh(); }
    catch(err) { toast(err.message,'error'); }
    setSave(false);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <Card style={{ padding:'14px 16px', background:C.accentSoft, border:`1px solid ${C.accent}25` }}>
        <p style={{ fontSize:13, color:C.accent, lineHeight:1.65, fontWeight:500 }}>
          <strong>🔄 Auto-reset:</strong> On the renewal date, all leave balances reset to their full amounts and the date automatically advances by 1 year.
        </p>
      </Card>
      <TInput label="Next Renewal Date" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
      {date && days!==null && (
        <Card style={{ padding:'12px 16px', background: days<=30 ? C.orangeSoft : C.greenSoft, border:`1px solid ${days<=30 ? C.orange : C.green}30` }}>
          <p style={{ fontSize:13, fontWeight:700, color: days<=30 ? C.orange : C.green }}>
            {days>0 ? `${days} days until balance reset` : days===0 ? '🔄 Reset happens today!' : `${Math.abs(days)} days overdue`}
          </p>
        </Card>
      )}
      {settings.lastResetDate && (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:C.faint, borderRadius:12 }}>
          <Icon n="refresh" size={14} color={C.muted}/>
          <p style={{ fontSize:12, color:C.muted, fontWeight:500 }}>Last reset: <strong>{fmt(settings.lastResetDate)}</strong></p>
        </div>
      )}
      <Btn full onClick={save} disabled={saved} loading={saving} style={{ marginTop:4 }}>
        {saved ? '✓ Saved' : 'Save Renewal Date'}
      </Btn>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [C, dark, toggleDark] = useTheme();
  const [authed,    setAuthed]    = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [history,    setHistory]    = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [settings,   setSettings]   = useState({});
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [tab,        setTab]        = useState('home');
  const [applyOpen,  setApplyOpen]  = useState(false);
  const [settOpen,   setSettOpen]   = useState(false);
  const [justReset,  setJustReset]  = useState(false);
  const [toast,      setToast]      = useState(null);
  const prevTab = useRef(tab);

  function showToast(msg, type='success') { setToast({ msg, type, key:uid() }); }

  useEffect(() => {
    const el = document.querySelector('meta[name="theme-color"]');
    if (el) el.setAttribute('content', dark ? '#0A0A12' : '#F0F0F5');
  }, [dark]);

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
    } catch(err) {
      if (err.message !== 'Authentication required') setError(err.message);
    }
  }

  useEffect(() => {
    api.restoreSession().then(ok => {
      if (ok) { setAuthed(true); return loadAll(); }
    }).finally(() => { setAuthReady(true); setLoading(false); });
  }, []);

  async function onLogin() { setLoading(true); await loadAll(); setLoading(false); }
  function onLogout() { setAuthed(false); }
  async function completeOnboarding(renewalDate) {
    await api.updateSettings({ onboarded:'true', contractRenewal:renewalDate||'' });
    await loadAll();
  }

  useEffect(() => { prevTab.current = tab; }, [tab]);

  if (!authReady || loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:C.bg }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:20 }}>
        <div style={{ width:56, height:56, borderRadius:18, background:C.accentGrad, display:'flex', alignItems:'center', justifyContent:'center', animation:'float 2s ease-in-out infinite', boxShadow:`0 8px 30px ${C.accentSoft}` }}>
          <Icon n="sparkle" size={26} color="#fff"/>
        </div>
        <div style={{ width:32, height:32, borderRadius:'50%', border:`3px solid ${C.accentSoft}`, borderTopColor:C.accent, animation:'spin .7s linear infinite' }}/>
      </div>
    </div>
  );

  if (!authed) return <AuthScreen onLogin={onLogin}/>;

  if (error) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:C.bg, fontFamily:"'Inter',sans-serif", padding:32, textAlign:'center', gap:16 }}>
      <span style={{ fontSize:48 }}>⚠️</span>
      <h2 style={{ fontSize:20, fontWeight:800, color:C.text, fontFamily:"'Cal Sans','Inter',sans-serif", letterSpacing:'-0.02em' }}>Connection error</h2>
      <p style={{ fontSize:13, color:C.muted, lineHeight:1.7, maxWidth:300 }}>Cannot reach the backend. Check your <code>VITE_API_URL</code> setting.</p>
      <p style={{ fontSize:11, color:C.muted, background:C.faint, padding:'8px 12px', borderRadius:8 }}>{error}</p>
      <Btn onClick={()=>{ setLoading(true); loadAll().finally(()=>setLoading(false)); }}>Retry</Btn>
    </div>
  );

  if (settings.onboarded !== 'true') return <Onboarding onDone={completeOnboarding}/>;

  const tabTitles = { home:'Overview', apply:'Apply for Leave', history:'History' };

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <style>{`
        body { background: ${C.bg}; color: ${C.text}; --cal-filter: ${dark ? 'invert(1)' : 'none'}; }
        input, select, textarea { color-scheme: ${dark ? 'dark' : 'light'}; }
      `}</style>

      {toast && <Toast key={toast.key} msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}

      <div style={{ maxWidth:480, margin:'0 auto', minHeight:'100vh', background:C.bg, fontFamily:"'Inter',sans-serif", position:'relative' }}>

        {/* Header */}
        <div style={{ padding:'calc(env(safe-area-inset-top, 44px) + 14px) 20px 0', position:'sticky', top:0, zIndex:100, background:`${C.bg}ee`, backdropFilter:'blur(20px)', borderBottom:`1px solid ${C.border}20` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:16 }}>
            <div>
              <p style={{ fontSize:12, color:C.muted, fontWeight:600, letterSpacing:'0.04em', marginBottom:4 }}>
                {new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}
              </p>
              <h1 style={{ fontSize:28, fontWeight:800, color:C.text, fontFamily:"'Cal Sans','Inter',sans-serif", lineHeight:1, letterSpacing:'-0.03em' }}>
                {tabTitles[tab]}
              </h1>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <DarkToggle dark={dark} onToggle={toggleDark}/>
              <button onClick={()=>setSettOpen(true)} style={{
                background:C.surface, border:`1px solid ${C.border}`, borderRadius:14,
                width:42, height:42, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:C.shadow, transition:'all .2s ease',
              }}>
                <Icon n="cog" size={18} color={C.textSub}/>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding:'20px 20px calc(env(safe-area-inset-bottom, 0px) + 90px)', animation:'fadeIn .3s ease' }}>
          {tab==='home'    && <HomeScreen leaveTypes={leaveTypes} settings={settings} history={history} onApply={()=>setApplyOpen(true)} justReset={justReset} onDismissReset={()=>setJustReset(false)}/>}
          {tab==='apply'   && <ApplyForm leaveTypes={leaveTypes} recipients={recipients} onClose={()=>setTab('home')} onSuccess={()=>{loadAll();setTab('home');}} toast={showToast}/>}
          {tab==='history' && <HistoryScreen leaveTypes={leaveTypes} history={history} onRefresh={loadAll} toast={showToast}/>}
        </div>

        {/* Bottom Nav */}
        <div style={{
          position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
          width:'100%', maxWidth:480,
          background:C.navBg,
          borderTop:`1px solid ${C.border}`,
          backdropFilter:'blur(20px)',
          display:'flex', padding:'10px 0 calc(env(safe-area-inset-bottom, 0px) + 10px)',
          boxShadow:`0 -8px 30px rgba(0,0,0,${dark?.15:.08})`,
          zIndex:200,
        }}>
          {[{id:'home',icon:'home',label:'Home'},{id:'apply',icon:'apply',label:'Apply'},{id:'history',icon:'hist',label:'History'}].map(({id,icon,label}) => {
            const active = tab===id;
            return (
              <button key={id} onClick={()=>setTab(id)} style={{
                flex:1, background:'none', border:'none', cursor:'pointer',
                display:'flex', flexDirection:'column', alignItems:'center', gap:5, padding:'6px 0',
                fontFamily:"'Inter',sans-serif",
                transition:'all .2s ease',
              }}>
                <div style={{
                  width:48, height:32, borderRadius:12,
                  background: active ? C.accentSoft : 'transparent',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  transition:'all .3s cubic-bezier(.34,1.56,.64,1)',
                  transform: active ? 'scale(1.1)' : 'scale(1)',
                }}>
                  <Icon n={icon} size={20} color={active ? C.accent : C.muted}/>
                </div>
                <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.04em', color: active ? C.accent : C.muted, transition:'color .2s' }}>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Apply Sheet */}
        {applyOpen && (
          <Sheet title="Apply for Leave" onClose={()=>{loadAll();setApplyOpen(false);}}>
            <ApplyForm leaveTypes={leaveTypes} recipients={recipients} onClose={()=>setApplyOpen(false)} onSuccess={()=>{loadAll();setApplyOpen(false);showToast('Leave submitted!');}} toast={showToast}/>
          </Sheet>
        )}

        {/* Settings Sheet */}
        {settOpen && (
          <SettingsModal leaveTypes={leaveTypes} recipients={recipients} settings={settings}
            onClose={()=>setSettOpen(false)} onRefresh={loadAll} onLogout={onLogout} toast={showToast}/>
        )}
      </div>
    </>
  );
}
