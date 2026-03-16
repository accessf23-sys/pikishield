import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { policiesAPI } from '../utils/api';
import { usersAPI } from '../utils/api';

const REDEEM = [
  { label:'Data Bundle 500MB',         tokens:20,  value:'data_500mb' },
  { label:'5% Contribution Discount',  tokens:30,  value:'contrib_5pct' },
  { label:'Jumia Voucher KES 100',      tokens:50,  value:'jumia_100' },
  { label:'Fuel / Charge Voucher KES 200', tokens:80, value:'fuel_200' },
  { label:'10% Contribution Discount', tokens:120, value:'contrib_10pct' },
];

export default function TokensPage() {
  const { user, refreshUser } = useAuth();
  const [msg, setMsg]         = useState('');
  const [loading, setLoading] = useState('');
  const [error, setError]     = useState('');

  const isEV = user?.profile?.bikeType === 'EV';

  // EV riders see a charging action; petrol riders don't
  const EARN = [
    { key:'helmet_check',   label:'Helmet Compliance Check', tokens:3,  icon:'🪖', desc:'Once per day · 24h cooldown' },
    { key:'safety_quiz',    label:'Complete Safety Quiz',     tokens:5,  icon:'📝', desc:'Once per day · 24h cooldown' },
    ...(isEV ? [{ key:'ev_charging', label:'EV Charging Logged', tokens:4, icon:'⚡', desc:'Log a full charge · once per day (EV riders)' }] : []),
    { key:'no_claim_month', label:'No-Claim Month Bonus',     tokens:10, icon:'🏆', desc:'Stay claim-free this month' },
    { key:'referral',       label:'Refer a New Rider',        tokens:20, icon:'👥', desc:'Per verified referral' },
  ];

  const flash = (ok, text) => {
    if (ok) { setMsg(text); setError(''); }
    else { setError(text); setMsg(''); }
    setTimeout(() => { setMsg(''); setError(''); }, 4500);
  };

  const earn = async (action) => {
    setLoading(action);
    try {
      const res = await usersAPI.earnTokens(action);
      flash(true, res.data.message);
      refreshUser();
    } catch (err) { flash(false, err.response?.data?.error || 'Failed'); }
    finally { setLoading(''); }
  };

  const redeem = async (opt) => {
    if ((user?.shieldTokens||0) < opt.tokens) return flash(false, `Need ${opt.tokens} tokens — you have ${user?.shieldTokens||0}.`);
    setLoading(opt.value);
    try {
      const res = await usersAPI.redeemTokens({ amount: opt.tokens, reward: opt.label });
      const extraInfo = res.data.code ? ` Your code: ${res.data.code}` : '';
      flash(true, (res.data.message || 'Redeemed!') + extraInfo);
      refreshUser();
    } catch (err) { flash(false, err.response?.data?.error || 'Redemption failed'); }
    finally { setLoading(''); }
  };

  const isLocked = (actionKey) => {
    const lastTime = user?.profile?.lastActions?.[actionKey];
    if (!lastTime) return false;
    return (new Date() - new Date(lastTime)) / 36e5 < 24;
  };

  // Tokens only available after first contribution
  const [policies, setPolicies] = React.useState([]);
  const [policiesLoading, setPoliciesLoading] = React.useState(true);
  React.useEffect(() => {
    policiesAPI.getMyPolicies()
      .then(r => setPolicies(r.data || []))
      .catch(()=>{})
      .finally(() => setPoliciesLoading(false));
  }, []);
  const hasContributed = policies.some(p => (p.totalContributed || 0) > 0);

  const bal    = user?.shieldTokens || 0;
  const streak = user?.profile?.safeRideStreak || 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Shield Tokens</h1>
        <p className="page-subtitle">Earn through safe riding · Redeem when you hit the threshold</p>
      </div>

      <div className="page-body">
        {/* While checking contribution status — show neutral placeholder */}
        {policiesLoading ? (
          <div style={{textAlign:'center',padding:'48px 0',color:'var(--muted)',fontSize:13}}>
            <div style={{width:32,height:32,border:'3px solid #E2EAF0',borderTopColor:'#00C896',borderRadius:'50%',animation:'spin 0.7s linear infinite',margin:'0 auto 12px'}}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            Checking your token status…
          </div>
        ) : !hasContributed ? (
          <div style={{background:'linear-gradient(135deg,#FEF3C7,#FFF8E1)',border:'1.5px solid #F59E0B',borderRadius:14,padding:'28px 24px',textAlign:'center',marginBottom:20}}>
            <div style={{fontSize:40,marginBottom:12}}>🔒</div>
            <h3 style={{fontSize:18,fontWeight:800,color:'#92400E',marginBottom:8}}>Tokens Locked</h3>
            <p style={{fontSize:13,color:'#78350F',lineHeight:1.6,maxWidth:360,margin:'0 auto 16px'}}>
              Shield Tokens become available after your first contribution payment. 
              Once you make your first daily contribution your token wallet activates automatically.
            </p>
            <a href="/payments" className="btn btn-primary" style={{background:'#F59E0B',border:'none',color:'white'}}>
              💳 Make First Contribution
            </a>
          </div>
        ) : (<>
        <div style={{
          background: 'linear-gradient(135deg, #0A1628 0%, #0D2444 50%, #06352A 100%)',
          borderRadius: 'var(--r)', padding: '18px 24px', marginBottom: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Your Balance</div>
            <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:36, color:'white', lineHeight:1 }}>
              🪙 {bal}
            </div>
            <div style={{ color:'rgba(255,255,255,.35)', marginTop:4, fontSize:11 }}>
              22 tokens awarded on registration
              {isEV && ' · ⚡ EV bonus: +4 per charge'}
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginBottom:3 }}>Safe Streak</div>
            <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:28, color:'var(--green)' }}>{streak}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.35)' }}>days</div>
          </div>
        </div>

        {msg   && <div className="alert alert-success">✅ {msg}</div>}
        {error && <div className="alert alert-error">❌ {error}</div>}

        <div className="two-col">
          {/* Earn */}
          <div className="card">
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>Earn Tokens</div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Daily actions have a 24-hour cooldown</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {EARN.map(a => (
                <div key={a.key} style={{
                  display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                  border:'1.5px solid var(--border)', borderRadius:9,
                  background: loading===a.key ? 'var(--green-light)' : 'white',
                  transition: 'background .15s',
                }}>
                  <div style={{
                    width:36, height:36, borderRadius:8, flexShrink:0,
                    background: a.key==='ev_charging' ? '#FEF9EE' : 'var(--green-light)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
                  }}>{a.icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600 }}>{a.label}</div>
                    <div style={{ fontSize:11, color:'var(--muted)' }}>{a.desc}</div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => earn(a.key)}
                    disabled={!!loading || isLocked(a.key)}
                    style={{ flexShrink:0, opacity: isLocked(a.key) ? 0.5 : 1 }}
                  >
                    {loading===a.key ? '…' : isLocked(a.key) ? '⌛ Locked' : `+${a.tokens} 🪙`}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Redeem */}
          <div className="card">
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>Redeem Tokens</div>
              <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>Button activates when you reach the required amount</div>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {REDEEM.map(opt => {
                const ok = bal >= opt.tokens;
                return (
                  <div key={opt.value} style={{
                    display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                    border:`1.5px solid ${ok?'var(--green)':'var(--border)'}`,
                    borderRadius:9,
                    background: ok ? 'var(--green-light)' : '#FAFAFA',
                    opacity: ok ? 1 : 0.55,
                    transition: 'all .15s',
                  }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600 }}>{opt.label}</div>
                      <div style={{ fontSize:11, fontWeight:700, color: ok?'var(--green)':'var(--muted)', marginTop:1 }}>
                        {opt.tokens} 🪙{!ok ? ` · need ${opt.tokens - bal} more` : ''}
                      </div>
                    </div>
                    <button
                      className={`btn btn-sm ${ok ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => redeem(opt)}
                      disabled={!ok || !!loading}
                      style={{ flexShrink:0 }}
                    >
                      {loading===opt.value ? '…' : ok ? 'Redeem' : '🔒'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginTop:16 }}>
          {[
            ['🛡️','Not Crypto','Closed-loop loyalty credits — no trading or speculation.'],
            ['🎯','Earn Daily','3 tokens/helmet check · 5/quiz · 4/EV charge (EV riders only).'],
            ['💳','Real Rewards','Redeem for data bundles, discounts, and vouchers.'],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ background:'var(--bg)', borderRadius:9, padding:'12px 14px', border:'1px solid var(--border)' }}>
              <div style={{ fontSize:20, marginBottom:6 }}>{icon}</div>
              <div style={{ fontSize:12, fontWeight:700, marginBottom:3 }}>{title}</div>
              <div style={{ fontSize:11, color:'var(--muted)', lineHeight:1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
        </>)}{/* end hasContributed */}
      </div>
    </div>
  );
}
