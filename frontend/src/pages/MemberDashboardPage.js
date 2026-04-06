import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function QuickAction({ icon, label, sub, color, onClick }) {
  return (
    <div onClick={onClick} style={{
      cursor:'pointer', padding:'18px',
      background:'var(--surface)',
      borderRadius:14,
      border:'1.5px solid var(--border)',
      transition:'all 0.2s cubic-bezier(.4,0,.2,1)',
      position:'relative', overflow:'hidden',
    }}
    onMouseEnter={e=>{
      e.currentTarget.style.borderColor=color;
      e.currentTarget.style.boxShadow=`0 8px 24px ${color}22`;
    }}
    onMouseLeave={e=>{
      e.currentTarget.style.borderColor='var(--border)';
      e.currentTarget.style.boxShadow='';
    }}>
      <div style={{fontSize:28,marginBottom:10}}>{icon}</div>
      <div style={{fontSize:13,fontWeight:750,marginBottom:3,color:'var(--text)'}}>{label}</div>
      <div style={{fontSize:11,color:'var(--muted)'}}>{sub}</div>
    </div>
  );
}

export default function MemberDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const initials = user?.fullName?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || '??';
  const userRoleLabel = user?.role === 'nok' ? 'Next of Kin' : 'Protection Member';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Account</h1>
        <p className="page-subtitle">{userRoleLabel}</p>
      </div>

      <div className="page-body">

        {/* Hero card */}
        <div style={{
          background:'linear-gradient(135deg,#050E1F 0%,#0A1A35 50%,#07312A 100%)',
          borderRadius:20, padding:'24px 20px', marginBottom:20,
          position:'relative', overflow:'hidden',
        }}>
          <div style={{position:'absolute',top:-40,right:-40,width:180,height:180,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,214,143,.2) 0%,transparent 70%)',pointerEvents:'none'}}/>
          <div style={{position:'relative',zIndex:10,display:'flex',alignItems:'flex-start',gap:14}}>
            <div style={{width:52,height:52,borderRadius:'50%',background:'linear-gradient(135deg,#00D68F,#007A50)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:17,color:'white',flexShrink:0,boxShadow:'0 0 24px rgba(0,214,143,.5)',border:'2px solid rgba(0,214,143,.4)'}}>
              {initials}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:11,color:'rgba(255,255,255,.45)',fontWeight:600,letterSpacing:.8,textTransform:'uppercase',marginBottom:3}}>{userRoleLabel}</div>
              <h2 style={{fontSize:20,fontWeight:800,color:'white',marginBottom:10,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.fullName}</h2>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>
                <span style={{background:'rgba(0,214,143,.15)',border:'1px solid rgba(0,214,143,.3)',borderRadius:20,padding:'4px 10px',fontSize:11,fontWeight:700,color:'#00D68F'}}>
                  🏷️ {user?.memberNumber || 'PENDING'}
                </span>
                <span style={{background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.12)',borderRadius:20,padding:'4px 10px',fontSize:11,fontWeight:600,color:'rgba(255,255,255,.6)'}}>
                  📍 {typeof user?.profile?.county==='object'?'—':(user?.profile?.county||'—')}
                </span>
                {(() => {
                  const ks = user?.kycStatus;
                  const kc = ks==='approved'?{bg:'rgba(0,214,143,.15)',text:'#00D68F'}:ks==='rejected'?{bg:'rgba(239,68,68,.15)',text:'#EF4444'}:{bg:'rgba(245,158,11,.15)',text:'#F59E0B'};
                  const kl = ks==='approved'?'✅ KYC Approved':ks==='rejected'?'❌ KYC Rejected':'⏳ KYC Pending';
                  return <span style={{background:kc.bg,color:kc.text,border:`1px solid ${kc.text}44`,borderRadius:20,padding:'4px 10px',fontSize:11,fontWeight:700}}>{kl}</span>;
                })()}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <div style={{background:'rgba(255,255,255,.07)',borderRadius:10,padding:'10px 12px'}}>
                  <div style={{fontSize:10,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:.8,marginBottom:3}}>Cover Type</div>
                  <div style={{fontWeight:700,color:'white',fontSize:13}}>🕊️ Funeral</div>
                </div>
                <div style={{background:'rgba(255,255,255,.07)',borderRadius:10,padding:'10px 12px'}}>
                  <div style={{fontSize:10,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:.8,marginBottom:3}}>Phone</div>
                  <div style={{fontWeight:700,color:'white',fontSize:13,wordBreak:'break-all'}}>{user?.phone}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KYC alert */}
        {user?.kycStatus === 'pending' && (
          <div className="alert alert-warning" style={{marginBottom:16}}>
            ⏳ <strong>KYC Pending</strong> — Your documents are under review.
          </div>
        )}

        {/* Change password prompt */}
        {user?.mustChangePassword && (
          <div style={{background:'linear-gradient(135deg,#1a0a00,#2a1400)',border:'2px solid #F59E0B',borderRadius:14,padding:'20px 22px',marginBottom:20}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:14}}>
              <div style={{fontSize:32,flexShrink:0}}>🔐</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:15,color:'#FDE68A',marginBottom:6}}>Action Required: Set Your Password</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,.7)',lineHeight:1.6,marginBottom:12}}>You are logged in with a temporary password. Change it now to secure your account.</div>
                <button className="btn btn-lg" style={{background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'white',border:'none',fontWeight:800}} onClick={()=>navigate('/password')}>
                  🔐 Change Password →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="card" style={{marginBottom:20}}>
          <h3 style={{fontSize:15,fontWeight:750,marginBottom:14,color:'var(--text)'}}>Quick Actions</h3>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <QuickAction icon="📋" label="Submit Claim" sub="" color="#00D68F" onClick={()=>navigate('/claims')}/>
            <QuickAction icon="💳" label="Make Payment" sub="" color="#F59E0B" onClick={()=>navigate('/payments')}/>
            <QuickAction icon="🛡️" label="My Policy" sub="" color="#4F46E5" onClick={()=>navigate('/policies')}/>
            <QuickAction icon="🔐" label="Security" sub="" color="#EC4899" onClick={()=>navigate('/password')}/>
          </div>
        </div>

        {/* Support card */}
        <div className="card">
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
            <div style={{width:40,height:40,borderRadius:10,background:'var(--emerald-light)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>📞</div>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>Need Help?</div>
              <div style={{fontSize:12,color:'var(--muted)'}}>Support available 8am–6pm</div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {[
              ['Toll-Free','0800 724 547'],
              ['WhatsApp','+254 700 000 001'],
              ['Email','info@pikishield.co.ke'],
              ['SMS','HELP to 22547'],
            ].map(([l,v])=>(
              <div key={l} style={{background:'var(--bg)',borderRadius:8,padding:'10px 12px',border:'1px solid var(--border)'}}>
                <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.5,marginBottom:3,fontWeight:600}}>{l}</div>
                <div style={{fontSize:12,fontWeight:700,color:'var(--text)',wordBreak:'break-all',lineHeight:1.3}}>{v}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}