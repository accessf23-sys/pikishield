import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PikiLogo from '../components/PikiLogo';
import AuthTabs from '../components/AuthTabs';
import { clearCache } from '../utils/pageCache';
import { RegisterPanel } from './RegisterPage';

// Plans shown on the sign-in screen. Keep in sync with the Terms and Conditions.
const PLANS = [
  ['Bail', 'KES 20 / day', 'Bail up to KES 20,000'],
  ['Bail + Income Stipend', 'KES 40 / day', 'Bail up to KES 20,000 and stipend up to KES 15,000'],
  ['Funeral', 'KES 15 / day', 'Up to KES 200,000'],
];

function Helmet() {
  return (
    <svg viewBox="0 0 320 300" width="100%" style={{ maxWidth: 380, display: 'block', margin: '0 auto' }} aria-hidden="true">
      <ellipse cx="160" cy="276" rx="110" ry="14" fill="rgba(0,0,0,.18)" />
      <path d="M40 170 C40 90 95 38 165 38 C235 38 282 94 282 168 L282 214 C282 232 270 244 252 244 L110 244 C70 244 40 214 40 170 Z" fill="#FDC703" />
      <path d="M62 150 C66 92 108 54 165 54 C214 54 252 86 262 132 C220 118 120 116 62 150 Z" fill="#FFE066" opacity=".75" />
      <path d="M112 150 L270 150 C278 150 282 156 282 164 L282 196 C282 206 274 212 264 212 L150 212 C124 212 108 190 108 170 C108 158 108 150 112 150 Z" fill="#12243F" />
      <path d="M128 162 C170 156 224 156 262 162" stroke="rgba(255,255,255,.35)" strokeWidth="6" strokeLinecap="round" fill="none" />
      <rect x="150" y="30" width="30" height="16" rx="8" fill="#0F7B5C" />
      <path d="M60 218 L60 236 C60 246 70 250 80 250 L110 250 L110 232 Z" fill="#0F7B5C" />
      <circle cx="205" cy="104" r="6" fill="#fff" opacity=".7" />
    </svg>
  );
}

function Landing({ onLogin, onRegister }) {
  const pill = (bg, color, shadow) => ({
    width: '100%', border: 'none', borderRadius: 999, padding: '15px 20px', fontSize: 16, fontWeight: 800,
    background: bg, color, cursor: 'pointer', boxShadow: `0 5px 0 ${shadow}`, marginBottom: 14,
  });
  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg,#0B3A5B 0%,#0E6E7E 55%,#12A39A 100%)' }}>
      <div style={{ position: 'absolute', top: 70, left: 20, width: 46, height: 46, borderRadius: '50%', background: '#FDC703', border: '4px solid #E0AE00', opacity: .9 }} />
      <div style={{ position: 'absolute', top: 150, right: 22, width: 30, height: 30, borderRadius: '50%', background: '#FDC703', border: '3px solid #E0AE00', opacity: .8 }} />
      <div style={{ position: 'absolute', top: 300, left: 40, width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,.35)' }} />
      <div style={{ position: 'absolute', top: 90, right: '38%', width: 14, height: 14, borderRadius: '50%', background: 'rgba(255,255,255,.4)' }} />

      <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px' }}>
        <PikiLogo size={34} textSize={17} light />
        <button onClick={onLogin} style={{ background: '#FDC703', color: '#0B1F3A', border: 'none', borderRadius: 999, padding: '8px 18px', fontWeight: 800, fontSize: 13, cursor: 'pointer', boxShadow: '0 3px 0 #C99C00' }}>Sign in</button>
      </div>

      <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px 120px', textAlign: 'center' }}>
        <div style={{ width: '100%', maxWidth: 320, marginBottom: 10 }}><Helmet /></div>
        <h1 style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#FDC703', fontSize: 'clamp(30px,8vw,46px)', lineHeight: 1.1, fontWeight: 800, margin: '6px 0 10px' }}>
          Ride safe.<br />Stay covered.
        </h1>
        <p style={{ color: 'rgba(255,255,255,.92)', fontSize: 15, lineHeight: 1.5, maxWidth: 320, margin: '0 0 22px' }}>
          Bail, income and funeral cover for riders and families, from a few shillings a day.
        </p>
        <div style={{ width: '100%', maxWidth: 320 }}>
          <button onClick={onRegister} style={pill('#1FA971', '#fff', '#12724B')}>Create account</button>
          <button onClick={onLogin} style={pill('#FDC703', '#0B1F3A', '#C99C00')}>Sign in</button>
        </div>
      </div>

      <svg viewBox="0 0 1440 120" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: 90, zIndex: 1 }} aria-hidden="true">
        <path d="M0 60 C240 10 480 110 720 60 C960 10 1200 110 1440 60 L1440 120 L0 120 Z" fill="#FFF6DD" />
      </svg>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 14, zIndex: 2, textAlign: 'center', fontSize: 11, color: '#6B5B2A' }}>
        A product of CAD-Kenya
      </div>
    </div>
  );
}

export default function LoginPage({ initialMode = 'login' }) {
  const startMode = initialMode === 'login' ? 'landing' : initialMode;
  const [mode, setMode] = useState(startMode);
  useEffect(() => { setMode(startMode); }, [startMode]);
  // Phone Back button: from the sign-in / create-account card go back to the start screen first.
  useEffect(() => {
    const onPop = () => setMode(m => (m === 'login' || m === 'register' ? 'landing' : m));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  useEffect(() => {
    if (mode === 'login' || mode === 'register') {
      try { window.history.pushState({ pikiAuth: mode }, ''); } catch (e) {}
    }
  }, [mode === 'landing']); // eslint-disable-line react-hooks/exhaustive-deps
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const doLogin = async (identifier, pw) => {
    clearCache(); // never show a previous user's saved data
    setError('');
    setLoading(true);
    try {
      const res = await login(identifier, pw);
      const user = res?.user;
      if (!user) throw new Error('User data missing from response');
      const routes = {
        admin: '/admin',
        superadmin: '/admin',
        agent: '/agent',
        member: '/member-dashboard',
        nok: '/claims'
      };
      navigate(routes[user.role] || '/dashboard', { replace: true }); // replace: Back must not return to the login page
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'landing') return <Landing onLogin={() => setMode('login')} onRegister={() => setMode('register')} />;

  return (
    <div className="float-auth">
      <style>{`
        .float-auth{min-height:100vh;position:relative;overflow:hidden;background:#0B1F3A;display:flex;align-items:center;justify-content:center;padding:28px 16px}
        .float-auth::before{content:'';position:absolute;inset:0;background:radial-gradient(900px 500px at 15% 10%,rgba(15,123,92,.35),transparent 60%),radial-gradient(700px 500px at 90% 95%,rgba(176,138,62,.22),transparent 60%);pointer-events:none}
        .float-bike{position:absolute;right:-120px;bottom:-60px;width:760px;max-width:80vw;opacity:.05;pointer-events:none}
        .float-wrap{position:relative;z-index:1;width:100%;max-width:1120px;display:flex;align-items:center;justify-content:space-between;gap:48px}
        .float-info{flex:1;min-width:0;color:#fff}
        .float-card{width:100%;max-width:430px;box-sizing:border-box;height:540px;max-height:92vh;display:flex;flex-direction:column;background:#fff;border-radius:12px;padding:22px 26px 18px;box-shadow:0 30px 80px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.06);border-top:3px solid #FFC907}
        .float-scroll{flex:1;min-height:0;overflow-y:auto;padding:2px 8px 2px 2px;scrollbar-width:thin}
        .float-card .form-input{padding:9px 12px;font-size:13px}
        .float-card .form-label{font-size:12px}
        .float-card .form-group{margin-bottom:11px}
        .float-card .btn-lg{padding:11px 16px;font-size:14px}
        .mobile-only-logo{display:none}
        .float-card .auth-form-inner{max-width:none;padding:0;display:flex;flex-direction:column;flex:1;min-height:0}
        @media (max-width:900px){.float-card{height:auto!important;max-height:none!important}.float-scroll{overflow:visible!important;padding:2px!important}.float-auth{align-items:flex-start;padding-top:36px}.float-info{display:none}.mobile-only-logo{display:block!important}.float-wrap{justify-content:center}.float-card{padding:24px 20px}}
      `}</style>

      <div className="float-wrap">
        <div className="float-info">
          <PikiLogo size={42} textSize={20} light />
          <h1 style={{ fontSize: 38, fontWeight: 700, color: 'white', lineHeight: 1.2, margin: '36px 0 14px', maxWidth: 520 }}>
            Financial protection<br />for every rider and family.
          </h1>
          <div style={{ width: 56, height: 2, background: '#B08A3E', margin: '0 0 16px' }} />
          <p style={{ color: 'rgba(255,255,255,.72)', fontSize: 15, lineHeight: 1.7, marginBottom: 26, maxWidth: 480 }}>
            Bail, income and funeral cover for Kenya's boda boda riders, and funeral cover for households, paid for in small daily amounts through M-Pesa.
          </p>
          <div style={{ border: '1px solid rgba(255,255,255,.18)', borderRadius: 8, maxWidth: 480, background: 'rgba(255,255,255,.04)' }}>
            {PLANS.map(([name, price, cover], i) => (
              <div key={name} style={{ padding: '12px 16px', borderTop: i ? '1px solid rgba(255,255,255,.12)' : 'none', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{name}</div>
                  <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, marginTop: 2 }}>{cover}</div>
                </div>
                <div style={{ color: '#D9B56A', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>{price}</div>
              </div>
            ))}
          </div>
          <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 11.5, marginTop: 12, maxWidth: 480, lineHeight: 1.6 }}>
            A 5-month waiting period applies before claims can be made. Cover is subject to the Terms and Conditions.
          </p>
          <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 11.5, marginTop: 22, lineHeight: 1.6 }}>
            A product of CAD-Kenya (Community Action for Development)
          </p>
        </div>

        <div className="float-card">
          <div className="auth-form-inner">
            <div className="mobile-only-logo" style={{ marginBottom: 18 }}>
              <div className="float-card-logo"><PikiLogo size={34} textSize={16} /></div>
            </div>
            <button type="button" onClick={() => setMode('landing')}
              style={{ background: 'none', border: 'none', color: 'var(--muted)', fontWeight: 600, fontSize: 12, cursor: 'pointer', padding: '0 0 8px', textAlign: 'left' }}>
              &larr; Home
            </button>
            <AuthTabs active={mode} onChange={setMode} />
            <div className="float-scroll">
            {mode === 'register' ? <RegisterPanel onSwitch={setMode} /> : (<>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Sign in</h2>
                <p className="text-muted">Access your PikiShield account</p>
              </div>

              {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

              <form onSubmit={e => { e.preventDefault(); doLogin(phone, password); }}>
                <div className="form-group">
                  <label className="form-label">Phone, email, member or NOK number</label>
                  <input className="form-input" type="text" placeholder="0712345678, name@email.com, PS-XXXXXX or NOK-XXXXXX"
                    value={phone} onChange={e => setPhone(e.target.value)} required autoFocus autoComplete="username" />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" placeholder="Your password"
                    value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                  <div style={{ textAlign: 'right', marginTop: 6 }}>
                    <Link to="/forgot-password" style={{ fontSize: 12, fontWeight: 600 }}>Forgot password?</Link>
                  </div>
                </div>
                <button className="btn btn-primary btn-lg" type="submit" disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
              <p style={{ textAlign: 'center', marginTop: 18, fontSize: 11.5, color: 'var(--muted)' }}>
                By signing in you agree to our <Link to="/terms">Terms</Link> and <Link to="/terms#privacy">Privacy Policy</Link>.
              </p>
            </>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
