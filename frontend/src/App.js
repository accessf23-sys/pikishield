import React, { useState } from 'react';
import SplashScreen from './components/SplashScreen';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { authAPI } from './utils/api';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SetupPage from './pages/SetupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import DashboardPage from './pages/DashboardPage';
import PoliciesPage from './pages/PoliciesPage';
import SubscribePage from './pages/SubscribePage';
import ClaimsPage from './pages/ClaimsPage';
import TokensPage from './pages/TokensPage';
import TransactionsPage from './pages/TransactionsPage';
import PaymentsPage from './pages/PaymentsPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminClaimsPage from './pages/AdminClaimsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminAgentsPage from './pages/AdminAgentsPage';
import AgentDashboard from './pages/AgentDashboard';
import MemberDashboardPage from './pages/MemberDashboardPage';
import './index.css';


class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null, stack: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) {
    console.error('PikiShield Error:', error, info);
    this.setState({ stack: info?.componentStack || '' });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F8FAFC',padding:20,overflowY:'auto'}}>
          <div style={{maxWidth:600,width:'100%',background:'white',borderRadius:16,padding:32,boxShadow:'0 4px 24px rgba(0,0,0,.1)',border:'1px solid #FEE2E2'}}>
            <div style={{fontSize:48,marginBottom:16,textAlign:'center'}}>⚠️</div>
            <h2 style={{fontSize:18,fontWeight:800,color:'#991B1B',marginBottom:8,textAlign:'center'}}>Something went wrong</h2>
            <div style={{background:'#FEF2F2',borderRadius:8,padding:'10px 14px',fontSize:11,color:'#991B1B',fontFamily:'monospace',marginBottom:12,wordBreak:'break-all'}}>
              {this.state.error?.message || 'Unknown error'}
            </div>
            <div style={{background:'#FEF2F2',borderRadius:8,padding:'10px 14px',fontSize:10,color:'#7F1D1D',fontFamily:'monospace',marginBottom:20,wordBreak:'break-all',whiteSpace:'pre-wrap',maxHeight:200,overflowY:'auto'}}>
              {this.state.stack || 'No stack trace'}
            </div>
            <button onClick={()=>window.location.reload()}
              style={{width:'100%',padding:'12px',background:'#00C896',color:'white',border:'none',borderRadius:8,fontWeight:700,fontSize:14,cursor:'pointer'}}>
              🔄 Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}


function roleHome(role) {
  if (role === 'admin' || role === 'superadmin') return '/admin';
  if (role === 'agent')  return '/agent';
  if (role === 'nok')    return '/claims';
  if (role === 'member') return '/member-dashboard';
  return '/dashboard';
}

const MOBILE_NAV = {
  rider: [
    { icon:'📊', label:'Home',      path:'/dashboard' },
    { icon:'🛡️', label:'Policies',  path:'/policies' },
    { icon:'📋', label:'Claims',    path:'/claims' },
    { icon:'💳', label:'Pay',       path:'/payments' },
    { icon:'🪙', label:'Tokens',    path:'/tokens' },
  ],
  nok: [
    { icon:'📋', label:'Claims',    path:'/claims' },
    { icon:'🔐', label:'Password',  path:'/password' },
  ],
  admin: [
    { icon:'🏢', label:'Overview',  path:'/admin' },
    { icon:'📋', label:'Claims',    path:'/admin/claims' },
    { icon:'🔑', label:'Admins',    path:'/admin/users' },
    { icon:'🤝', label:'Agents',    path:'/admin/agents' },
  ],
  agent: [
    { icon:'📊', label:'Dashboard', path:'/agent' },
    { icon:'🔐', label:'Password',  path:'/password' },
  ],
  member: [
    { icon:'📋', label:'Claims',    path:'/claims' },
    { icon:'👤', label:'Account',   path:'/member-dashboard' },
    { icon:'🔐', label:'Password',  path:'/password' },
  ],
};

function MobileTopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <div className="mobile-topbar">
      <div className="mobile-topbar-logo">🏍️ PikiShield</div>
      <div style={{fontSize:11,color:'rgba(255,255,255,.5)',fontWeight:600}}>
        {user.fullName?.split(' ')[0]} · {user.role}
      </div>
      <button className="mobile-topbar-notif" onClick={()=>navigate('/password')} title="Settings">⚙️</button>
      <button className="mobile-topbar-notif" onClick={logout} title="Sign out">🚪</button>
    </div>
  );
}

function MobileBottomNav() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const { pathname } = useLocation();
  if (!user) return null;

  const navRole = user.role === 'superadmin' ? 'admin' : user.role;
  const items = MOBILE_NAV[navRole] || MOBILE_NAV.rider;

  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-items">
        {items.map(item => (
          <button key={item.path}
            className={`mobile-nav-item${pathname === item.path ? ' active' : ''}`}
            onClick={() => navigate(item.path)}>
            <span className="mn-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  // ✅ FIXED: use 'token' (matches AuthContext.js)
  const hasToken = !!localStorage.getItem('token');

  if (!hasToken && !user) return <Navigate to="/login" replace />;
  if (loading && hasToken) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  return children;
}

function ForcePasswordModal() {
  const { user, refreshUser, logout } = useAuth();
  const [form, setForm]       = useState({ current:'', next:'', confirm:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [done, setDone]       = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!user?.mustChangePassword || dismissed) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (form.next !== form.confirm) return setError('Passwords do not match');
    if (form.next.length < 8)       return setError('Minimum 8 characters');
    setLoading(true); setError('');
    try {
      await authAPI.changePassword(form.current, form.next);
      await refreshUser();
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed — check your temporary password');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:99999,
      background:'rgba(10,22,40,0.88)',
      backdropFilter:'blur(4px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:16, overflowY:'auto',
    }}>
      <div style={{
        background:'white', borderRadius:14,
        width:'100%', maxWidth:340,
        boxShadow:'0 16px 48px rgba(0,0,0,.4)',
        overflow:'hidden', margin:'auto',
      }}>
        {/* Compact header */}
        <div style={{
          background:'linear-gradient(135deg,#0A1628 0%,#06352A 100%)',
          padding:'12px 16px 10px',
          display:'flex', alignItems:'center', gap:10,
        }}>
          <span style={{fontSize:20}}>🔐</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,fontSize:13,color:'white',lineHeight:1.2}}>Set Permanent Password</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.5)',marginTop:1}}>
              Welcome, <strong style={{color:'#00E0A8'}}>{user?.fullName?.split(' ')[0]}</strong> — temp password active
            </div>
          </div>
          {/* Dismiss button — lets user skip for now */}
          <button
            onClick={() => setDismissed(true)}
            style={{background:'rgba(255,255,255,.1)',border:'none',borderRadius:6,color:'rgba(255,255,255,.6)',cursor:'pointer',fontSize:16,width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}
            title="Dismiss for now"
          >✕</button>
        </div>

        <div style={{padding:'12px 16px'}}>
          {done ? (
            <div style={{textAlign:'center',padding:'12px 0'}}>
              <div style={{fontSize:32,marginBottom:8}}>✅</div>
              <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>Password set!</div>
              <button className="btn btn-primary btn-sm" style={{width:'100%',justifyContent:'center',marginTop:8}}
                onClick={()=>{ refreshUser(); setDone(false); }}>
                Continue →
              </button>
            </div>
          ) : (
            <form onSubmit={submit}>
              {error && <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:6,padding:'7px 10px',fontSize:11,color:'#991B1B',marginBottom:10}}>❌ {error}</div>}
              <div style={{background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:6,padding:'6px 10px',fontSize:10,color:'#92400E',marginBottom:10}}>
                ⚠️ Enter the <strong>temp password</strong> your agent gave you (e.g. <code>Agent1234!</code>)
              </div>
              <div className="form-group" style={{marginBottom:10}}>
                <label className="form-label" style={{fontSize:11}}>Temporary Password</label>
                <input className="form-input" type="password" placeholder="e.g. Agent1234!"
                  style={{padding:'8px 10px',fontSize:13}}
                  value={form.current} onChange={e=>setForm(f=>({...f,current:e.target.value}))} required/>
              </div>
              <div className="form-group" style={{marginBottom:10}}>
                <label className="form-label" style={{fontSize:11}}>New Password</label>
                <input className="form-input" type="password" placeholder="At least 8 characters"
                  style={{padding:'8px 10px',fontSize:13}}
                  value={form.next} onChange={e=>setForm(f=>({...f,next:e.target.value}))} required minLength={8}/>
              </div>
              <div className="form-group" style={{marginBottom:12}}>
                <label className="form-label" style={{fontSize:11}}>Confirm New Password</label>
                <input className="form-input" type="password" placeholder="Repeat new password"
                  style={{padding:'8px 10px',fontSize:13}}
                  value={form.confirm} onChange={e=>setForm(f=>({...f,confirm:e.target.value}))} required/>
                {form.confirm && form.next !== form.confirm && <p className="form-error" style={{fontSize:10}}>Passwords do not match</p>}
              </div>
              <button className="btn btn-primary" type="submit"
                style={{width:'100%',justifyContent:'center',padding:'9px',fontSize:13}}
                disabled={loading||(!!form.confirm&&form.next!==form.confirm)}>
                {loading ? '⏳ Saving…' : '🔐 Set Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function KycBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  if (!user || user.kycStatus !== 'pending' || !['rider','member'].includes(user.role)) return null;
  if (dismissed) return null;
  return (
    <div style={{
      background: 'linear-gradient(90deg, #FEF3C7, #FFFBEB)',
      borderBottom: '1px solid #F59E0B',
      padding: '7px 20px',
      display: 'flex', alignItems: 'center', gap: 10,
      fontSize: 12,
    }}>
      <span style={{fontSize:14}}>⏳</span>
      <div style={{flex:1}}>
        <strong>KYC pending</strong> — Subscriptions, claims and tokens unlock once your identity is verified.
      </div>
      <button onClick={()=>setDismissed(true)} style={{background:'none',border:'none',cursor:'pointer',fontSize:16,color:'#92400E',padding:'0 4px',lineHeight:1}}>✕</button>
    </div>
  );
}

function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <MobileTopBar />
      <main className="main-content">
        {children}
      </main>
      <MobileBottomNav />
      <ForcePasswordModal />
    </div>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const home = user ? roleHome(user.role) : '/login';
  // ✅ FIXED: use 'token' (matches AuthContext.js)
  const hasToken = !!localStorage.getItem('token');

  if (!hasToken) {
    return (
      <Routes>
        <Route path="/setup"           element={<SetupPage />} />
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/register"        element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="*"                element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (loading) return null;

  return (
    <Routes>
      <Route path="/setup"           element={<SetupPage />} />
      <Route path="/login"           element={user ? <Navigate to={home} replace/> : <LoginPage />} />
      <Route path="/register"        element={user ? <Navigate to={home} replace/> : <RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route path="/dashboard"    element={<ProtectedRoute roles={['rider']}><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
      <Route path="/policies"     element={<ProtectedRoute roles={['rider']}><AppLayout><PoliciesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/subscribe"    element={<ProtectedRoute roles={['rider']}><AppLayout><SubscribePage /></AppLayout></ProtectedRoute>} />
      <Route path="/tokens"       element={<ProtectedRoute roles={['rider']}><AppLayout><TokensPage /></AppLayout></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute roles={['rider']}><AppLayout><TransactionsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/payments"     element={<ProtectedRoute roles={['rider']}><AppLayout><PaymentsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/claims"       element={<ProtectedRoute roles={['rider','nok','member']}><AppLayout><ClaimsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/password"     element={<ProtectedRoute roles={['rider','nok','agent','admin','superadmin','member']}><AppLayout><ChangePasswordPage /></AppLayout></ProtectedRoute>} />
      <Route path="/member-dashboard" element={<ProtectedRoute roles={['member']}><AppLayout><MemberDashboardPage /></AppLayout></ProtectedRoute>} />

      <Route path="/admin"         element={<ProtectedRoute roles={['admin','superadmin']}><AppLayout><AdminDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/claims"  element={<ProtectedRoute roles={['admin','superadmin']}><AppLayout><AdminClaimsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/users"   element={<ProtectedRoute roles={['admin','superadmin']}><AppLayout><AdminUsersPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/agents"  element={<ProtectedRoute roles={['admin','superadmin']}><AppLayout><AdminAgentsPage /></AppLayout></ProtectedRoute>} />

      <Route path="/agent" element={<ProtectedRoute roles={['agent']}><AppLayout><AgentDashboard /></AppLayout></ProtectedRoute>} />

      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}

export default function App() {
  const [splashDone, setSplashDone] = useState(
    () => sessionStorage.getItem('piki_splashed') === '1'
  );

  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <AppShell
            splashDone={splashDone}
            onSplashDone={() => setSplashDone(true)}
          />
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppShell({ splashDone, onSplashDone }) {
  const { loading } = useAuth();
  // ✅ FIXED: use 'token' (matches AuthContext.js)
  const hasToken = !!localStorage.getItem('token');

  if (!splashDone) {
    return <SplashScreen onDone={onSplashDone} />;
  }

  if (hasToken && loading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99998,
        background: '#0A1628',
      }}/>
    );
  }

  return <AppRoutes />;
}
