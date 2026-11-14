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

export default function LoginPage({ initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode);
  useEffect(() => { setMode(initialMode); }, [initialMode]);
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
      navigate(routes[user.role] || '/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

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
