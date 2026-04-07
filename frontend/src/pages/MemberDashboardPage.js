import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function MpesaPaymentModal({ user, onClose }) {
  const [phone, setPhone] = useState(user?.phone || '');
  const [amount, setAmount] = useState('500');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const handlePay = async () => {
    if (!phone || !amount) return setError('Phone and amount are required');
    if (parseInt(amount) < 1) return setError('Amount must be at least KES 1');
    setLoading(true); setError(''); setStatus('pending');
    try {
      const token = localStorage.getItem('piki_token');
      const res = await fetch('/api/payments/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ phone, amount: parseInt(amount), description: 'PikiShield Premium' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment initiation failed');
      setStatus('success');
    } catch (e) { setError(e.message || 'Payment failed'); setStatus('error'); }
    finally { setLoading(false); }
  };
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:360, overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,.4)' }} onClick={e => e.stopPropagation()}>
        <div style={{ background:'linear-gradient(135deg,#00A651,#007A3D)', padding:'18px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontWeight:800, fontSize:14, color:'white' }}>Pay via M-Pesa</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.6)' }}>Lipa Na M-Pesa</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.15)', border:'none', borderRadius:8, width:30, height:30, color:'white', cursor:'pointer', fontSize:16 }}>x</button>
        </div>
        <div style={{ padding:'20px' }}>
          {status === 'success' ? (
            <div style={{ textAlign:'center', padding:'10px 0' }}>
              <div style={{ fontWeight:800, fontSize:17, marginBottom:8 }}>STK Push Sent!</div>
              <div style={{ fontSize:13, color:'var(--muted)', lineHeight:1.6, marginBottom:20 }}>Check your phone <strong>{phone}</strong> for the M-Pesa prompt.</div>
              <div style={{ background:'#F0FDF4', border:'1px solid #A7F3D0', borderRadius:10, padding:'12px', marginBottom:16, fontSize:12, color:'#047857' }}>The prompt may take up to 30 seconds to arrive.</div>
              <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} onClick={onClose}>Done</button>
            </div>
          ) : (
            <>
              <div style={{ background:'#F0FDF4', border:'1px solid #A7F3D0', borderRadius:10, padding:'12px 14px', marginBottom:16, fontSize:12, color:'#047857' }}>
                You will receive an M-Pesa prompt. Enter your PIN to pay.
              </div>
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">M-Pesa Phone Number</label>
                <input className="form-input" placeholder="e.g. 0712345678" value={phone} onChange={e => setPhone(e.target.value)} disabled={loading}/>
              </div>
              <div className="form-group" style={{ marginBottom:12 }}>
                <label className="form-label">Amount (KES)</label>
                <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                  {['300','500','1000','1500'].map(a => (
                    <button key={a} type="button" onClick={() => setAmount(a)}
                      style={{ flex:1, padding:'7px 0', borderRadius:8, border: amount===a ? '2px solid #00A651' : '1.5px solid var(--border)', background: amount===a ? '#F0FDF4' : 'white', fontWeight:700, fontSize:12, cursor:'pointer', color: amount===a ? '#00A651' : 'var(--text)' }}>
                      {a}
                    </button>
                  ))}
                </div>
                <input className="form-input" type="number" placeholder="Or enter custom amount" value={amount} onChange={e => setAmount(e.target.value)} disabled={loading}/>
              </div>
              {error && <div className="alert alert-error" style={{ marginBottom:12 }}>{error}</div>}
              <button style={{ width:'100%', padding:'13px', background: loading ? '#9CA3AF' : 'linear-gradient(135deg,#00A651,#007A3D)', color:'white', border:'none', borderRadius:12, fontWeight:800, fontSize:14, cursor: loading ? 'not-allowed' : 'pointer' }} onClick={handlePay} disabled={loading}>
                {loading ? 'Sending prompt...' : 'Pay KES ' + parseInt(amount || 0).toLocaleString() + ' via M-Pesa'}
              </button>
              <div style={{ textAlign:'center', marginTop:12, fontSize:11, color:'var(--muted)' }}>Secured by Safaricom M-Pesa</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, color, onClick, highlight }) {
  return (
    <div onClick={onClick} style={{ cursor:'pointer', padding: highlight ? '14px 12px' : '12px 10px', background: highlight ? `linear-gradient(135deg,${color}18,${color}08)` : 'var(--surface)', borderRadius:12, border: highlight ? `1.5px solid ${color}44` : '1.5px solid var(--border)', transition:'all 0.2s', display:'flex', flexDirection:'column', alignItems:'center', textAlign:'center', gap:6 }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 4px 16px ${color}22`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = highlight ? `${color}44` : 'var(--border)'; e.currentTarget.style.boxShadow = ''; }}>
      <div style={{ fontSize:22 }}>{icon}</div>
      <div style={{ fontSize:12, fontWeight:700, color: highlight ? color : 'var(--text)', lineHeight:1.2 }}>{label}</div>
    </div>
  );
}

// Policy Details Card — shows cover amounts and 5-month waiting period countdown
function PolicyDetailsCard({ user }) {
  const WAITING_MONTHS = 5;
  if (!user || user.role === 'nok') return null;

  const policyStart   = user.createdAt ? new Date(user.createdAt) : null;
  const waitingEnd    = policyStart ? new Date(new Date(policyStart).setMonth(policyStart.getMonth() + WAITING_MONTHS)) : null;
  const now           = new Date();
  const waitingOver   = waitingEnd ? now >= waitingEnd : false;
  const daysRemaining = waitingEnd && !waitingOver ? Math.ceil((waitingEnd - now) / 864e5) : 0;
  const progress      = policyStart && waitingEnd ? Math.min(100, Math.max(0, ((now - policyStart) / (waitingEnd - policyStart)) * 100)) : 0;

  const coverRows = user.role === 'rider'
    ? [
        { label:'Bail Bond Cover',    value:'KES 20,000' },
        { label:'Income Stipend',     value:'KES 15,000 / month' },
        { label:'Funeral Cover',      value:'KES 200,000' },
        { label:'Daily Contribution', value:'KES 40 / day' },
      ]
    : [
        { label:'Funeral Cover',      value:'KES 200,000' },
        { label:'Daily Contribution', value:'KES 15 / day' },
      ];

  return (
    <div className="card" style={{ padding:'14px 16px', marginBottom:14 }}>
      <div style={{ fontSize:13, fontWeight:700, marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span>My Cover Details</span>
        <span style={{ fontSize:10, fontWeight:700, padding:'3px 9px', borderRadius:20, background: waitingOver ? 'var(--green-light)' : '#FFF8E1', color: waitingOver ? 'var(--green)' : '#92400E' }}>
          {waitingOver ? 'Active' : 'Waiting Period'}
        </span>
      </div>

      {!waitingOver && (
        <div style={{ background:'#FFF8E1', border:'1px solid #FDE68A', borderRadius:10, padding:'12px 14px', marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#92400E', marginBottom:6 }}>
            Waiting Period — {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
          </div>
          <div style={{ height:6, background:'#FDE68A', borderRadius:3, overflow:'hidden', marginBottom:6 }}>
            <div style={{ width: progress + '%', height:'100%', background:'#F59E0B', borderRadius:3, transition:'width .4s' }}/>
          </div>
          <div style={{ fontSize:11, color:'#92400E', display:'flex', justifyContent:'space-between' }}>
            <span>Started {policyStart?.toLocaleDateString('en-KE')}</span>
            <span>Active from {waitingEnd?.toLocaleDateString('en-KE')}</span>
          </div>
          <div style={{ fontSize:11, color:'#92400E', marginTop:6, lineHeight:1.5 }}>
            Claims can only be submitted after the 5-month waiting period ends.
          </div>
        </div>
      )}

      {waitingOver && (
        <div style={{ background:'var(--green-light)', border:'1px solid var(--green-border)', borderRadius:10, padding:'10px 14px', marginBottom:12, fontSize:12, color:'var(--green)', fontWeight:600 }}>
          Your cover is active. You can submit claims at any time.
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {coverRows.map(({ label, value }) => (
          <div key={label} style={{ background:'var(--bg)', borderRadius:8, padding:'10px 12px', border:'1px solid var(--border)' }}>
            <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, marginBottom:3, fontWeight:600 }}>{label}</div>
            <div style={{ fontSize:13, fontWeight:800, color:'var(--text)' }}>{value}</div>
          </div>
        ))}
      </div>

      {policyStart && (
        <div style={{ marginTop:10, fontSize:11, color:'var(--muted)', textAlign:'right' }}>
          Member since {policyStart.toLocaleDateString('en-KE', { day:'numeric', month:'long', year:'numeric' })}
        </div>
      )}
    </div>
  );
}

// NOK Linked Member Card — shows the member this NOK is linked to
function NokLinkedMemberCard({ user }) {
  const [member, setMember]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'nok') { setLoading(false); return; }
    const token = localStorage.getItem('piki_token');
    fetch('/api/users/nok/linked-member', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setMember(d.member || d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (user?.role !== 'nok') return null;

  return (
    <div className="card" style={{ padding:'14px 16px', marginBottom:14 }}>
      <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Linked Member</div>
      {loading ? (
        <div style={{ fontSize:12, color:'var(--muted)', padding:'8px 0' }}>Loading...</div>
      ) : member ? (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
            {[
              ['Full Name',    member.fullName],
              ['Member No.',   member.memberNumber || '—'],
              ['Phone',        member.phone],
              ['KYC Status',   member.kycStatus],
              ['County',       typeof member.profile?.county === 'object' ? '—' : (member.profile?.county || '—')],
              ['Member Since', member.createdAt ? new Date(member.createdAt).toLocaleDateString('en-KE') : '—'],
            ].map(([l, v]) => (
              <div key={l} style={{ background:'var(--bg)', borderRadius:8, padding:'8px 10px', border:'1px solid var(--border)' }}>
                <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, marginBottom:2, fontWeight:600 }}>{l}</div>
                <div style={{ fontSize:12, fontWeight:700, color:'var(--text)', wordBreak:'break-all' }}>{v || '—'}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:11, color:'var(--muted)', lineHeight:1.5, background:'var(--bg)', borderRadius:8, padding:'10px 12px', border:'1px solid var(--border)' }}>
            As Next of Kin, you are authorised to submit funeral claims on behalf of this member and their household.
          </div>
        </>
      ) : (
        <div style={{ fontSize:12, color:'var(--muted)', background:'var(--bg)', borderRadius:8, padding:'12px', border:'1px solid var(--border)' }}>
          No linked member found. Contact support if this seems incorrect.
        </div>
      )}
    </div>
  );
}

export default function MemberDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showPayment, setShowPayment] = useState(false);

  const initials      = user?.fullName?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || '??';
  const userRoleLabel = user?.role === 'nok' ? 'Next of Kin' : 'Protection Member';
  const isNok         = user?.role === 'nok';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Account</h1>
        <p className="page-subtitle">{userRoleLabel}</p>
      </div>
      <div className="page-body">

        {/* Hero card */}
        <div style={{ background:'linear-gradient(135deg,#050E1F 0%,#0A1A35 50%,#07312A 100%)', borderRadius:16, padding:'18px 16px', marginBottom:14, position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,214,143,.2) 0%,transparent 70%)', pointerEvents:'none' }}/>
          <div style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:46, height:46, borderRadius:'50%', background:'linear-gradient(135deg,#00D68F,#007A50)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:15, color:'white', flexShrink:0, boxShadow:'0 0 20px rgba(0,214,143,.5)', border:'2px solid rgba(0,214,143,.4)' }}>
              {initials}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.45)', fontWeight:600, letterSpacing:.8, textTransform:'uppercase', marginBottom:2 }}>{userRoleLabel}</div>
              <h2 style={{ fontSize:17, fontWeight:800, color:'white', marginBottom:6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.fullName}</h2>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                <span style={{ background:'rgba(0,214,143,.15)', border:'1px solid rgba(0,214,143,.3)', borderRadius:20, padding:'3px 9px', fontSize:10, fontWeight:700, color:'#00D68F' }}>
                  {user?.memberNumber || user?.nokNumber || 'PENDING'}
                </span>
                {(() => {
                  const ks = user?.kycStatus;
                  const kc = ks==='approved' ? { bg:'rgba(0,214,143,.15)', text:'#00D68F' } : ks==='rejected' ? { bg:'rgba(239,68,68,.15)', text:'#EF4444' } : { bg:'rgba(245,158,11,.15)', text:'#F59E0B' };
                  const kl = ks==='approved' ? 'KYC Approved' : ks==='rejected' ? 'KYC Rejected' : 'KYC Pending';
                  return <span style={{ background:kc.bg, color:kc.text, border:`1px solid ${kc.text}44`, borderRadius:20, padding:'3px 9px', fontSize:10, fontWeight:700 }}>{kl}</span>;
                })()}
              </div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginTop:12 }}>
            {[
              ['Cover',  isNok ? 'Next of Kin' : 'Funeral'],
              ['County', typeof user?.profile?.county==='object' ? '—' : (user?.profile?.county || '—')],
              ['Phone',  user?.phone],
            ].map(([l, v]) => (
              <div key={l} style={{ background:'rgba(255,255,255,.07)', borderRadius:8, padding:'8px 10px' }}>
                <div style={{ fontSize:9, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:.6, marginBottom:2 }}>{l}</div>
                <div style={{ fontWeight:700, color:'white', fontSize:11, wordBreak:'break-all', lineHeight:1.3 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {user?.kycStatus === 'pending' && (
          <div className="alert alert-warning" style={{ marginBottom:12 }}>
            <strong>KYC Pending</strong> — Your documents are under review.
          </div>
        )}

        {user?.mustChangePassword && (
          <div style={{ background:'linear-gradient(135deg,#1a0a00,#2a1400)', border:'2px solid #F59E0B', borderRadius:12, padding:'16px 18px', marginBottom:14 }}>
            <div style={{ fontWeight:800, fontSize:14, color:'#FDE68A', marginBottom:4 }}>Action Required: Set Your Password</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.7)', lineHeight:1.5, marginBottom:10 }}>You are using a temporary password. Secure your account now.</div>
            <button className="btn" style={{ background:'linear-gradient(135deg,#F59E0B,#D97706)', color:'white', border:'none', fontWeight:800, fontSize:12, padding:'8px 16px' }} onClick={() => navigate('/password')}>
              Change Password
            </button>
          </div>
        )}

        {/* NOK: show linked member */}
        <NokLinkedMemberCard user={user} />

        {/* Member/Rider: show policy details + waiting period */}
        <PolicyDetailsCard user={user} />

        {/* Quick Actions */}
        <div style={{ marginBottom:14 }}>
          <h3 style={{ fontSize:13, fontWeight:750, marginBottom:10, color:'var(--text)' }}>Quick Actions</h3>
          {isNok ? (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <QuickAction icon="📋" label="Submit Claim" color="#00D68F" onClick={() => navigate('/claims')}/>
              <QuickAction icon="🔐" label="Security"     color="#EC4899" onClick={() => navigate('/password')}/>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
              <QuickAction icon="📋" label="Submit Claim"   color="#00D68F" onClick={() => navigate('/claims')}/>
              <QuickAction icon="📱" label="Pay via M-Pesa" color="#00A651" highlight onClick={() => setShowPayment(true)}/>
              <QuickAction icon="🔐" label="Security"       color="#EC4899" onClick={() => navigate('/password')}/>
            </div>
          )}
        </div>

        {!isNok && (
          <div onClick={() => setShowPayment(true)}
            style={{ background:'linear-gradient(135deg,#00A651,#007A3D)', borderRadius:14, padding:'16px 18px', marginBottom:14, cursor:'pointer', display:'flex', alignItems:'center', gap:14, transition:'transform .15s', boxShadow:'0 4px 20px rgba(0,166,81,.3)' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>📱</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:14, color:'white', marginBottom:3 }}>Pay Premium via M-Pesa</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.7)' }}>Tap to get STK push on your phone</div>
            </div>
            <div style={{ fontSize:20, color:'rgba(255,255,255,.6)' }}>→</div>
          </div>
        )}

        <div className="card" style={{ padding:'14px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:'var(--emerald-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>📞</div>
            <div>
              <div style={{ fontWeight:700, fontSize:13 }}>Need Help?</div>
              <div style={{ fontSize:11, color:'var(--muted)' }}>Support available 8am–6pm</div>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
            {[['Toll-Free','0800 724 547'],['WhatsApp','+254 700 000 001'],['Email','info@pikishield.co.ke'],['SMS','HELP to 22547']].map(([l, v]) => (
              <div key={l} style={{ background:'var(--bg)', borderRadius:7, padding:'8px 10px', border:'1px solid var(--border)' }}>
                <div style={{ fontSize:9, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.5, marginBottom:2, fontWeight:600 }}>{l}</div>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--text)', wordBreak:'break-all', lineHeight:1.3 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
      {showPayment && <MpesaPaymentModal user={user} onClose={() => setShowPayment(false)} />}
    </div>
  );
}