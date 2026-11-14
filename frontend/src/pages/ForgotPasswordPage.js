import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import PikiLogo from '../components/PikiLogo';
import AuthTabs from '../components/AuthTabs';

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
    } catch (err) { setError(err.response ? (err.response.data?.error || 'Failed to send OTP') : 'Cannot reach the server. Check your internet or try again shortly.'); }
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
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) return setError('Password must be 8+ characters with a letter and a number');
    setLoading(true); setError('');
    try {
      await authAPI.resetPassword({ token: resetToken, password: newPassword });
      setStep(4);
    } catch (err) { setError(err.response?.data?.error || 'Reset failed'); }
    finally { setLoading(false); }
  };

  const steps = ['Phone','Code','New password'];

  // Clear errors when navigating between steps
  useEffect(() => { setError(''); }, [step]);

  return (
    <div className="auth-layout">
      <div className="auth-hero" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 40, padding: '36px 44px' }}>
        <PikiLogo size={38} textSize={18} light />
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: 'white', lineHeight: 1.25, marginBottom: 12 }}>Locked out?<br />We will get you back in.</h1>
          <div style={{ width: 56, height: 2, background: '#B08A3E', margin: '0 0 16px' }} />
          <p style={{ color: 'rgba(255,255,255,.7)', fontSize: 14, lineHeight: 1.7, maxWidth: 420 }}>
            Enter the phone number or email on your account. We send a 6-digit code, then you choose a new password.
          </p>
        </div>
        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.45)' }}>
          <Link to="/terms" style={{ color: 'rgba(255,255,255,.7)' }}>Terms and Conditions</Link>{' · '}
          <Link to="/terms#privacy" style={{ color: 'rgba(255,255,255,.7)' }}>Privacy Policy</Link>
        </div>
      </div>

      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <AuthTabs active="" onChange={(m)=>navigate(m === 'register' ? '/register' : '/login')} />
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{step === 4 ? 'Password reset' : 'Reset password'}</h2>
          {step < 4 && <p className="text-muted" style={{ fontSize: 13, marginBottom: 18 }}>{['Enter your phone number or email','Enter the code we sent you','Create a new password'][step-1]}</p>}

          {step < 4 && (
            <div style={{ display:'flex', gap:6, marginBottom:22 }}>
              {steps.map((s,i) => (
                <div key={s} style={{ flex:1 }}>
                  <div style={{ height:3, borderRadius:2, background: step > i+1 || step === i+1 ? '#0F7B5C' : 'var(--border)' }}/>
                  <div style={{ fontSize:11, color: step===i+1 ? 'var(--text)' : 'var(--muted)', marginTop:5, fontWeight: step===i+1 ? 600 : 400 }}>{s}</div>
                </div>
              ))}
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          {step === 1 && (
            <form onSubmit={go1}>
              <div className="form-group">
                <label className="form-label">Phone number or email</label>
                <input className="form-input" placeholder="0712345678 or name@email.com" value={phone} onChange={e=>setPhone(e.target.value)} required autoFocus />
              </div>
              <button className="btn btn-primary btn-lg" style={{ width:'100%', justifyContent:'center' }} type="submit" disabled={loading}>
                {loading ? 'Sending…' : 'Send code'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={go2}>
              {demoOtp && (
                <div className="alert alert-info" style={{ fontSize:12 }}>
                  Test mode: your code is <strong>{demoOtp}</strong>. In live use it is sent by SMS.
                </div>
              )}
              <div className="form-group">
                <label className="form-label">6-digit code</label>
                <input className="form-input" placeholder="000000" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g, ''))}
                  maxLength={6} required style={{ fontSize:22, letterSpacing:'0.5rem', textAlign:'center', fontWeight:'bold', width:'100%', boxSizing:'border-box' }} autoFocus />
                <p style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>Valid for 15 minutes</p>
              </div>
              <button className="btn btn-primary btn-lg" style={{ width:'100%', justifyContent:'center' }} type="submit" disabled={loading}>
                {loading ? 'Verifying…' : 'Verify code'}
              </button>
              <button type="button" className="btn btn-secondary btn-sm" style={{ width:'100%', justifyContent:'center', marginTop:8 }} onClick={()=>setStep(1)}>Change phone</button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={go3}>
              <div className="form-group">
                <label className="form-label">New password</label>
                <input className="form-input" type="password" placeholder="8+ characters, letter and number" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required minLength={8} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm password</label>
                <input className="form-input" type="password" placeholder="Repeat password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required />
                {confirmPassword && newPassword !== confirmPassword && <p className="form-error">Passwords do not match</p>}
              </div>
              <button className="btn btn-primary btn-lg" style={{ width:'100%', justifyContent:'center' }} type="submit"
                disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}>
                {loading ? 'Resetting…' : 'Set new password'}
              </button>
            </form>
          )}

          {step === 4 && (
            <div>
              <p style={{ fontSize:14, color:'var(--muted)', marginBottom:20 }}>Your password has been reset. You can sign in now.</p>
              <button className="btn btn-primary btn-lg" style={{ width:'100%', justifyContent:'center' }} onClick={()=>navigate('/login')}>Sign in</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
