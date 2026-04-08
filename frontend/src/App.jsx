// src/App.jsx
import { useState, useEffect, useCallback } from 'react';
import * as api from './api.js';

// âââ Utils ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

// âââ Design tokens ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const C = {
  bg:'#F8F7F4', surface:'#FFFFFF', border:'#EDECE8', text:'#111111',
  muted:'#888888', faint:'#F2F1EE', accent:'#1A1A1A',
  viber:'#7360F2', green:'#16A34A', orange:'#EA580C', red:'#DC2626',
};
const PALETTE = ['#2563EB','#16A34A','#DC2626','#D97706','#7C3AED','#0891B2','#DB2777','#059669','#9333EA'];

// âââ Icons ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {p[n]}
    </svg>
  );
};

// âââ Primitives âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const Field = ({ label, helper, children }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
    {label && <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.07em' }}>{label}</label>}
    {children}
    {helper && <p style={{ fontSize:11, color:C.muted, marginTop:1 }}>{helper}</p>}
  </div>
);

const TInput = ({ label, helper, style:sx, ...props }) => (
  <Field label={label} helper={helper}>
    <input {...props} style={{
      border:`1.5px solid ${C.border}`, borderRadius:10, padding:'11px 14px',
      fontSize:15, background:C.faint, outline:'none',
      fontFamily:"'DM Sans',sans-serif", color:C.text, ...(sx||{})
    }}/>
  </Field>
);

const SelInput = ({ label, helper, children, ...props }) => (
  <Field label={label} helper={helper}>
    <div style={{ position:'relative' }}>
      <select {...props} style={{
        border:`1.5px solid ${C.border}`, borderRadius:10, padding:'11px 40px 11px 14px',
        fontSize:15, background:C.faint, outline:'none',
        fontFamily:"'DM Sans',sans-serif", color:C.text, appearance:'none', width:'100%',
      }}>{children}</select>
      <span style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', color:C.muted, fontSize:12 }}>â¾</span>
    </div>
  </Field>
);

const Btn = ({ children, variant='dark', full, sm, loading, style:sx, disabled, onClick }) => {
  const base = {
    border:'none', borderRadius:12, fontWeight:600, cursor:(disabled||loading)?'not-allowed':'pointer',
    fontFamily:"'DM Sans',sans-serif", display:'flex', alignItems:'center', justifyContent:'center',
    gap:7, transition:'all .15s',
    padding:sm?'9px 16px':'13px 20px', fontSize:sm?13:15,
    width:full?'100%':undefined, opacity:(disabled||loading)?0.5:1,
  };
  const v = {
    dark:  { background:C.accent, color:'#fff' },
    ghost: { background:C.faint, color:C.text, border:`1.5px solid ${C.border}` },
    danger:{ background:'#FFF0F0', color:C.red },
    viber: { background:C.viber, color:'#fff' },
  };
  return (
    <button style={{ ...base, ...v[variant], ...sx }}
      onClick={(disabled||loading)?undefined:onClick}>
      {loading ? <span style={{ animation:'spin 0.7s linear infinite', display:'inline-block' }}>â³</span> : children}
    </button>
  );
};

const Pill = ({ color, label }) => (
  <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:`${color}18`,
    color, borderRadius:99, padding:'2px 9px', fontSize:11, fontWeight:700 }}>
    <span style={{ width:5, height:5, borderRadius:'50%', background:color, display:'inline-block' }}/>
    {label}
  </span>
);

const Toast = ({ msg, type='success', onDone }) => {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, []);
  const bg = type==='error'?'#FFF0F0':'#F0FDF4';
  const cl = type==='error'?C.red:C.green;
  return (
    <div style={{ position:'fixed', top:20, left:'50%', transform:'translateX(-50%)',
      background:bg, border:`1.5px solid ${cl}40`, borderRadius:12, padding:'11px 18px',
      fontSize:13, fontWeight:600, color:cl, zIndex:999, maxWidth:340, textAlign:'center',
      boxShadow:'0 4px 20px rgba(0,0,0,.12)', animation:'fadeIn .2s ease',
      fontFamily:"'DM Sans',sans-serif", whiteSpace:'pre-line' }}>
      {msg}
    </div>
  );
};

const Sheet = ({ title, onClose, children }) => (
  <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:200,
    display:'flex', alignItems:'flex-end', justifyContent:'center' }}
    onClick={e => e.target===e.currentTarget && onClose()}>
    <div style={{ background:C.surface, borderRadius:'22px 22px 0 0', width:'100%', maxWidth:480,
      maxHeight:'92vh', overflowY:'auto', paddingBottom:40,
      boxShadow:'0 -10px 50px rgba(0,0,0,.15)', animation:'slideUp .25s cubic-bezier(.32,.72,0,1)' }}>
      <div style={{ display:'flex', justifyContent:'center', padding:'14px 0 4px' }}>
        <div style={{ width:36, height:4, borderRadius:99, background:C.border }}/>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 20px 16px' }}>
        <h2 style={{ margin:0, fontSize:19, fontWeight:700, color:C.text, fontFamily:"'Fraunces',serif" }}>{title}</h2>
        <button onClick={onClose} style={{ background:C.faint, border:'none', borderRadius:10,
          width:32, height:32, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon n="x" size={15} color={C.muted}/>
        </button>
      </div>
      <div style={{ padding:'0 20px' }}>{children}</div>
    </div>
  </div>
);

const Spinner = ({ label='Loadingâ¦' }) => (
  <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
    gap:12, padding:'60px 20px', color:C.muted, fontFamily:"'DM Sans',sans-serif" }}>
    <div style={{ width:28, height:28, border:`3px solid ${C.border}`,
      borderTopColor:C.accent, borderRadius:'50%', animation:'spin 0.7s linear infinite' }}/>
    <span style={{ fontSize:13 }}>{label}</span>
  </div>
);

// âââ Ring âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function Ring({ total, used, color, name, size=88 }) {
  const rem = Math.max(0, total-used), pct = total>0?rem/total:1;
  const r = size/2-7, circ = 2*Math.PI*r;
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:7 }}>
      <div style={{ position:'relative', width:size, height:size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.faint} strokeWidth="8"/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${circ*pct} ${circ}`} strokeLinecap="round"
            transform={`rotate(-90 ${size/2} ${size/2})`}
            style={{ transition:'stroke-dasharray .7s cubic-bezier(.4,0,.2,1)' }}/>
        </svg>
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center' }}>
          <span style={{ fontSize:17, fontWeight:800, color:C.text, lineHeight:1 }}>{rem}</span>
          <span style={{ fontSize:9, color:C.muted, fontWeight:600, letterSpacing:'0.04em' }}>/ {total}</span>
        </div>
      </div>
      <span style={{ fontSize:11, color:'#666', fontWeight:600, textAlign:'center', maxWidth:90, lineHeight:1.3 }}>{name}</span>
    </div>
  );
}

// âââ PIN / Login Screen âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function AuthScreen({ onLogin }) {
  const [view, setView] = useState('login');
  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', padding:'32px 20px',
      fontFamily:"'DM Sans',sans-serif" }}>
      {view === 'login'  && <LoginForm  onLogin={onLogin} onSwitch={setView}/>}
      {view === 'signup' && <SignupForm onLogin={onLogin} onSwitch={setView}/>}
      {view === 'forgot' && <ForgotForm onSwitch={setView}/>}
    </div>
  );
}

function AuthCard({ subtitle, children }) {
  return (
    <div style={{ width:'100%', maxWidth:360, display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:56, height:56, borderRadius:16, background:C.accent,
          display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
          <Icon n="lock" size={24} color="#fff"/>
        </div>
        <h1 style={{ fontSize:22, fontWeight:700, color:C.text,
          fontFamily:"'Fraunces',serif", margin:'0 0 5px' }}>Leave Manager</h1>
        <p style={{ fontSize:13, color:C.muted, margin:0 }}>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function AuthInput({ label, type='text', value, onChange, placeholder, autoComplete, error }) {
  const [show, setShow] = useState(false);
  const isPw = type === 'password';
  return (
    <Field label={label}>
      <div style={{ position:'relative' }}>
        <input type={isPw && show ? 'text' : type} value={value} onChange={onChange}
          placeholder={placeholder} autoComplete={autoComplete}
          style={{ border:`1.5px solid ${error?C.red:C.border}`, borderRadius:10,
            padding: isPw ? '12px 44px 12px 14px' : '12px 14px',
            fontSize:15, background:C.faint, outline:'none', width:'100%',
            fontFamily:"'DM Sans',sans-serif", color:C.text, boxSizing:'border-box' }}/>
        {isPw && (
          <button type="button" onClick={()=>setShow(s=>!s)}
            style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
              background:'none', border:'none', cursor:'pointer', padding:4 }}>
            <Icon n={show?'eyeoff':'eye'} size={16} color={C.muted}/>
          </button>
        )}
      </div>
      {error && <p style={{ fontSize:12, color:C.red, margin:'4px 0 0' }}>{error}</p>}
    </Field>
  );
}

function LoginForm({ onLogin, onSwitch }) {
  const [email, setEmail]     = useState('');
  const [pw, setPw]           = useState('');
  const [err, setErr]         = useState('');
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
    <AuthCard subtitle="Sign in to your account">
      <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <AuthInput label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)}
          placeholder="your@email.com" autoComplete="email"/>
        <AuthInput label="Password" type="password" value={pw} onChange={e=>setPw(e.target.value)}
          placeholder="Your password" autoComplete="current-password" error={err}/>
        <Btn full onClick={submit} loading={loading} style={{ borderRadius:14, padding:15, fontSize:16, marginTop:2 }}>
          Sign In <Icon n="arrow" size={16} color="#fff"/>
        </Btn>
      </form>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
        <button onClick={()=>onSwitch('forgot')} style={{ background:'none', border:'none', fontSize:13, color:C.muted, cursor:'pointer' }}>Forgot password?</button>
        <p style={{ fontSize:13, color:C.muted, margin:0 }}>No account?{' '}
          <span style={{ color:C.accent, fontWeight:600, cursor:'pointer' }} onClick={()=>onSwitch('signup')}>Sign up</span>
        </p>
      </div>
    </AuthCard>
  );
}

function SignupForm({ onLogin, onSwitch }) {
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [pw, setPw]           = useState('');
  const [pw2, setPw2]         = useState('');
  const [err, setErr]         = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(e) {
    e?.preventDefault?.(); setErr('');
    if (!email.trim() || !pw) { setErr('Email and password are required.'); return; }
    if (pw.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    if (pw !== pw2) { setErr('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await api.signup(email.trim(), pw, name.trim());
      await api.login(email.trim(), pw);
      onLogin();
    } catch(e) {
      setErr(e.message?.includes('already exists') ? 'An account with this email already exists.' : (e.message || 'Signup failed.'));
    } finally { setLoading(false); }
  }
  return (
    <AuthCard subtitle="Create your account">
      <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <AuthInput label="Name (optional)" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" autoComplete="name"/>
        <AuthInput label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email"/>
        <AuthInput label="Password" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password"/>
        <AuthInput label="Confirm Password" type="password" value={pw2} onChange={e=>setPw2(e.target.value)} placeholder="Repeat password" autoComplete="new-password" error={err}/>
        <Btn full onClick={submit} loading={loading} style={{ borderRadius:14, padding:15, fontSize:16, marginTop:2 }}>
          Create Account <Icon n="arrow" size={16} color="#fff"/>
        </Btn>
      </form>
      <p style={{ fontSize:13, color:C.muted, textAlign:'center', margin:0 }}>
        Already have an account?{' '}
        <span style={{ color:C.accent, fontWeight:600, cursor:'pointer' }} onClick={()=>onSwitch('login')}>Sign in</span>
      </p>
    </AuthCard>
  );
}

function ForgotForm({ onSwitch }) {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  async function submit(e) {
    e?.preventDefault?.();
    if (!email.trim()) return;
    setLoading(true);
    try { await api.forgotPassword(email.trim()); } catch {}
    finally { setSent(true); setLoading(false); }
  }
  return (
    <AuthCard subtitle="Reset your password">
      {sent ? (
        <div style={{ textAlign:'center', padding:'16px 0' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📧</div>
          <p style={{ color:C.text, fontWeight:600, margin:'0 0 8px' }}>Check your email</p>
          <p style={{ color:C.muted, fontSize:13, lineHeight:1.6 }}>If an account exists for {email}, a reset link has been sent.</p>
          <button onClick={()=>onSwitch('login')} style={{ marginTop:16, background:'none', border:'none', color:C.accent, fontWeight:600, fontSize:14, cursor:'pointer' }}>Back to Sign In</button>
        </div>
      ) : (
        <>
          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <AuthInput label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" autoComplete="email"/>
            <Btn full onClick={submit} loading={loading} style={{ borderRadius:14, padding:15, fontSize:16 }}>Send Reset Link</Btn>
          </form>
          <p style={{ fontSize:13, color:C.muted, textAlign:'center', margin:0 }}>
            <span style={{ color:C.accent, fontWeight:600, cursor:'pointer' }} onClick={()=>onSwitch('login')}>Back to Sign In</span>
          </p>
        </>
      )}
    </AuthCard>
  );
}

function LoginScreen({ onLogin }) {
  return <AuthScreen onLogin={onLogin}/>;
}
function Onboarding({ onDone }) {
  const [step, setStep]   = useState(0);
  const [date, setDate]   = useState('');
  const [saving, setSave] = useState(false);

  const slides = [
    { emoji:'ðï¸', title:'Track your leave,\nstay in control.',
      body:'Manage all your leave balances in one place. Know exactly how many days you have left.' },
    { emoji:'ð²', title:'Notify via Viber,\ninstantly.',
      body:'After applying for leave, the app opens Viber with a pre-filled message. One tap to send.' },
    { emoji:'ð', title:'Auto-resets on\ncontract renewal.',
      body:'Set your contract renewal date once. Every year, all balances reset automatically.' },
  ];

  if (step < 3) {
    const s = slides[step];
    return (
      <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', padding:32, fontFamily:"'DM Sans',sans-serif" }}>
        <div style={{ width:'100%', maxWidth:340, display:'flex', flexDirection:'column', gap:28, alignItems:'center' }}>
          <span style={{ fontSize:64 }}>{s.emoji}</span>
          <div style={{ textAlign:'center' }}>
            <h1 style={{ fontSize:26, fontWeight:700, color:C.text, fontFamily:"'Fraunces',serif",
              whiteSpace:'pre-line', lineHeight:1.25, margin:'0 0 12px' }}>{s.title}</h1>
            <p style={{ fontSize:15, color:'#666', lineHeight:1.7 }}>{s.body}</p>
          </div>
          <div style={{ display:'flex', gap:7 }}>
            {slides.map((_,i) => <div key={i} style={{ width:i===step?22:7, height:7, borderRadius:99,
              background:i===step?C.accent:C.border, transition:'all .3s' }}/>)}
          </div>
          <Btn full onClick={() => setStep(s=>s+1)} style={{ borderRadius:14 }}>
            {step<2?'Continue':'Set up my app'} <Icon n="arrow" size={16} color="#fff"/>
          </Btn>
          {step>0 && <button onClick={() => setStep(s=>s-1)} style={{ background:'none', border:'none',
            color:C.muted, fontSize:13, cursor:'pointer', fontFamily:"'DM Sans',sans-serif" }}>â Back</button>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', padding:32, fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ width:'100%', maxWidth:340, display:'flex', flexDirection:'column', gap:22 }}>
        <div style={{ textAlign:'center' }}>
          <span style={{ fontSize:52 }}>ð</span>
          <h1 style={{ fontSize:22, fontWeight:700, color:C.text, fontFamily:"'Fraunces',serif", margin:'12px 0 8px' }}>
            When does your contract renew?
          </h1>
          <p style={{ fontSize:14, color:'#666', lineHeight:1.65 }}>
            Balances reset to full on this date each year. Change it anytime in Settings.
          </p>
        </div>
        <TInput label="Contract Renewal Date" type="date" value={date} onChange={e => setDate(e.target.value)}/>
        <Btn full onClick={async () => { setSave(true); await onDone(date); setSave(false); }}
          loading={saving} style={{ marginTop:4, borderRadius:14 }}>
          Let's go <Icon n="arrow" size={16} color="#fff"/>
        </Btn>
        <button onClick={() => onDone('')} style={{ background:'none', border:'none', color:C.muted,
          fontSize:13, cursor:'pointer', textAlign:'center', fontFamily:"'DM Sans',sans-serif" }}>Skip for now</button>
      </div>
    </div>
  );
}

// âââ Home ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function HomeScreen({ leaveTypes, settings, history, onApply, justReset, onDismissReset }) {
  const renewal   = daysTo(settings.contractRenewal);
  const totalUsed = leaveTypes.reduce((a,l) => a+l.used, 0);
  const urgent    = renewal !== null && renewal <= 30;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {justReset && (
        <div style={{ background:'#F0FDF4', borderRadius:16, padding:'14px 16px',
          border:'1.5px solid #86EFAC', display:'flex', gap:12, alignItems:'flex-start' }}>
          <span style={{ fontSize:22, flexShrink:0 }}>ð</span>
          <div style={{ flex:1 }}>
            <p style={{ fontWeight:700, color:'#15803D', fontSize:14, marginBottom:3 }}>Leave Balance Reset!</p>
            <p style={{ fontSize:12, color:'#166534', lineHeight:1.55 }}>
              Contract renewed â all balances back to full.
              {settings.contractRenewal && ` Next reset: ${fmt(settings.contractRenewal)}.`}
            </p>
          </div>
          <button onClick={onDismissReset} style={{ background:'none', border:'none', cursor:'pointer' }}>
            <Icon n="x" size={15} color="#16A34A"/>
          </button>
        </div>
      )}

      {settings.contractRenewal ? (
        <div style={{ background:urgent?'#FFF7ED':C.surface, borderRadius:16, padding:'15px 17px',
          border:`1.5px solid ${urgent?'#FED7AA':C.border}`, display:'flex', alignItems:'center', gap:13 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:urgent?'#FFEDD5':C.faint,
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Icon n="cal" size={20} color={urgent?C.orange:'#666'}/>
          </div>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:11, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>Balance resets on</p>
            <p style={{ fontSize:15, fontWeight:700, color:urgent?C.orange:C.text }}>{fmt(settings.contractRenewal)}</p>
            <p style={{ fontSize:12, color:urgent?C.orange:C.muted, marginTop:2 }}>
              {renewal===null?'':renewal>0?`${renewal} days away`:renewal===0?'Resets today ð':`${Math.abs(renewal)} days overdue`}
            </p>
          </div>
        </div>
      ) : (
        <div style={{ background:C.surface, borderRadius:14, padding:'13px 15px',
          border:`1.5px dashed ${C.border}`, display:'flex', alignItems:'center', gap:10 }}>
          <Icon n="info" size={17} color={C.muted}/>
          <p style={{ fontSize:13, color:C.muted, lineHeight:1.5 }}>
            Set a renewal date in <strong>Settings â Contract</strong> to enable auto-reset.
          </p>
        </div>
      )}

      <div style={{ background:C.surface, borderRadius:20, padding:'18px 16px', border:`1.5px solid ${C.border}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <h2 style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.07em', margin:0 }}>Leave Balances</h2>
          {totalUsed > 0 && <span style={{ fontSize:11, color:C.muted }}>{totalUsed} day{totalUsed!==1?'s':''} used</span>}
        </div>
        {leaveTypes.length === 0
          ? <p style={{ color:C.muted, fontSize:13, textAlign:'center', padding:'10px 0' }}>Add leave types in Settings.</p>
          : <div style={{ display:'flex', flexWrap:'wrap', gap:16, justifyContent:'space-around' }}>
              {leaveTypes.map(lt => <Ring key={lt.id} name={lt.name} total={lt.total} used={lt.used} color={lt.color}/>)}
            </div>
        }
      </div>

      <Btn full onClick={onApply} style={{ padding:'16px', fontSize:16, borderRadius:16 }}>
        <Icon n="plus" size={20} color="#fff"/> Apply for Leave
      </Btn>

      {history.length > 0 && (
        <div>
          <h2 style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>Recent Leaves</h2>
          {history.slice(0,3).map(h => <HistoryRow key={h.id} item={h}/>)}
        </div>
      )}
    </div>
  );
}

// âââ History Row ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function HistoryRow({ item, onDelete }) {
  const color = item.typeColor || item.type_color;
  const name  = item.typeName  || item.type_name;
  const sd    = item.startDate || item.start_date;
  const ed    = item.endDate   || item.end_date;
  return (
    <div style={{ background:C.surface, borderRadius:14, padding:'13px 15px',
      border:`1.5px solid ${C.border}`, marginBottom:9, display:'flex', alignItems:'center', gap:12 }}>
      <div style={{ width:40, height:40, borderRadius:11, background:`${color}15`,
        display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <Icon n="cal" size={18} color={color}/>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:3 }}>
          <span style={{ fontWeight:700, fontSize:14, color:C.text }}>{name}</span>
          <Pill color={color} label={`${item.days}d`}/>
        </div>
        <p style={{ fontSize:12, color:C.muted }}>{fmt(sd)}{sd!==ed?` â ${fmt(ed)}`:''}</p>
        {item.reason && <p style={{ fontSize:11, color:'#aaa', marginTop:2, fontStyle:'italic',
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>"{item.reason}"</p>}
      </div>
      {onDelete && (
        <button onClick={() => onDelete(item.id)} style={{ background:'none', border:'none',
          cursor:'pointer', padding:'4px 6px', borderRadius:8, flexShrink:0 }}>
          <Icon n="trash" size={16} color="#CCC"/>
        </button>
      )}
    </div>
  );
}

// âââ Apply Form âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function ApplyForm({ leaveTypes, recipients, onClose, onSuccess }) {
  const t = today();
  const [form, setForm]   = useState({ typeId:leaveTypes[0]?.id||'', start:t, end:t, reason:'' });
  const [sub, setSub]     = useState(false);
  const [links, setLinks] = useState(null);
  const [entry, setEntry] = useState(null);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  const sel    = leaveTypes.find(l=>l.id===form.typeId);
  const days   = form.start&&form.end ? weekdays(form.start,form.end) : 0;
  const remain = sel ? sel.total-sel.used : 0;
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
      onSuccess();
    } catch (err) { alert(err.message); }
    finally { setSub(false); }
  }

  if (leaveTypes.length === 0) return (
    <p style={{ textAlign:'center', color:C.muted, fontSize:14, lineHeight:1.7, padding:'20px 0' }}>
      No leave types configured.<br/>Go to <strong>Settings â Leave Types</strong>.
    </p>
  );

  if (entry && links !== null) {
    const sd = entry.startDate||entry.start_date, ed = entry.endDate||entry.end_date;
    return (
      <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div style={{ background:'#F0FDF4', borderRadius:14, padding:'14px 16px',
          border:'1.5px solid #86EFAC', display:'flex', gap:12, alignItems:'center' }}>
          <Icon n="check" size={22} color={C.green}/>
          <div>
            <p style={{ fontWeight:700, color:'#15803D', fontSize:14 }}>Leave Submitted!</p>
            <p style={{ color:'#166534', fontSize:12, marginTop:2 }}>
              {entry.typeName||entry.type_name} Â· {entry.days} day{entry.days>1?'s':''} Â· {fmt(sd)}{sd!==ed?` â ${fmt(ed)}`:''}
            </p>
          </div>
        </div>

        {links.length > 0 ? (
          <>
            <div style={{ background:C.faint, borderRadius:12, padding:'11px 14px' }}>
              <p style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:6 }}>Message preview</p>
              <p style={{ fontSize:13, color:'#444', lineHeight:1.6 }}>{links[0].messagePreview}</p>
            </div>
            <p style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.06em' }}>Notify via Viber</p>
            {links.map(lk => (
              <a key={lk.id} href={lk.viberUrl} style={{ textDecoration:'none', display:'block' }}>
                <div style={{ background:'#F5F3FF', border:'1.5px solid #DDD6FE', borderRadius:14,
                  padding:'13px 16px', display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:40, height:40, borderRadius:11, background:C.viber,
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon n="viber" size={18} color="#fff"/>
                  </div>
                  <div style={{ flex:1 }}>
                    <p style={{ fontWeight:700, color:C.viber, fontSize:14 }}>{lk.recipientName}</p>
                    <p style={{ fontSize:12, color:'#888' }}>{lk.phone}</p>
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color:C.viber }}>Open â</span>
                </div>
              </a>
            ))}
          </>
        ) : (
          <div style={{ background:C.faint, borderRadius:12, padding:'13px 16px',
            border:`1.5px dashed ${C.border}`, textAlign:'center' }}>
            <p style={{ fontSize:13, color:C.muted, lineHeight:1.6 }}>
              No Viber recipients yet.<br/>Add them in <strong>Settings â Viber</strong>.
            </p>
          </div>
        )}
        <Btn full variant="ghost" onClick={onClose} style={{ marginTop:4 }}>Done</Btn>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <SelInput label="Leave Type" value={form.typeId} onChange={e=>set('typeId',e.target.value)}>
        {leaveTypes.map(l => <option key={l.id} value={l.id}>{l.name} â {l.total-l.used} day{l.total-l.used!==1?'s':''} remaining</option>)}
      </SelInput>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <TInput label="Start Date" type="date" value={form.start} min={t}
          onChange={e=>{set('start',e.target.value);if(e.target.value>form.end)set('end',e.target.value);}}/>
        <TInput label="End Date" type="date" value={form.end} min={form.start}
          onChange={e=>set('end',e.target.value)}/>
      </div>
      {days>0 && (
        <div style={{ borderRadius:11, padding:'11px 14px', background:over?'#FFF0F0':'#F0F9FF',
          border:`1.5px solid ${over?'#FECACA':'#BAE6FD'}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:14, fontWeight:700, color:over?C.red:'#0369A1' }}>{days} working day{days!==1?'s':''}</span>
          {over && <span style={{ fontSize:12, color:C.red, fontWeight:600 }}>Only {remain} day{remain!==1?'s':''} left</span>}
        </div>
      )}
      <TInput label="Reason (optional)" type="text" value={form.reason}
        placeholder="e.g. Family vacation, medicalâ¦" onChange={e=>set('reason',e.target.value)}/>
      <Btn full onClick={submit} disabled={days<=0||over} loading={sub}
        style={{ marginTop:4, padding:16, fontSize:16, borderRadius:14 }}>
        Submit Leave
      </Btn>
    </div>
  );
}

// âââ History Screen âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function HistoryScreen({ leaveTypes, history, onRefresh, toast }) {
  const [filter, setFilter]   = useState('all');
  const [deleting, setDel]    = useState(null);

  async function cancel(id) {
    setDel(id);
    try { await api.cancelLeave(id); toast('Leave cancelled â balance restored.'); onRefresh(); }
    catch (err) { toast(err.message, 'error'); }
    finally { setDel(null); }
  }

  const filtered = filter==='all' ? history : history.filter(h=>(h.leaveTypeId||h.leave_type_id)===filter);

  if (history.length === 0) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
      gap:14, padding:'60px 20px', color:C.muted, textAlign:'center' }}>
      <Icon n="hist" size={40} color={C.border}/>
      <p style={{ fontSize:14, lineHeight:1.7 }}>No leave history yet.<br/>Apply for leave to see it here.</p>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ background:C.surface, borderRadius:16, padding:'15px 16px', border:`1.5px solid ${C.border}` }}>
        <p style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:12 }}>Period Summary</p>
        {leaveTypes.map(lt => (
          <div key={lt.id} style={{ marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
              <span style={{ fontSize:12, fontWeight:600, color:'#555' }}>{lt.name}</span>
              <span style={{ fontSize:12, fontWeight:700, color:lt.color }}>{lt.used} / {lt.total} days</span>
            </div>
            <div style={{ height:6, borderRadius:99, background:C.faint, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:99, background:lt.color,
                width:`${lt.total>0?Math.min(100,(lt.used/lt.total)*100):0}%`, transition:'width .6s ease' }}/>
            </div>
          </div>
        ))}
      </div>

      {leaveTypes.length>1 && (
        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2 }}>
          {['all',...leaveTypes.map(l=>l.id)].map(t => {
            const lt = leaveTypes.find(l=>l.id===t);
            const active = filter===t;
            return <button key={t} onClick={()=>setFilter(t)} style={{
              border:`1.5px solid ${active?C.accent:C.border}`, background:active?C.accent:C.surface,
              color:active?'#fff':C.muted, borderRadius:99, padding:'6px 14px', fontSize:12, fontWeight:600,
              cursor:'pointer', flexShrink:0, fontFamily:"'DM Sans',sans-serif", transition:'all .15s',
            }}>{t==='all'?'All':lt?.name||t}</button>;
          })}
        </div>
      )}

      <p style={{ fontSize:12, color:C.muted }}>Tap ð to cancel a leave and restore the balance.</p>
      {filtered.length===0
        ? <p style={{ textAlign:'center', color:C.muted, fontSize:13, padding:'20px 0' }}>No entries for this type.</p>
        : filtered.map(h => <HistoryRow key={h.id} item={h} onDelete={deleting===h.id?null:cancel}/>)
      }
    </div>
  );
}

// âââ Settings âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function AccountTab({ onClose, onLogout, toast }) {
  const [loading, setLoading] = useState(false);
  async function handleLogout() {
    setLoading(true);
    try { await api.logout(); onLogout(); onClose(); }
    catch { toast('Sign out failed', 'error'); }
    finally { setLoading(false); }
  }
  return (
    <div style={{ paddingBottom:16 }}>
      <p style={{ fontSize:13, color:C.muted, lineHeight:1.6, margin:'0 0 20px' }}>
        You are signed in. Sessions last 30 days across all your devices.
      </p>
      <Btn full variant="danger" onClick={handleLogout} loading={loading}
        style={{ borderRadius:14, padding:14, fontSize:15 }}>
        Sign Out
      </Btn>
      <p style={{ fontSize:11, color:C.muted, textAlign:'center', marginTop:8, lineHeight:1.5 }}>
        Signs you out of this device only.
      </p>
    </div>
  );
}

function SettingsModal({ leaveTypes, recipients, settings, onClose, onRefresh, onLogout, toast }) {
  const [tab, setTab] = useState('leaves');
  return (
    <Sheet title="Settings" onClose={onClose}>
      <div style={{ display:'flex', background:C.faint, borderRadius:13, padding:4, marginBottom:22, gap:3 }}>
        {[['leaves','ð¿','Leaves'],['recipients','ð²','Viber'],['contract','ð','Contract']].map(([id,em,label]) => (
          <button key={id} onClick={()=>setTab(id)} style={{ flex:1, padding:'9px 4px', border:'none', borderRadius:11,
            fontWeight:600, fontSize:12, cursor:'pointer', fontFamily:"'DM Sans',sans-serif",
            background:tab===id?C.surface:'transparent', color:tab===id?C.text:C.muted,
            boxShadow:tab===id?'0 1px 5px rgba(0,0,0,.09)':'none', transition:'all .15s' }}>
            {em} {label}
          </button>
        ))}
      </div>
      {tab==='leaves'     && <LeaveTypesTab  leaveTypes={leaveTypes} onRefresh={onRefresh} toast={toast}/>}
      {tab==='recipients' && <RecipientsTab  recipients={recipients} onRefresh={onRefresh} toast={toast}/>}
      {tab==='contract'   && <ContractTab    settings={settings}    onRefresh={onRefresh} toast={toast}/>}
      {tab==='account'    && <AccountTab onClose={onClose} onLogout={onLogout} toast={toast}/>}
      {tab==='account'    && <AccountTab onClose={onClose} onLogout={onLogout} toast={toast}/>}
    </Sheet>
  );
}

function LeaveTypesTab({ leaveTypes, onRefresh, toast }) {
  const [adding, setAdding]   = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState({ name:'', total:14, color:PALETTE[2] });
  const [saving, setSaving]   = useState(false);

  async function add() {
    if (!form.name.trim()) return;
    setSaving(true);
    try { await api.addLeaveType({ name:form.name.trim(), total:Number(form.total), color:form.color }); toast('Leave type added!'); onRefresh(); setAdding(false); setForm({ name:'', total:14, color:PALETTE[2] }); }
    catch (err) { toast(err.message, 'error'); }
    setSaving(false);
  }
  async function saveEdit() {
    setSaving(true);
    try { await api.updateLeaveType(editing.id, { name:editing.name, total:Number(editing.total), color:editing.color }); toast('Saved!'); onRefresh(); setEditing(null); }
    catch (err) { toast(err.message, 'error'); }
    setSaving(false);
  }
  async function remove(id) {
    try { await api.deleteLeaveType(id); toast('Leave type removed.'); onRefresh(); }
    catch (err) { toast(err.message, 'error'); }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      {leaveTypes.map(lt => (
        <div key={lt.id} style={{ background:C.faint, borderRadius:13, padding:'13px 14px', border:`1.5px solid ${C.border}` }}>
          {editing?.id===lt.id ? (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <TInput label="Name" value={editing.name} onChange={e=>setEditing(p=>({...p,name:e.target.value}))}/>
              <TInput label="Total days / year" type="number" min="1" value={editing.total} onChange={e=>setEditing(p=>({...p,total:e.target.value}))}/>
              <div>
                <p style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>Color</p>
                <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                  {PALETTE.map(c=><button key={c} onClick={()=>setEditing(p=>({...p,color:c}))} style={{ width:28,height:28,borderRadius:'50%',background:c,cursor:'pointer',border:editing.color===c?'3px solid #111':'3px solid transparent' }}/>)}
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <Btn variant="ghost" sm style={{ flex:1 }} onClick={()=>setEditing(null)}>Cancel</Btn>
                <Btn sm style={{ flex:1 }} onClick={saveEdit} loading={saving}>Save</Btn>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:14,height:14,borderRadius:'50%',background:lt.color,flexShrink:0 }}/>
                <span style={{ flex:1, fontWeight:700, fontSize:14, color:C.text }}>{lt.name}</span>
                <button onClick={()=>setEditing({id:lt.id,name:lt.name,total:lt.total,color:lt.color})} style={{ background:'none',border:'none',cursor:'pointer',padding:'3px 5px' }}><Icon n="edit" size={15} color="#bbb"/></button>
                <button onClick={()=>remove(lt.id)} style={{ background:'none',border:'none',cursor:'pointer',padding:'3px 5px' }}><Icon n="trash" size={15} color="#ccc"/></button>
              </div>
              <div style={{ display:'flex', gap:14, marginTop:8, marginLeft:24 }}>
                <span style={{ fontSize:12, color:C.muted }}>Total: <b style={{color:C.text}}>{lt.total}d</b></span>
                <span style={{ fontSize:12, color:C.muted }}>Used: <b style={{color:lt.color}}>{lt.used}d</b></span>
                <span style={{ fontSize:12, color:C.muted }}>Left: <b style={{color:C.text}}>{Math.max(0,lt.total-lt.used)}d</b></span>
              </div>
              <div style={{ height:4,borderRadius:99,background:'#eee',marginTop:8,marginLeft:24,overflow:'hidden' }}>
                <div style={{ height:'100%',borderRadius:99,background:lt.color,width:`${lt.total>0?Math.min(100,(lt.used/lt.total)*100):0}%`,transition:'width .5s' }}/>
              </div>
            </>
          )}
        </div>
      ))}
      {adding ? (
        <div style={{ background:'#F0F9FF',borderRadius:13,padding:14,border:'1.5px solid #BAE6FD',display:'flex',flexDirection:'column',gap:12 }}>
          <TInput label="Leave Type Name" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Study Leave, Maternityâ¦"/>
          <TInput label="Total Days / Year" type="number" min="1" value={form.total} onChange={e=>setForm(p=>({...p,total:e.target.value}))}/>
          <div>
            <p style={{ fontSize:11,fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8 }}>Color</p>
            <div style={{ display:'flex',gap:7,flexWrap:'wrap' }}>
              {PALETTE.map(c=><button key={c} onClick={()=>setForm(p=>({...p,color:c}))} style={{ width:30,height:30,borderRadius:'50%',background:c,cursor:'pointer',border:form.color===c?'3px solid #111':'3px solid transparent' }}/>)}
            </div>
          </div>
          <div style={{ display:'flex',gap:8 }}>
            <Btn variant="ghost" sm style={{ flex:1 }} onClick={()=>setAdding(false)}>Cancel</Btn>
            <Btn sm style={{ flex:1 }} onClick={add} loading={saving}>Add</Btn>
          </div>
        </div>
      ) : (
        <Btn variant="ghost" full onClick={()=>setAdding(true)}><Icon n="plus" size={16}/> Add Leave Type</Btn>
      )}
    </div>
  );
}

function RecipientsTab({ recipients, onRefresh, toast }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm]     = useState({ name:'', phone:'' });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(p=>({...p,[k]:v}));

  async function add() {
    if (!form.name.trim()||!form.phone.trim()) return;
    setSaving(true);
    try { await api.addRecipient({ name:form.name.trim(), phone:form.phone.trim() }); toast('Recipient added!'); onRefresh(); setForm({name:'',phone:''}); setAdding(false); }
    catch (err) { toast(err.message,'error'); }
    setSaving(false);
  }
  async function remove(id) {
    try { await api.deleteRecipient(id); toast('Recipient removed.'); onRefresh(); }
    catch (err) { toast(err.message,'error'); }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ background:'#F5F3FF',borderRadius:12,padding:'12px 14px',border:'1.5px solid #DDD6FE' }}>
        <p style={{ fontSize:12,color:'#6D28D9',lineHeight:1.65 }}>ð² After applying for leave, the app opens Viber with a pre-filled message. One tap to send.</p>
      </div>
      {recipients.length===0&&!adding&&<p style={{ fontSize:13,color:C.muted,textAlign:'center',padding:'10px 0' }}>No contacts yet. Add your manager or HR.</p>}
      {recipients.map(r=>(
        <div key={r.id} style={{ background:C.faint,borderRadius:13,padding:'12px 14px',border:`1.5px solid ${C.border}`,display:'flex',alignItems:'center',gap:12 }}>
          <div style={{ width:40,height:40,borderRadius:11,background:'#EDE9FE',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}><Icon n="user" size={18} color={C.viber}/></div>
          <div style={{ flex:1 }}>
            <p style={{ fontWeight:700,fontSize:14,color:C.text }}>{r.name}</p>
            <p style={{ fontSize:12,color:C.muted,marginTop:1 }}>{r.phone}</p>
          </div>
          <button onClick={()=>remove(r.id)} style={{ background:'none',border:'none',cursor:'pointer',padding:'4px 6px' }}><Icon n="trash" size={16} color="#ccc"/></button>
        </div>
      ))}
      {adding ? (
        <div style={{ background:'#F5F3FF',borderRadius:13,padding:14,border:'1.5px solid #DDD6FE',display:'flex',flexDirection:'column',gap:12 }}>
          <TInput label="Contact Name" value={form.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Manager, HR"/>
          <TInput label="Phone (with country code)" type="tel" value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+960 7XX XXXX" helper="Must include country code for Viber deep-link."/>
          <div style={{ display:'flex',gap:8 }}>
            <Btn variant="ghost" sm style={{ flex:1 }} onClick={()=>setAdding(false)}>Cancel</Btn>
            <Btn variant="viber" sm style={{ flex:1 }} onClick={add} loading={saving}><Icon n="viber" size={15} color="#fff"/> Add</Btn>
          </div>
        </div>
      ) : (
        <Btn variant="ghost" full onClick={()=>setAdding(true)}><Icon n="plus" size={16}/> Add Viber Contact</Btn>
      )}
    </div>
  );
}

function ContractTab({ settings, onRefresh, toast }) {
  const [date, setDate] = useState(settings.contractRenewal||'');
  const [saving, setSave] = useState(false);
  const saved = date===(settings.contractRenewal||'');
  const days  = daysTo(date);

  async function save() {
    setSave(true);
    try { await api.updateSettings({ contractRenewal:date }); toast('Contract date saved!'); onRefresh(); }
    catch (err) { toast(err.message,'error'); }
    setSave(false);
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ background:'#F0F9FF',borderRadius:12,padding:'13px 14px',border:'1.5px solid #BAE6FD' }}>
        <p style={{ fontSize:13,color:'#0369A1',lineHeight:1.65 }}>
          <strong>ð Auto-reset:</strong> On the renewal date, all leave balances reset to their full amounts and the date automatically advances by 1 year.
        </p>
      </div>
      <TInput label="Next Renewal Date" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
      {date&&days!==null&&(
        <div style={{ borderRadius:11,padding:'11px 14px',background:days<=30?'#FFF7ED':'#F0FDF4',border:`1.5px solid ${days<=30?'#FED7AA':'#BBF7D0'}` }}>
          <p style={{ fontSize:13,fontWeight:700,color:days<=30?C.orange:C.green }}>
            {days>0?`${days} days until balance reset`:days===0?'ð Reset happens today!':`${Math.abs(days)} days overdue`}
          </p>
        </div>
      )}
      {settings.lastResetDate&&(
        <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 14px',background:C.faint,borderRadius:11 }}>
          <Icon n="refresh" size={14} color={C.muted}/>
          <p style={{ fontSize:12,color:C.muted }}>Last reset: <strong>{fmt(settings.lastResetDate)}</strong></p>
        </div>
      )}
      <Btn full onClick={save} disabled={saved} loading={saving} style={{ marginTop:4 }}>
        {saved?'â Saved':'Save Renewal Date'}
      </Btn>
    </div>
  );
}

// âââ Root âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export default function App() {
  const [authed,    setAuthed]    = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    api.restoreSession().then(ok => { if (ok) setAuthed(true); }).finally(() => setAuthReady(true));
  }, []);
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

  function showToast(msg, type='success') { setToast({ msg, type, key:uid() }); }

  // Listen for 401 events dispatched by api.js
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
    loadAll().finally(() => setLoading(false));
  }, []);

  async function onLogin() {
    setLoading(true);
    await loadAll();
    setLoading(false);
  }

  async function completeOnboarding(renewalDate) {
    await api.updateSettings({ onboarded:'true', contractRenewal:renewalDate||'' });
    await loadAll();
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
      height:'100vh', background:C.bg }}>
      <Spinner label="Loadingâ¦"/>
    </div>
  );


  async function onLogout() {
    setAuthed(false);
  }
  async function onLogout() { setAuthed(false); }

  if (!authReady) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <Spinner label="Loading…"/>
    </div>
  );
  if (!authed) return <LoginScreen onLogin={onLogin}/>;

  if (error) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      height:'100vh', background:C.bg, fontFamily:"'DM Sans',sans-serif", padding:32, textAlign:'center', gap:16 }}>
      <span style={{ fontSize:48 }}>â ï¸</span>
      <h2 style={{ fontSize:18, fontWeight:700, color:C.text, fontFamily:"'Fraunces',serif" }}>Connection error</h2>
      <p style={{ fontSize:13, color:C.muted, lineHeight:1.7, maxWidth:300 }}>
        Cannot reach the backend. Check your <code>VITE_API_URL</code> setting.
      </p>
      <p style={{ fontSize:11, color:C.muted, background:C.faint, padding:'8px 12px', borderRadius:8 }}>{error}</p>
      <Btn onClick={() => { setLoading(true); loadAll().finally(()=>setLoading(false)); }}>Retry</Btn>
    </div>
  );

  if (settings.onboarded !== 'true') return <Onboarding onDone={completeOnboarding}/>;

  const tabTitle = tab==='home'?'Overview':tab==='apply'?'Apply for Leave':'History';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,700;1,400&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
        body{background:${C.bg};overscroll-behavior:none;}
        input,select,button{font-family:'DM Sans',sans-serif;}
        @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        input[type=date]::-webkit-calendar-picker-indicator{opacity:.4;cursor:pointer;}
        ::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:#ddd;border-radius:3px;}
        button:active{opacity:.75;} a:active{opacity:.75;}
      `}</style>

      {toast && <Toast key={toast.key} msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}

      <div style={{ maxWidth:480, margin:'0 auto', minHeight:'100vh', background:C.bg, fontFamily:"'DM Sans',sans-serif" }}>
        <div style={{ padding:'52px 20px 0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
            <div>
              <p style={{ fontSize:12, color:C.muted, fontWeight:600, letterSpacing:'0.04em', marginBottom:4 }}>
                {new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
              </p>
              <h1 style={{ fontSize:26, fontWeight:700, color:C.text, fontFamily:"'Fraunces',serif", lineHeight:1.1 }}>{tabTitle}</h1>
            </div>
            <button onClick={()=>setSettOpen(true)} style={{ background:C.surface, border:`1.5px solid ${C.border}`, borderRadius:14,
              padding:'10px 14px', cursor:'pointer', boxShadow:'0 1px 8px rgba(0,0,0,.07)',
              display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
              <Icon n="cog" size={18} color="#666"/>
            </button>
          </div>
        </div>

        <div style={{ padding:'18px 20px 100px' }}>
          {tab==='home' && <HomeScreen leaveTypes={leaveTypes} settings={settings} history={history} onApply={()=>setApplyOpen(true)} justReset={justReset} onDismissReset={()=>setJustReset(false)}/>}
          {tab==='apply' && <ApplyForm leaveTypes={leaveTypes} recipients={recipients} onClose={()=>setTab('home')} onSuccess={()=>{loadAll();setTab('home');}}/>}
          {tab==='history' && <HistoryScreen leaveTypes={leaveTypes} history={history} onRefresh={loadAll} toast={showToast}/>}
        </div>

        <div style={{ position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
          width:'100%', maxWidth:480, background:C.surface, borderTop:`1px solid ${C.border}`,
          display:'flex', padding:'8px 0 22px', boxShadow:'0 -4px 20px rgba(0,0,0,.06)' }}>
          {[{id:'home',icon:'home',label:'Home'},{id:'apply',icon:'apply',label:'Apply'},{id:'history',icon:'hist',label:'History'}]
            .map(({id,icon,label}) => (
            <button key={id} onClick={()=>setTab(id)} style={{ flex:1,background:'none',border:'none',cursor:'pointer',
              display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'6px 0' }}>
              <div style={{ width:44,height:32,borderRadius:11,background:tab===id?C.faint:'transparent',
                display:'flex',alignItems:'center',justifyContent:'center',transition:'background .2s' }}>
                <Icon n={icon} size={20} color={tab===id?C.text:'#C0BDB6'}/>
              </div>
              <span style={{ fontSize:10,fontWeight:700,letterSpacing:'0.04em',color:tab===id?C.text:'#C0BDB6' }}>{label}</span>
            </button>
          ))}
        </div>

        {applyOpen && <Sheet title="Apply for Leave" onClose={()=>setApplyOpen(false)}>
          <ApplyForm leaveTypes={leaveTypes} recipients={recipients} onClose={()=>setApplyOpen(false)} onSuccess={()=>{loadAll();setApplyOpen(false);showToast('Leave submitted!');}}/>
        </Sheet>}

        {settOpen && <SettingsModal leaveTypes={leaveTypes} recipients={recipients} settings={settings}
          onClose={()=>setSettOpen(false)} onRefresh={loadAll} toast={showToast}/>}
      </div>
    </>
  );
}
