import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';

function ShieldLogo() {
  return (
    <svg width="32" height="36" viewBox="0 0 36 40" fill="none">
      <defs><linearGradient id="lg2" x1="0" y1="0" x2="36" y2="40" gradientUnits="userSpaceOnUse">
        <stop stopColor="#22C55E"/><stop offset="1" stopColor="#15803D"/>
      </linearGradient></defs>
      <path d="M18 1L2 7V19C2 28 9.5 36 18 39C26.5 36 34 28 34 19V7L18 1Z" fill="url(#lg2)"/>
      <circle cx="12" cy="27" r="4" fill="none" stroke="white" strokeWidth="1.8"/>
      <circle cx="26" cy="27" r="4" fill="none" stroke="white" strokeWidth="1.8"/>
      <path d="M12 27L16 20L22 20L26 27" stroke="white" strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
      <circle cx="21" cy="15" r="2.5" fill="white" opacity=".9"/>
    </svg>
  );
}

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const go1 = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await authAPI.forgotPassword(phone);
      setDemoOtp(res.data.demoOtp || '');
      setStep(2);
    } catch (err) { setError(err.response?.data?.error || 'Failed to send OTP'); }
    finally { setLoading(false); }
  };

  const go2 = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await authAPI.verifyOtp({ phone, otp });
      setResetToken(res.data.resetToken);
      setStep(3);
    } catch (err) { setError(err.response?.data?.error || 'Invalid OTP'); }
    finally { setLoading(false); }
  };

  const go3 = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setError('Passwords do not match');
    setLoading(true); setError('');
    try {
      await authAPI.resetPassword({ token: resetToken, password: newPassword });
      setStep(4);
    } catch (err) { setError(err.response?.data?.error || 'Reset failed'); }
    finally { setLoading(false); }
  };

  const steps = ['Phone','OTP','New password'];

  // Clear errors when navigating between steps
  useEffect(() => { setError(''); }, [step]);

    return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:24 }}>
      <div style={{ width:'100%', maxWidth:400 }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:28 }}>
          <ShieldLogo />
          <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:18, marginTop:10 }}>PikiShield</div>
          <h2 style={{ fontSize:20, fontWeight:700, marginTop:16, marginBottom:4 }}>
            {step === 4 ? 'Password Reset!' : 'Reset Password'}
          </h2>
          {step < 4 && <p className="text-muted" style={{ fontSize:12 }}>{['Enter your phone number','Enter the OTP sent to your phone','Create a new password'][step-1]}</p>}
        </div>

        {step < 4 && (
          <div style={{ display:'flex', gap:6, marginBottom:20 }}>
            {steps.map((s,i) => (
              <div key={s} style={{ flex:1 }}>
                <div style={{ height:3, borderRadius:2, background: step > i ? 'var(--green, #22C55E)' : step === i+1 ? 'var(--green-mid, #86EFAC)' : 'var(--border, #E2E8F0)', transition:'background .3s' }}/>
                <div style={{ fontSize:10, color: step===i+1 ? 'var(--text)' : 'var(--muted)', marginTop:4, fontWeight: step===i+1 ? 600 : 400 }}>{s}</div>
              </div>
            ))}
          </div>
        )}

        <div className="card card-lg">
          {error && <div className="alert alert-error">{error}</div>}

          {step === 1 && (
            <form onSubmit={go1}>
              <div className="form-group">
                <label className="form-label">Phone number or email</label>
                <input className="form-input" placeholder="+254712345678 or email" value={phone} onChange={e=>setPhone(e.target.value)} required autoFocus />
              </div>
              <button className="btn btn-primary btn-lg" style={{ width:'100%', justifyContent:'center' }} type="submit" disabled={loading}>
                {loading ? 'Sending…' : '📱 Send OTP'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={go2}>
              {demoOtp && (
                <div className="alert alert-info" style={{ fontSize:12 }}>
                  🧪 <strong>Demo OTP: {demoOtp}</strong> — in production this is sent by SMS
                </div>
              )}
              <div className="form-group">
                <label className="form-label">6-digit OTP</label>
                <input className="form-input" placeholder="000000" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g, ''))}
                  maxLength={6} required style={{ fontSize:22, letterSpacing:'0.5rem', textAlign:'center', fontWeight:'bold', width:'100%', boxSizing:'border-box' }} autoFocus />
                <p style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>Valid for 15 minutes</p>
              </div>
              <button className="btn btn-primary btn-lg" style={{ width:'100%', justifyContent:'center' }} type="submit" disabled={loading}>
                {loading ? 'Verifying…' : 'Verify OTP →'}
              </button>
              <button type="button" className="btn btn-secondary btn-sm" style={{ width:'100%', justifyContent:'center', marginTop:8 }} onClick={()=>setStep(1)}>← Change phone</button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={go3}>
              <div className="form-group">
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" placeholder="Min 8 characters" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required minLength={8} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input className="form-input" type="password" placeholder="Repeat password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required />
                {confirmPassword && newPassword !== confirmPassword && <p className="form-error">Passwords do not match</p>}
              </div>
              <button className="btn btn-primary btn-lg" style={{ width:'100%', justifyContent:'center' }} type="submit"
                disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}>
                {loading ? 'Resetting…' : '🔐 Set New Password'}
              </button>
            </form>
          )}

          {step === 4 && (
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🎉</div>
              <p style={{ fontSize:14, color:'var(--muted)', marginBottom:20 }}>Your password has been reset successfully.</p>
              <button className="btn btn-primary btn-lg" style={{ width:'100%', justifyContent:'center' }} onClick={()=>navigate('/login')}>
                Sign In Now →
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign:'center', marginTop:16, fontSize:13, color:'var(--muted)' }}>
          <Link to="/login" style={{ color:'var(--green)', fontWeight:600, textDecoration:'none' }}>← Back to Login</Link>
        </p>
      </div>
    </div>
  );
}
