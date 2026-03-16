import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

function roleHome(role) {
  const routes = { admin:'/admin', agent:'/agent', member:'/member-dashboard', nok:'/claims' };
  return routes[role] || '/dashboard';
}

export default function ChangePasswordPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]     = useState('');

  const isForced = !!user?.mustChangePassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) return setError('New passwords do not match');
    if (form.newPassword.trim().length < 8) return setError('Password must be at least 8 characters (no spaces only)');
    setLoading(true); setError(''); setSuccess('');
    try {
      await authAPI.changePassword(form.currentPassword, form.newPassword);
      const updatedUser = await refreshUser();
      setSuccess('Password changed! Redirecting…');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => navigate(roleHome(updatedUser?.role || user?.role), { replace: true }), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{isForced ? '🔐 Set Your Password' : 'Change Password'}</h1>
        <p className="page-subtitle">
          {isForced ? 'You are using a temporary password — please set a permanent one to continue.' : 'Update your account password'}
        </p>
      </div>
      <div className="page-body">
        {isForced && (
          <div style={{background:'linear-gradient(135deg,#FEF3C7,#FFFBEB)',border:'2px solid #F59E0B',borderRadius:10,padding:'14px 18px',marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:26}}>⚠️</span>
            <div>
              <div style={{fontWeight:800,fontSize:14,color:'#92400E',marginBottom:3}}>Temporary password active</div>
              <div style={{fontSize:12,color:'#78350F',lineHeight:1.5}}>
                Your account was created with a temporary password by an agent. Enter it in <strong>Current Password</strong> below, then choose a permanent one.
              </div>
            </div>
          </div>
        )}
        <div className="card" style={{maxWidth:480}}>
          {success && <div className="alert alert-success">✅ {success}</div>}
          {error   && <div className="alert alert-error">❌ {error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{isForced ? 'Temporary Password (from your agent)' : 'Current Password'}</label>
              <input className="form-input" type="password" autoComplete="current-password"
                placeholder={isForced ? 'e.g. Piki1234!' : 'Your current password'}
                value={form.currentPassword} onChange={e=>setForm(f=>({...f,currentPassword:e.target.value}))} required/>
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" autoComplete="new-password" placeholder="Min 8 characters"
                value={form.newPassword} onChange={e=>setForm(f=>({...f,newPassword:e.target.value}))} required minLength={8}/>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input className="form-input" type="password" autoComplete="new-password" placeholder="Repeat new password"
                value={form.confirmPassword} onChange={e=>setForm(f=>({...f,confirmPassword:e.target.value}))} required/>
              {form.confirmPassword && form.newPassword !== form.confirmPassword && (
                <p className="form-error">Passwords do not match</p>
              )}
            </div>
            <button className="btn btn-primary btn-lg" type="submit"
              style={{width:'100%',justifyContent:'center'}}
              disabled={loading||(!!form.confirmPassword&&form.newPassword!==form.confirmPassword)}>
              {loading ? '⏳ Updating…' : isForced ? '🔐 Set Permanent Password' : '🔐 Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
