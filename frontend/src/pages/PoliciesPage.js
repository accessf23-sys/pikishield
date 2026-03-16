import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { policiesAPI } from '../utils/api';

const WAITING_PERIOD_MS = 90 * 24 * 60 * 60 * 1000;
const getClaimDate = (startDate) => {
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return '—';
  return new Date(start.getTime() + WAITING_PERIOD_MS).toLocaleDateString('en-KE');
};

export default function PoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    policiesAPI.getMyPolicies()
      .then(r => setPolicies(r.data))
      .catch(err => console.error('Failed to load policies', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    if (!window.confirm('Cancel this policy? This cannot be undone.')) return;
    setCancelling(id);
    // Optimistic UI update — mark as cancelled immediately to avoid stale-read flicker
    setPolicies(prev => prev.map(p => p.id === id ? { ...p, status: 'cancelled' } : p));
    try { await policiesAPI.cancel(id); } catch {}
    // Refresh from server after short delay to let DB propagate
    setTimeout(() => { load(); setCancelling(null); }, 1500);
  };

  const typeIcons = { bail: '⚖️', bail_income: '🏥', funeral: '🕊️' };

  

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">My Policies</h1>
            <p className="page-subtitle">Manage your active protection packages</p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/subscribe')}>+ Add Policy</button>
        </div>
      </div>
      <div className="page-body">
        {loading ? (
          <div style={{textAlign:'center',padding:'40px',color:'var(--muted)',fontSize:14}}>⌛ Loading your protection…</div>
        ) : policies.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="emoji">🛡️</div>
              <h3>No policies yet</h3>
              <p>Start protecting yourself from just KES 20/day</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/subscribe')}>Get Protected Now</button>
            </div>
          </div>
        ) : (
          <div className="three-col">
            {policies.map(p => (
              <div key={p.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ fontSize: 32 }}>{typeIcons[p.type]}</div>
                  <span className={`status-badge status-${p.status}`}>{p.status}</span>
                </div>
                <h3 style={{ fontSize: 17, marginBottom: 4 }}>{p.name}</h3>
                <p className="text-muted" style={{ fontSize: 11, marginBottom: 4, fontFamily:'monospace', letterSpacing:.3 }}>
                  📋 {p.id}
                </p>
                <p className="text-muted" style={{ fontSize: 12, marginBottom: 16 }}>
                  Since {new Date(p.startDate).toLocaleDateString('en-KE')} · Claims open {getClaimDate(p.startDate)}
                </p>
                <hr className="divider" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span className="text-muted">Daily contribution</span>
                    <span style={{ fontWeight: 700 }}>KES {p.dailyContribution}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span className="text-muted">Total contributed</span>
                    <span style={{ fontWeight: 700 }}>KES {(p.totalContributed || 0).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span className="text-muted">Claims used</span>
                    <span style={{ fontWeight: 700 }}>{p.claimsUsed || 0}</span>
                  </div>
                  {Object.entries(p.coverages || {}).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                      <span className="text-muted">{k.charAt(0).toUpperCase() + k.slice(1)} cover</span>
                      <span style={{ fontWeight: 700, color: 'var(--green)' }}>KES {v.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                {p.members?.length > 0 && (
                  <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Covered Members</div>
                    {p.members.map(m => (
                      <div key={m.id} style={{ fontSize: 12, color: 'var(--text)', marginBottom: 2 }}>
                        👤 {m.name} — {m.relation}, {m.age}y
                      </div>
                    ))}
                  </div>
                )}
                {p.status === 'active' && (
                  <button className="btn btn-danger btn-sm w-full" style={{ width: '100%', justifyContent: 'center' }}
                    onClick={() => cancel(p.id)} disabled={cancelling === p.id}>
                    {cancelling === p.id ? 'Cancelling...' : 'Cancel Policy'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
