import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function MemberDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const initials = user?.fullName?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || '??';
  const userRoleLabel = user?.role === 'nok' ? 'Next of Kin' : user?.role === 'agent' ? 'Field Agent' : 'Protection Member';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Account</h1>
        <p className="page-subtitle">{userRoleLabel}</p>
      </div>

      <div className="page-body">

        {/* ── Hero welcome card ── */}
        <div style={{
          background:'linear-gradient(135deg,#050E1F 0%,#0A1A35 50%,#07312A 100%)',
          borderRadius:20, padding:'28px 28px', marginBottom:20,
          position:'relative', overflow:'hidden',
        }}>
          {/* glow orbs */}
          <div style={{position:'absolute',top:-40,right:-40,width:180,height:180,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,214,143,.2) 0%,transparent 70%)',pointerEvents:'none'}}/>
          <div style={{position:'absolute',bottom:-60,right:80,width:220,height:220,borderRadius:'50%',background:'radial-gradient(circle,rgba(79,70,229,.12) 0%,transparent 70%)',pointerEvents:'none'}}/>
          {/* grid */}
          <svg style={{position:'absolute',inset:0,opacity:.04,pointerEvents:'none'}} width="100%" height="100%">
            <defs><pattern id="mg" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="1"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#mg)"/>
          </svg>

          <div style={{position:'relative',zIndex:10,display:'flex',alignItems:'flex-start',gap:18}}>
            {/* Avatar */}
            <div style={{width:56,height:56,borderRadius:'50%',background:'linear-gradient(135deg,#00D68F,#007A50)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:18,color:'white',flexShrink:0,boxShadow:'0 0 24px rgba(0,214,143,.5)',border:'2px solid rgba(0,214,143,.4)'}}>
              {initials}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:11,color:'rgba(255,255,255,.45)',fontWeight:600,letterSpacing:.8,textTransform:'uppercase',marginBottom:3}}>{userRoleLabel}</div>
              <h2 style={{fontSize:22,fontWeight:800,color:'white',letterSpacing:'-0.4px',marginBottom:10}}>{user?.fullName}</h2>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
                <span style={{background:'rgba(0,214,143,.15)',border:'1px solid rgba(0,214,143,.3)',borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700,color:'#00D68F'}}>
                  🏷️ {user?.memberNumber || 'PENDING'}
                </span>
                <span style={{background:'rgba(255,255,255,.07)',border:'1px solid rgba(255,255,255,.12)',borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:600,color:'rgba(255,255,255,.6)'}}>
                  📍 {typeof user?.profile?.county==='object'?'—':(user?.profile?.county||'—')}
                </span>
                {(() => {
                  const ks = user?.kycStatus;
                  const kc = ks==='approved'?{bg:'rgba(0,214,143,.15)',text:'#00D68F'}:ks==='rejected'?{bg:'rgba(239,68,68,.15)',text:'#EF4444'}:{bg:'rgba(245,158,11,.15)',text:'#F59E0B'};
                  const kl = ks==='approved'?'✅ KYC Approved':ks==='rejected'?'❌ KYC Rejected':'⏳ KYC Pending';
                  return <span style={{background:kc.bg,color:kc.text,border:`1px solid ${kc.text}44`,borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700}}>{kl}</span>;
                })()}
              </div>

              {/* Cover info row */}
              <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                <div style={{background:'rgba(255,255,255,.07)',borderRadius:12,padding:'10px 16px',minWidth:140}}>
                  <div style={{fontSize:10,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:.8,marginBottom:3}}>Cover Type</div>
                  <div style={{fontWeight:700,color:'white',fontSize:14}}>🕊️ Funeral Protection</div>
                </div>
                <div style={{background:'rgba(255,255,255,.07)',borderRadius:12,padding:'10px 16px',minWidth:140}}>
                  <div style={{fontSize:10,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:.8,marginBottom:3}}>Phone</div>
                  <div style={{fontWeight:700,color:'white',fontSize:14}}>{user?.phone}</div>
                </div>
                <div style={{background:'rgba(255,255,255,.07)',borderRadius:12,padding:'10px 16px',minWidth:140}}>
                  <div style={{fontSize:10,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:.8,marginBottom:3}}>Enrolled</div>
                  <div style={{fontWeight:700,color:'white',fontSize:14}}>{user?.createdAt && !isNaN(Date.parse(user.createdAt)) ? new Date(user.createdAt).toLocaleDateString('en-KE',{month:'short',day:'numeric',year:'numeric'}) : 'New Member'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── KYC pending notice ── */}
        {user?.kycStatus === 'pending' && (
          <div className="alert alert-warning" style={{marginBottom:16}}>
            ⏳ <strong>Account Pending Verification</strong> — Your documents are being reviewed. You will receive an SMS once approved.
          </div>
        )}

        {/* ── Change password prompt (persistent if still temp) ── */}
        {user?.mustChangePassword && (
          <div style={{
            background:'linear-gradient(135deg,#1a0a00,#2a1400)',
            border:'2px solid #F59E0B',
            borderRadius:14, padding:'20px 22px', marginBottom:20,
            position:'relative',overflow:'hidden',
          }}>
            <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(245,158,11,.08),transparent)',pointerEvents:'none'}}/>
            <div style={{position:'relative',display:'flex',alignItems:'flex-start',gap:14}}>
              <div style={{fontSize:32,flexShrink:0}}>🔐</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:16,color:'#FDE68A',marginBottom:6}}>Action Required: Set Your Own Password</div>
                <div style={{fontSize:13,color:'rgba(255,255,255,.7)',lineHeight:1.6,marginBottom:12}}>
                  You are currently logged in with a <strong style={{color:'#F59E0B'}}>temporary password</strong> set by your agent.
                  You must change it to secure your account.
                </div>
                <div style={{background:'rgba(245,158,11,.12)',border:'1px solid rgba(245,158,11,.25)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#FDE68A',marginBottom:14,lineHeight:1.6}}>
                  💡 <strong>Your temporary password</strong> was sent to your phone via SMS when your agent registered you. It looks like <code style={{background:'rgba(255,255,255,.1)',padding:'1px 5px',borderRadius:4}}>Piki1234!</code>
                </div>
                <button className="btn btn-lg"
                  style={{background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'white',border:'none',boxShadow:'0 4px 16px rgba(245,158,11,.4)',fontWeight:800}}
                  onClick={()=>navigate('/password')}>
                  🔐 Change My Password Now →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Quick Actions ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
          <button onClick={()=>navigate('/claims')}
            style={{background:'linear-gradient(135deg,#050E1F,#07312A)',border:'none',borderRadius:14,
              padding:'18px 16px',cursor:'pointer',textAlign:'left',boxShadow:'0 4px 20px rgba(0,0,0,.15)'}}>
            <div style={{fontSize:28,marginBottom:8}}>📋</div>
            <div style={{fontWeight:800,fontSize:14,color:'white',marginBottom:3}}>Submit a Claim</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.5)',lineHeight:1.4}}>Claim funeral cover for a deceased dependant</div>
          </button>
          <button onClick={()=>navigate('/password')}
            style={{background:'linear-gradient(135deg,#1a1040,#2a1860)',border:'none',borderRadius:14,
              padding:'18px 16px',cursor:'pointer',textAlign:'left',boxShadow:'0 4px 20px rgba(0,0,0,.15)'}}>
            <div style={{fontSize:28,marginBottom:8}}>🔐</div>
            <div style={{fontWeight:800,fontSize:14,color:'white',marginBottom:3}}>Security</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.5)',lineHeight:1.4}}>Change your password</div>
          </button>
        </div>

        {/* ── Support card ── */}
        <div className="card">
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
            <div style={{width:40,height:40,borderRadius:10,background:'var(--emerald-light)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>📞</div>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>Need Help?</div>
              <div style={{fontSize:12,color:'var(--muted)'}}>PikiShield support is available 8am–6pm</div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {[
              ['Toll-Free Helpline','0800 724 547'],
              ['WhatsApp','0700 PIKI 00'],
              ['Email','support@pikishield.co.ke'],
              ['SMS','HELP to 22547'],
            ].map(([l,v])=>(
              <div key={l} style={{background:'var(--bg)',borderRadius:8,padding:'10px 14px',border:'1px solid var(--border)'}}>
                <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.5,marginBottom:3,fontWeight:600}}>{l}</div>
                <div style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>{v}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
