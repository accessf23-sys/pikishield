import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import PikiLogo from '../components/PikiLogo';

export default function SetupPage() {
  useAuth(); // auth context loaded for session checks
  const navigate  = useNavigate();
  const [form, setForm]       = useState({ fullName:'', phone:'', email:'', password:'', confirm:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;
    authAPI.checkSetupStatus()
      .then(r => {
        if (!isMounted) return;
        if (!r.data.setupRequired) navigate('/login', { replace: true });
        else setChecking(false);
      })
      .catch(() => { if (isMounted) setChecking(false); });
    return () => { isMounted = false; };
  }, [navigate]);

  const f = (k) => e => setForm(p => ({ ...p, [k]: e.target.value }));
  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSubmit(); };

  const handleSubmit = async () => {
    if (!form.fullName || !form.phone || !form.password) return setError('Name, phone and password are required');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    setLoading(true); setError('');
    try {
      const res = await authAPI.setupAdmin({ fullName:form.fullName, phone:form.phone, email:form.email||undefined, password:form.password });
      // Store token + user directly
      localStorage.setItem('piki_token', res.data.token);
      navigate('/admin', { replace: true });
    } catch(err) { setError(err.response?.data?.error || 'Setup failed'); }
    finally { setLoading(false); }
  };

  if (checking) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#F8FAFC'}}>
      <div style={{color:'#64748B',fontSize:14}}>Checking system status…</div>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',display:'flex',background:'#F1F5F9'}}>
      {/* Left */}
      <div style={{flex:1,background:'linear-gradient(160deg,#050E1F 0%,#07312A 60%,#050E1F 100%)',display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'flex-start',padding:'60px 56px',minWidth:0}}>
        <div style={{marginBottom:48}}><PikiLogo size={36} textSize={17} light /></div>
        <div style={{maxWidth:380}}>
          <div style={{display:'inline-block',background:'rgba(0,214,143,.15)',border:'1px solid rgba(0,214,143,.3)',borderRadius:20,padding:'4px 14px',fontSize:11,color:'#00D68F',fontWeight:700,letterSpacing:1,marginBottom:20,textTransform:'uppercase'}}>
            Super Admin Setup
          </div>
          <h1 style={{fontSize:34,fontWeight:800,color:'white',lineHeight:1.2,marginBottom:16,letterSpacing:'-0.5px'}}>
            Welcome to<br/><span style={{color:'#00D68F'}}>PikiShield</span>
          </h1>
          <p style={{color:'rgba(255,255,255,.5)',fontSize:14,lineHeight:1.75,marginBottom:36}}>
            Create the one Super Admin account. This is a one-time step. The Super Admin is the only account that can create other admins.
          </p>
          {[
            ['👤','After setup, log in with your phone number'],
            ['🤝','Create field agents from the admin panel'],
            ['🛡️','Agents register riders and collect contributions'],
            ['💳','M-Pesa integration built-in — configure in .env'],
          ].map(([icon,text])=>(
            <div key={text} style={{display:'flex',alignItems:'flex-start',gap:12,marginBottom:12}}>
              <span style={{fontSize:16,marginTop:1}}>{icon}</span>
              <span style={{fontSize:13,color:'rgba(255,255,255,.55)',lineHeight:1.5}}>{text}</span>
            </div>
          ))}
        </div>
        <div style={{fontSize:11,color:'rgba(255,255,255,.18)',marginTop:'auto',paddingTop:48}}>© 2025 PikiShield Ltd · Licensed by IRA Kenya</div>
      </div>

      {/* Right */}
      <div style={{width:480,background:'white',display:'flex',alignItems:'center',justifyContent:'center',padding:40,flexShrink:0}}>
        <div style={{width:'100%',maxWidth:380}}>
          <div style={{marginBottom:28}}>
            <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'#FEF9C3',border:'1px solid #FDE047',borderRadius:8,padding:'5px 12px',fontSize:12,color:'#713F12',fontWeight:600,marginBottom:16}}>
              ⚡ One-time setup
            </div>
            <h2 style={{fontSize:22,fontWeight:800,color:'#0F172A',marginBottom:4}}>Create Super Admin Account</h2>
            <p style={{fontSize:13,color:'#64748B'}}>This screen disappears after setup is complete.</p>
          </div>

          {error && (
            <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#991B1B',marginBottom:16}}>
              ❌ {error}
            </div>
          )}

          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[
              {k:'fullName', label:'Your Full Name',  type:'text',     placeholder:'e.g. Samuel Kariuki',    req:true},
              {k:'phone',    label:'Phone Number',     type:'tel',      placeholder:'+254700000000',          req:true},
              {k:'email',    label:'Email Address',    type:'email',    placeholder:'you@company.co.ke',      req:false},
              {k:'password', label:'Password',         type:'password', placeholder:'Min 8 characters',       req:true},
              {k:'confirm',  label:'Confirm Password', type:'password', placeholder:'Repeat password',         req:true},
            ].map(f2=>(
              <div key={f2.k}>
                <label style={{fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:5}}>
                  {f2.label}{f2.req&&<span style={{color:'#EF4444',marginLeft:2}}>*</span>}
                </label>
                <input
                  style={{width:'100%',border:'1.5px solid #E2E8F0',borderRadius:10,padding:'10px 14px',fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit',transition:'border 0.15s'}}
                  type={f2.type} placeholder={f2.placeholder}
                  value={form[f2.k]} onChange={f(f2.k)} onKeyDown={handleKeyDown}
                  onFocus={e=>e.target.style.borderColor='#00D68F'}
                  onBlur={e=>e.target.style.borderColor='#E2E8F0'}
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmit} disabled={loading}
            style={{width:'100%',marginTop:20,padding:'13px',background:loading?'#9CA3AF':'linear-gradient(135deg,#059669,#00D68F)',color:'white',border:'none',borderRadius:10,fontWeight:800,fontSize:14,cursor:loading?'not-allowed':'pointer',transition:'opacity 0.15s'}}>
            {loading ? '⏳ Creating account…' : '🔐 Create Super Admin Account'}
          </button>

          <div style={{marginTop:16,padding:'12px 14px',background:'#F8FAFC',borderRadius:10,fontSize:12,color:'#64748B',lineHeight:1.6}}>
            <strong>Already have an account?</strong> This page only appears when no Super Admin exists.{' '}
            <span style={{color:'#059669',cursor:'pointer',fontWeight:600}} onClick={()=>navigate('/login')}>Go to login →</span>
          </div>
        </div>
      </div>
    </div>
  );
}
