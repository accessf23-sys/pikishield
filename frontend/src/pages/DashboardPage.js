import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../utils/api';

/* ── Animated SVG Hero ────────────────────────────────────────── */
function HeroBanner({ user, totalDailyContrib, policies }) {
  const navigate = useNavigate();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const initials = useMemo(() => user?.fullName?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || '?', [user?.fullName]);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #050E1F 0%, #0A1A35 45%, #07312A 100%)',
      borderRadius: 20,
      padding: 'clamp(20px,4vw,32px) clamp(16px,4vw,36px)',
      marginBottom: 24,
      position: 'relative',
      overflow: 'hidden',
      minHeight: 'clamp(160px,22vw,200px)',
    }}>
      {/* Background grid pattern */}
      <svg style={{position:'absolute',inset:0,opacity:.04,pointerEvents:'none'}} width="100%" height="100%">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)"/>
      </svg>

      {/* Glowing orbs */}
      <div style={{position:'absolute',top:-60,right:120,width:200,height:200,borderRadius:'50%',background:'radial-gradient(circle,rgba(0,214,143,.18) 0%,transparent 70%)',pointerEvents:'none'}}/>
      <div style={{position:'absolute',bottom:-80,right:60,width:280,height:280,borderRadius:'50%',background:'radial-gradient(circle,rgba(79,70,229,.15) 0%,transparent 70%)',pointerEvents:'none'}}/>

      {/* Motorbike + Shield SVG — vivid & prominent */}
      <div className="dashboard-bike" style={{position:'absolute',right:0,top:0,bottom:0,width:340,overflow:'hidden',pointerEvents:'none',borderRadius:'0 20px 20px 0',display:'flex',alignItems:'center',justifyContent:'flex-end'}}>
        <svg width="300" height="190" viewBox="0 0 300 190" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Road */}
          <rect x="0" y="160" width="300" height="3" fill="rgba(255,255,255,.15)" rx="2"/>
          <rect x="10" y="167" width="36" height="2" fill="rgba(255,255,255,.1)" rx="1"/>
          <rect x="60" y="167" width="36" height="2" fill="rgba(255,255,255,.1)" rx="1"/>
          <rect x="110" y="167" width="36" height="2" fill="rgba(255,255,255,.1)" rx="1"/>

          {/* Speed lines — green glow */}
          <line x1="0" y1="95" x2="28" y2="95" stroke="#00D68F" strokeWidth="2.5" strokeLinecap="round" opacity=".8"/>
          <line x1="0" y1="107" x2="20" y2="107" stroke="#00D68F" strokeWidth="1.8" strokeLinecap="round" opacity=".55"/>
          <line x1="0" y1="83" x2="16" y2="83" stroke="#00D68F" strokeWidth="1.4" strokeLinecap="round" opacity=".4"/>
          <line x1="4" y1="120" x2="22" y2="120" stroke="#00D68F" strokeWidth="1.2" strokeLinecap="round" opacity=".3"/>

          {/* ── MOTORBIKE ── */}
          {/* Rear wheel outer */}
          <circle cx="65" cy="138" r="30" stroke="#CBD5E1" strokeWidth="5" fill="none"/>
          {/* Rear wheel inner rim */}
          <circle cx="65" cy="138" r="20" stroke="rgba(255,255,255,.25)" strokeWidth="2" fill="none"/>
          {/* Rear wheel spokes */}
          {[0,45,90,135,180,225,270,315].map(a=>(
            <line key={a}
              x1={65+6*Math.cos(a*Math.PI/180)} y1={138+6*Math.sin(a*Math.PI/180)}
              x2={65+20*Math.cos(a*Math.PI/180)} y2={138+20*Math.sin(a*Math.PI/180)}
              stroke="rgba(255,255,255,.3)" strokeWidth="1.5"/>
          ))}
          <circle cx="65" cy="138" r="6" fill="#00D68F"/>
          {/* Rear tyre glow */}
          <circle cx="65" cy="138" r="30" stroke="#00D68F" strokeWidth="1" fill="none" opacity=".3"/>

          {/* Front wheel outer */}
          <circle cx="198" cy="138" r="28" stroke="#CBD5E1" strokeWidth="5" fill="none"/>
          <circle cx="198" cy="138" r="18" stroke="rgba(255,255,255,.25)" strokeWidth="2" fill="none"/>
          {[0,45,90,135,180,225,270,315].map(a=>(
            <line key={a}
              x1={198+6*Math.cos(a*Math.PI/180)} y1={138+6*Math.sin(a*Math.PI/180)}
              x2={198+18*Math.cos(a*Math.PI/180)} y2={138+18*Math.sin(a*Math.PI/180)}
              stroke="rgba(255,255,255,.3)" strokeWidth="1.5"/>
          ))}
          <circle cx="198" cy="138" r="6" fill="#00D68F"/>
          <circle cx="198" cy="138" r="28" stroke="#00D68F" strokeWidth="1" fill="none" opacity=".3"/>

          {/* Frame — main spine */}
          <path d="M65 138 L90 88 L145 80 L198 110 L198 138" stroke="rgba(255,255,255,.5)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          {/* Rear subframe */}
          <path d="M90 88 L108 60 L148 58" stroke="rgba(255,255,255,.35)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          {/* Front fork */}
          <path d="M148 58 L175 90 L198 110" stroke="rgba(255,255,255,.35)" strokeWidth="3" fill="none" strokeLinecap="round"/>
          {/* Handlebar */}
          <path d="M165 62 L180 50 L188 58" stroke="rgba(255,255,255,.5)" strokeWidth="2.5" strokeLinecap="round"/>

          {/* Body fill — fuel tank */}
          <path d="M100 80 Q125 68 148 72 L145 88 L95 90 Z"
            fill="rgba(0,214,143,.3)" stroke="rgba(0,214,143,.7)" strokeWidth="1.5"/>
          {/* Seat */}
          <path d="M95 78 Q115 64 145 68"
            stroke="#00D68F" strokeWidth="4" strokeLinecap="round"/>
          {/* Engine */}
          <rect x="100" y="90" width="40" height="28" rx="5"
            fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.3)" strokeWidth="1.5"/>
          {/* Engine detail lines */}
          <line x1="108" y1="90" x2="108" y2="118" stroke="rgba(255,255,255,.15)" strokeWidth="1"/>
          <line x1="120" y1="90" x2="120" y2="118" stroke="rgba(255,255,255,.15)" strokeWidth="1"/>
          <line x1="132" y1="90" x2="132" y2="118" stroke="rgba(255,255,255,.15)" strokeWidth="1"/>

          {/* Exhaust pipe */}
          <path d="M68 130 Q60 138 52 148 Q44 155 36 155"
            stroke="rgba(255,150,50,.7)" strokeWidth="3" strokeLinecap="round" fill="none"/>
          {/* Exhaust heat shimmer */}
          <ellipse cx="30" cy="154" rx="8" ry="3" fill="rgba(255,150,50,.2)"/>

          {/* Headlight */}
          <circle cx="210" cy="100" r="9" fill="rgba(255,230,80,.7)" stroke="rgba(255,230,80,.9)" strokeWidth="1.5"/>
          <ellipse cx="226" cy="98" rx="12" ry="6" fill="rgba(255,230,80,.2)"/>
          {/* Headlight beam */}
          <path d="M218 94 L240 88 M218 100 L244 100 M218 106 L240 112"
            stroke="rgba(255,230,80,.35)" strokeWidth="1.5" strokeLinecap="round"/>

          {/* ── RIDER ── */}
          {/* Helmet */}
          <circle cx="142" cy="42" r="16" fill="rgba(0,180,120,.6)" stroke="rgba(0,214,143,.9)" strokeWidth="2"/>
          <path d="M128 42 Q130 28 142 26 Q154 28 156 42" fill="rgba(0,214,143,.4)"/>
          {/* Visor */}
          <path d="M130 44 Q142 40 154 44" stroke="rgba(255,255,255,.6)" strokeWidth="2.5" strokeLinecap="round"/>
          {/* Helmet shine */}
          <path d="M132 36 Q138 31 146 34" stroke="rgba(255,255,255,.5)" strokeWidth="1.5" strokeLinecap="round"/>
          {/* Body/jacket */}
          <path d="M142 58 L135 80 M135 80 L125 92 M135 80 L148 88"
            stroke="rgba(255,255,255,.45)" strokeWidth="2.5" strokeLinecap="round"/>

          {/* ── SHIELD top-right ── */}
          <g transform="translate(222,14)">
            <path d="M34 2 L62 14 L62 38 C62 58 34 72 34 72 C34 72 6 58 6 38 L6 14 Z"
              fill="rgba(0,214,143,.18)" stroke="rgba(0,214,143,.65)" strokeWidth="2" strokeLinejoin="round"/>
            <path d="M34 10 L54 20 L54 38 C54 54 34 65 34 65 C34 65 14 54 14 38 L14 20 Z"
              fill="rgba(0,214,143,.08)" stroke="rgba(0,214,143,.3)" strokeWidth="1.2"/>
            {/* Shield checkmark */}
            <path d="M22 38 L30 48 L48 28" stroke="#00D68F" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Shield glow */}
            <ellipse cx="34" cy="38" rx="22" ry="28" fill="rgba(0,214,143,.05)"/>
          </g>
        </svg>
      </div>

      {/* Content */}
      <div style={{position:'relative',zIndex:2,maxWidth:'calc(100% - 300px)',minWidth:180}}>
        {/* Avatar + Greeting */}
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:16}}>
          <div style={{
            width:50,height:50,borderRadius:'50%',
            background:'linear-gradient(135deg,#00D68F,#007A50)',
            display:'flex',alignItems:'center',justifyContent:'center',
            fontWeight:900,fontSize:16,color:'white',flexShrink:0,
            boxShadow:'0 0 20px rgba(0,214,143,.5)',
            border:'2px solid rgba(0,214,143,.4)',
          }}>{initials}</div>
          <div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.45)',fontWeight:600,letterSpacing:.5,textTransform:'uppercase',marginBottom:2}}>
              {new Date().toLocaleDateString('en-KE',{weekday:'long',month:'short',day:'numeric'})}
            </div>
            <h2 style={{fontSize:22,fontWeight:800,color:'white',letterSpacing:'-0.5px',lineHeight:1.1}}>
              {greeting}, {user?.fullName?.split(' ')[0] || 'Member'}! 👋
            </h2>
          </div>
        </div>

        {/* Member tag */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:18,flexWrap:'wrap'}}>
          <div style={{background:'rgba(0,214,143,.15)',border:'1px solid rgba(0,214,143,.3)',borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700,color:'#00D68F',letterSpacing:.3}}>
            🏍️ {user.memberNumber || 'PENDING'}
          </div>
          <div style={{background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.12)',borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:600,color:'rgba(255,255,255,.6)'}}>
            📍 {typeof user.profile?.county==='object'?'Nairobi':(user.profile?.county||'Nairobi')}
          </div>
          {policies.length > 0 && (
            <div style={{background:'rgba(79,70,229,.2)',border:'1px solid rgba(79,70,229,.4)',borderRadius:20,padding:'4px 12px',fontSize:11,fontWeight:700,color:'#A5B4FC'}}>
              🛡️ {policies.length} Active {policies.length===1?'Policy':'Policies'}
            </div>
          )}
        </div>

        {/* Daily contribution pill */}
        {totalDailyContrib > 0 && (
          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(0,214,143,.12)',border:'1px solid rgba(0,214,143,.3)',borderRadius:12,padding:'10px 16px'}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#00D68F',boxShadow:'0 0 8px #00D68F',animation:'pulse 2s ease-in-out infinite'}}/>
            <span style={{fontSize:13,color:'rgba(255,255,255,.7)'}}>Daily contribution</span>
            <span style={{fontSize:16,fontWeight:800,color:'#00D68F',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>KES {totalDailyContrib}</span>
          </div>
        )}
        {policies.length === 0 && (
          <div onClick={()=>navigate('/subscribe')} style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(0,214,143,.12)',border:'1px solid rgba(0,214,143,.3)',borderRadius:12,padding:'10px 16px',cursor:'pointer'}}>
            <span style={{fontSize:13,color:'rgba(255,255,255,.7)'}}>No active cover yet</span>
            <span style={{fontSize:13,fontWeight:700,color:'#00D68F'}}>Get protected →</span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.4)} }
      `}</style>
    </div>
  );
}

/* ── Risk Meter ───────────────────────────────────────────────── */
function RiskMeter({ score, tier }) {
  const c = tier==='green'?'#00D68F':tier==='yellow'?'#F59E0B':'#F43F5E';
  const label = tier==='green'?'Low Risk':tier==='yellow'?'Moderate':'High Risk';
  return (
    <div style={{textAlign:'center'}}>
      <div style={{position:'relative',width:96,height:96,margin:'0 auto 10px'}}>
        <svg width="96" height="96" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg)" strokeWidth="10"/>
          <circle cx="50" cy="50" r="42" fill="none" stroke={c} strokeWidth="10"
            strokeDasharray={`${score*2.64} 264`} strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{transition:'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)',filter:`drop-shadow(0 0 6px ${c})`}}/>
        </svg>
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column'}}>
          <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:900,fontSize:20,color:c,lineHeight:1}}>{score}</div>
          <div style={{fontSize:9,color:'var(--muted)',textTransform:'uppercase',letterSpacing:.8,marginTop:2}}>score</div>
        </div>
      </div>
      <span style={{background:tier==='green'?'var(--emerald-light)':tier==='yellow'?'var(--amber-light)':'var(--rose-light)',color:c,padding:'3px 12px',borderRadius:20,fontSize:11,fontWeight:700,border:`1px solid ${c}44`}}>{label}</span>
    </div>
  );
}

/* ── Quick Action Card ────────────────────────────────────────── */
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
      <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${color},${color}88)`,opacity:.6,borderRadius:'0 0 14px 14px'}}/>
    </div>
  );
}

/* ── Main Dashboard ───────────────────────────────────────────── */
export default function DashboardPage() {
  const { user }      = useAuth();
  const navigate      = useNavigate();
  const [data, setData]       = useState({policies:[],totalPayouts:0,pendingClaims:0,approvedClaims:0,monthlyData:[],allPolicies:[]});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersAPI.getDashboard()
      .then(r => setData(r.data))
      .catch(err => console.error('Dashboard Fetch Error:', err))
      .finally(() => setLoading(false));
  }, []);

  

  const totalPayouts      = data?.totalPayouts || 0;
  const policies          = data?.policies || [];
  const pendingClaims     = data?.pendingClaims || 0;
  const approvedClaims    = data?.approvedClaims || 0;
  const totalDailyContrib = useMemo(() => policies.reduce((s,p)=>s+(p.dailyContribution||0), 0), [policies]);

  // No loading block — render page immediately, data fills in as it arrives

  return (
    <div>
      <div className="page-header" style={{paddingBottom:0}}>
        {/* KYC banner shown in AppLayout - not duplicated here */}
        {user?.suspended && (
          <div className="alert alert-error" style={{marginBottom:16}}>
            🚫 <strong>Account Suspended</strong> — Contact support@pikishield.co.ke
          </div>
        )}
      </div>

      <div className="page-body" style={{paddingTop:0}}>
        {/* ── Hero Banner ── */}
        <HeroBanner user={user} totalDailyContrib={totalDailyContrib} policies={policies}/>

        {/* ── 3 compact stat cards — Active Policies already shown in hero ── */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
          {[
            {icon:'💰',label:'Total Payouts',value:`KES ${totalPayouts.toLocaleString()}`,color:'#00D68F',bg:'#E6FBF3',path:'/claims'},
            {icon:'⏳',label:'Pending Claims',value:pendingClaims,color:'#F59E0B',bg:'#FFFBEB',path:'/claims'},
            {icon:'✅',label:'Approved Claims',value:approvedClaims,color:'#8B5CF6',bg:'#F5F3FF',path:'/claims'},
          ].map(s=>(
            <div key={s.label} onClick={()=>navigate(s.path)} style={{
              background:'var(--surface)',borderRadius:12,padding:'14px 16px',
              border:'1px solid var(--border)',cursor:'pointer',
              position:'relative',overflow:'hidden',
              transition:'transform .18s,box-shadow .18s',
            }}
            onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 6px 18px rgba(0,0,0,.09)';}}
            onMouseLeave={e=>{e.currentTarget.style.boxShadow='';}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:s.color,opacity:.7,borderRadius:'12px 12px 0 0'}}/>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:34,height:34,borderRadius:9,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{s.icon}</div>
                <div>
                  <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:800,fontSize:18,color:s.color,lineHeight:1}}>{s.value}</div>
                  <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{s.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="two-col" style={{marginBottom:20}}>
          {/* ── Policies ── */}
          <div className="card">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:750}}>Your Cover</h3>
              <button className="btn btn-primary btn-sm" onClick={()=>navigate('/subscribe')}>+ Add Policy</button>
            </div>
            {policies.length === 0 ? (
              <div style={{textAlign:'center',padding:'20px 0'}}>
                <div style={{fontSize:32,marginBottom:8}}>🛡️</div>
                <p style={{fontWeight:600,marginBottom:4,fontSize:13}}>No active cover yet</p>
                <p style={{fontSize:12,color:'var(--muted)',marginBottom:14}}>From KES 20/day — bail, stipend & funeral cover</p>
                <button className="btn btn-primary btn-sm" onClick={()=>navigate('/subscribe')}>Get Protected →</button>
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {policies.map(p=>(
                  <div key={p.id} style={{
                    display:'flex',justifyContent:'space-between',alignItems:'center',
                    padding:'12px 14px',
                    background:'linear-gradient(135deg,var(--emerald-light),#F0FDF8)',
                    borderRadius:10,
                    border:'1px solid var(--emerald-mid)',
                  }}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>{p.name}</div>
                      <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>
                        KES {p.dailyContribution}/day · {new Date(p.startDate).toLocaleDateString('en-KE')}
                      </div>
                    </div>
                    <span className="status-badge status-active">active</span>
                  </div>
                ))}
                {totalDailyContrib > 0 && (
                  <div style={{
                    padding:'10px 14px',
                    background:'var(--emerald-light)',
                    borderRadius:10, border:'1px solid var(--emerald-mid)',
                    display:'flex',justifyContent:'space-between',alignItems:'center',
                  }}>
                    <span style={{fontSize:12,color:'var(--muted)'}}>Combined daily</span>
                    <span style={{fontWeight:800,color:'var(--emerald-dark)',fontSize:14,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
                      KES {totalDailyContrib}/day
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Risk Profile ── */}
          <div className="card">
            <h3 style={{fontSize:15,fontWeight:750,marginBottom:16}}>Risk Profile</h3>
            <div style={{display:'flex',gap:20,alignItems:'center',marginBottom:16}}>
              <RiskMeter score={user?.riskScore||75} tier={user?.riskTier||'green'}/>
              <div style={{flex:1}}>
                <div style={{fontSize:12,color:'var(--muted)',marginBottom:10,fontWeight:500}}>Improve your score:</div>
                {[
                  ['🪖','Wear helmet daily','+3 tokens'],
                  ['📝','Safety quiz','+5 tokens'],
                  ['🏆','No-claim month','Bonus rewards'],
                ].map(([ic,l,s])=>(
                  <div key={l} style={{display:'flex',gap:10,marginBottom:8,alignItems:'flex-start'}}>
                    <span style={{fontSize:15,flexShrink:0}}>{ic}</span>
                    <div>
                      <div style={{fontSize:12,fontWeight:650,color:'var(--text)'}}>{l}</div>
                      <div style={{fontSize:10,color:'var(--emerald-dark)',fontWeight:600}}>{s}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Token chip */}
            <div style={{
              display:'flex',alignItems:'center',justifyContent:'space-between',
              padding:'10px 14px',
              background:'linear-gradient(135deg,var(--amber-light),#FEF9EE)',
              borderRadius:10, border:'1.5px solid var(--amber)',
            }}>
              <div>
                <div style={{fontSize:10,color:'#92400E',fontWeight:700,textTransform:'uppercase',letterSpacing:.5}}>Shield Tokens</div>
                <div style={{fontSize:18,fontWeight:800,color:'#92400E',fontFamily:"'Plus Jakarta Sans',sans-serif"}}>🪙 {(policies||[]).some(p=>p.totalContributed>0) ? (user?.shieldTokens||0) : '—'}</div>
              </div>
              <button className="btn btn-sm" style={{background:'#92400E',color:'white',border:'none'}}
                onClick={()=>navigate('/tokens')}>Redeem</button>
            </div>
          </div>
        </div>

        {/* ── Payout History Chart ── */}
        {data?.monthlyData?.some(m=>m.amount>0) && (
          <div className="card" style={{marginBottom:20}}>
            <h3 style={{fontSize:15,fontWeight:750,marginBottom:16}}>Payout History</h3>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={data.monthlyData}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00D68F" stopOpacity={0.3}/>
                    <stop offset="100%" stopColor="#00D68F" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{fontSize:11,fill:'var(--muted)'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'var(--muted)'}} axisLine={false} tickLine={false} tickFormatter={v=>`${v/1000}K`}/>
                <Tooltip
                  contentStyle={{background:'var(--navy)',border:'none',borderRadius:10,color:'white',fontSize:12}}
                  formatter={v=>[`KES ${v.toLocaleString()}`,'']}/>
                <Area type="monotone" dataKey="amount" stroke="#00D68F" strokeWidth={2.5} fill="url(#areaGrad)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Quick Actions ── */}
        <div style={{marginBottom:8}}>
          <h3 style={{fontSize:15,fontWeight:750,marginBottom:14,color:'var(--text)'}}>Quick Actions</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
            <QuickAction icon="📋" label="Submit Claim" sub="File a new insurance claim" color="#00D68F" onClick={()=>navigate('/claims')}/>
            <QuickAction icon="🛡️" label="My Policies" sub="View & manage your cover" color="#4F46E5" onClick={()=>navigate('/policies')}/>
            <QuickAction icon="💳" label="Make Payment" sub="Top up your contributions" color="#F59E0B" onClick={()=>navigate('/payments')}/>
          </div>
        </div>
      </div>
    </div>
  );
}

