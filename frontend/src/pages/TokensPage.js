import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { policiesAPI, usersAPI } from '../utils/api';

const REDEEM = [
  { label:'Data Bundle 500MB',          tokens:50,   value:'data_500mb',      icon:'📶' },
  { label:'5% Contribution Discount',   tokens:80,   value:'contrib_5pct',    icon:'💸' },
  { label:'Airtime KES 50',             tokens:100,  value:'airtime_50',      icon:'📱' },
  { label:'Jumia Voucher KES 100',       tokens:150,  value:'jumia_100',       icon:'🛍️' },
  { label:'Fuel / Charge Voucher KES 200', tokens:250, value:'fuel_200',      icon:'⛽' },
  { label:'10% Contribution Discount',  tokens:350,  value:'contrib_10pct',   icon:'🎯' },
  { label:'1 Month Free Coverage',      tokens:600,  value:'free_month',      icon:'🛡️' },
];

const QUIZ_QUESTIONS = [
  { q:'What is the maximum number of passengers allowed on a boda boda in Kenya?', options:['1','2','3','0'], answer:0 },
  { q:'When must a boda boda rider wear a helmet?', options:['Only on highways','At all times while riding','Only at night','Only in towns'], answer:1 },
  { q:'What should you do when your brakes fail suddenly?', options:['Jump off','Downshift and use engine braking then pull handbrake','Accelerate to get out of traffic','Swerve into oncoming traffic'], answer:1 },
  { q:'Which lane should a boda boda use on a dual carriageway?', options:['Any available lane','The overtaking lane','The left lane','The centre lane'], answer:2 },
  { q:'What does a flashing yellow traffic light mean?', options:['Stop immediately','Proceed with caution','Speed up','Reverse'], answer:1 },
  { q:'How often should you check your tyre pressure?', options:['Once a year','Before every ride','Once a month','Only when it looks flat'], answer:1 },
  { q:'What is the blood alcohol limit for riding in Kenya?', options:['0.08g/100ml','0.05g/100ml','0.00g/100ml','0.10g/100ml'], answer:2 },
  { q:'What is the speed limit in a residential area in Kenya?', options:['80km/h','60km/h','50km/h','30km/h'], answer:2 },
  { q:'A rider should keep how many metres following distance at 50km/h?', options:['5m','10m','15m','25m'], answer:2 },
  { q:'What should you do before changing lanes?', options:['Just move quickly','Check mirrors, signal, check blind spot','Sound horn twice','Flash headlights'], answer:1 },
];

function SafetyQuiz({ onComplete, onClose }) {
  const [idx, setIdx]       = useState(0);
  const [selected, setSel]  = useState(null);
  const [score, setScore]   = useState(0);
  const [done, setDone]     = useState(false);
  const [answered, setAns]  = useState(false);

  const q = QUIZ_QUESTIONS[idx];

  const pick = (i) => {
    if (answered) return;
    setAns(true);
    setSel(i);
    if (i === q.answer) setScore(s => s + 1);
  };

  const next = () => {
    if (idx + 1 >= QUIZ_QUESTIONS.length) {
      setDone(true);
    } else {
      setIdx(i => i + 1);
      setSel(null);
      setAns(false);
    }
  };

  if (done) {
    const passed = score >= 7;
    return (
      <div style={{ textAlign:'center', padding:'24px 16px' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>{passed ? '🏆' : '📚'}</div>
        <div style={{ fontSize:20, fontWeight:800, marginBottom:8 }}>
          {passed ? 'Quiz Passed!' : 'Keep Practicing'}
        </div>
        <div style={{ fontSize:14, color:'var(--muted)', marginBottom:16 }}>
          You scored {score}/{QUIZ_QUESTIONS.length}
          {passed ? ' — 5 tokens earned!' : ' — need 7/10 to earn tokens. Try again tomorrow.'}
        </div>
        <button className="btn btn-primary" onClick={() => onComplete(passed)}>
          {passed ? 'Claim +5 Tokens' : 'Close'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding:'8px 0' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16, fontSize:12, color:'var(--muted)' }}>
        <span>Question {idx+1} of {QUIZ_QUESTIONS.length}</span>
        <span>Score: {score}</span>
      </div>
      <div style={{ width:'100%', height:4, background:'var(--border)', borderRadius:4, marginBottom:20 }}>
        <div style={{ width:`${((idx)/QUIZ_QUESTIONS.length)*100}%`, height:'100%', background:'var(--emerald)', borderRadius:4, transition:'width .3s' }}/>
      </div>
      <div style={{ fontSize:14, fontWeight:600, marginBottom:16, lineHeight:1.5 }}>{q.q}</div>
      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
        {q.options.map((opt, i) => {
          let bg = 'var(--bg)';
          let border = 'var(--border)';
          let color = 'var(--text)';
          if (answered) {
            if (i === q.answer) { bg = 'var(--emerald-light)'; border = 'var(--emerald)'; color = 'var(--emerald-dark)'; }
            else if (i === selected) { bg = 'var(--rose-light)'; border = 'var(--rose)'; color = '#BE123C'; }
          } else if (i === selected) {
            bg = 'var(--electric-light)'; border = 'var(--electric)';
          }
          return (
            <button key={i} onClick={() => pick(i)} style={{
              textAlign:'left', padding:'10px 14px', borderRadius:8,
              border:`1.5px solid ${border}`, background:bg, color,
              fontSize:13, fontWeight:500, cursor: answered ? 'default' : 'pointer',
              transition:'all .15s',
            }}>
              {opt}
            </button>
          );
        })}
      </div>
      {answered && (
        <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} onClick={next}>
          {idx + 1 >= QUIZ_QUESTIONS.length ? 'See Results' : 'Next Question →'}
        </button>
      )}
    </div>
  );
}

export default function TokensPage() {
  const { user, refreshUser } = useAuth();
  const [msg, setMsg]         = useState('');
  const [loading, setLoading] = useState('');
  const [error, setError]     = useState('');
  const [showQuiz, setShowQuiz] = useState(false);

  const isEV = user?.profile?.bikeType === 'EV';

  const EARN = [
    { key:'helmet_check',   label:'Helmet Compliance Check', tokens:3,  icon:'🪖', desc:'Once per day · 24h cooldown' },
    { key:'safety_quiz',    label:'Complete Safety Quiz',     tokens:5,  icon:'📝', desc:'Once per day · must score 7/10 to earn' },
    ...(isEV ? [{ key:'ev_charging', label:'EV Charging Logged', tokens:4, icon:'⚡', desc:'Log a full charge · once per day (EV riders)' }] : []),
    { key:'no_claim_month', label:'No-Claim Month Bonus',     tokens:15, icon:'🏆', desc:'Stay claim-free this month' },
    { key:'referral',       label:'Refer a New Rider',        tokens:30, icon:'👥', desc:'Per verified referral' },
  ];

  const flash = (ok, text) => {
    if (ok) { setMsg(text); setError(''); }
    else { setError(text); setMsg(''); }
    setTimeout(() => { setMsg(''); setError(''); }, 5000);
  };

  const earn = async (action) => {
    if (action === 'safety_quiz') { setShowQuiz(true); return; }
    setLoading(action);
    try {
      const res = await usersAPI.earnTokens(action);
      flash(true, res.data.message);
      refreshUser();
    } catch (err) { flash(false, err.response?.data?.error || 'Failed'); }
    finally { setLoading(''); }
  };

  const handleQuizComplete = async (passed) => {
    setShowQuiz(false);
    if (!passed) return;
    setLoading('safety_quiz');
    try {
      const res = await usersAPI.earnTokens('safety_quiz');
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

  const hoursLeft = (actionKey) => {
    const lastTime = user?.profile?.lastActions?.[actionKey];
    if (!lastTime) return 0;
    const h = 24 - (new Date() - new Date(lastTime)) / 36e5;
    return Math.max(0, Math.ceil(h));
  };

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
  const nextRedeem = REDEEM.find(r => r.tokens > bal);
  const tokensToNext = nextRedeem ? nextRedeem.tokens - bal : 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Shield Tokens</h1>
        <p className="page-subtitle">Earn through safe riding · Redeem when you hit the threshold</p>
      </div>

      <div className="page-body">
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
            </p>
            <a href="/payments" className="btn btn-primary" style={{background:'#F59E0B',border:'none',color:'white'}}>
              Make First Contribution
            </a>
          </div>
        ) : (<>

        {/* Quiz Modal */}
        {showQuiz && (
          <div style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
            <div style={{background:'white',borderRadius:14,width:'100%',maxWidth:480,padding:'20px 24px',maxHeight:'90vh',overflow:'auto'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div style={{fontSize:15,fontWeight:700}}>Safety Quiz</div>
                <button onClick={() => setShowQuiz(false)} style={{background:'#F1F5F9',border:'none',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:13}}>✕</button>
              </div>
              <SafetyQuiz onComplete={handleQuizComplete} onClose={() => setShowQuiz(false)} />
            </div>
          </div>
        )}

        {/* Balance card */}
        <div style={{
          background:'linear-gradient(135deg, #0A1628 0%, #0D2444 50%, #06352A 100%)',
          borderRadius:'var(--r)', padding:'18px 20px', marginBottom:16,
        }}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Your Balance</div>
              <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:800,fontSize:36,color:'white',lineHeight:1}}>
                {bal} <span style={{fontSize:20}}>tokens</span>
              </div>
              <div style={{color:'rgba(255,255,255,.35)',marginTop:4,fontSize:11}}>
                {streak > 0 ? `${streak} day safe streak` : 'Start your streak today'}
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginBottom:3}}>Next reward</div>
              <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:800,fontSize:22,color:'var(--emerald)'}}>
                {tokensToNext > 0 ? `-${tokensToNext}` : 'Ready!'}
              </div>
              <div style={{fontSize:10,color:'rgba(255,255,255,.35)'}}>{nextRedeem?.label || 'All unlocked'}</div>
            </div>
          </div>
          {nextRedeem && (
            <div style={{background:'rgba(255,255,255,.08)',borderRadius:8,padding:'6px 10px'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'rgba(255,255,255,.5)',marginBottom:4}}>
                <span>Progress to {nextRedeem.label}</span>
                <span>{bal}/{nextRedeem.tokens}</span>
              </div>
              <div style={{height:5,background:'rgba(255,255,255,.1)',borderRadius:3}}>
                <div style={{width:`${Math.min(100,(bal/nextRedeem.tokens)*100)}%`,height:'100%',background:'var(--emerald)',borderRadius:3,transition:'width .5s'}}/>
              </div>
            </div>
          )}
        </div>

        {msg   && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="two-col">
          {/* Earn */}
          <div className="card">
            <div style={{marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:700}}>Earn Tokens</div>
              <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>Daily actions have a 24-hour cooldown</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {EARN.map(a => {
                const locked = isLocked(a.key);
                const hours  = hoursLeft(a.key);
                return (
                  <div key={a.key} style={{
                    display:'flex',alignItems:'center',gap:10,padding:'10px 12px',
                    border:`1.5px solid ${locked ? 'var(--border)' : 'var(--border)'}`,
                    borderRadius:9,
                    background: locked ? '#FAFAFA' : 'white',
                    opacity: locked ? 0.7 : 1,
                    transition:'all .15s',
                  }}>
                    <div style={{
                      width:36,height:36,borderRadius:8,flexShrink:0,
                      background:'var(--green-light)',
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,
                    }}>{a.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600}}>{a.label}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>
                        {locked ? `Available in ${hours}h` : a.desc}
                      </div>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => earn(a.key)}
                      disabled={!!loading || locked}
                      style={{flexShrink:0}}
                    >
                      {loading===a.key ? '…' : locked ? 'Locked' : `+${a.tokens}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Redeem */}
          <div className="card">
            <div style={{marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:700}}>Redeem Tokens</div>
              <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>Button activates when you reach the required amount</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {REDEEM.map(opt => {
                const ok = bal >= opt.tokens;
                return (
                  <div key={opt.value} style={{
                    display:'flex',alignItems:'center',gap:10,padding:'10px 12px',
                    border:`1.5px solid ${ok ? 'var(--green)' : 'var(--border)'}`,
                    borderRadius:9,
                    background: ok ? 'var(--green-light)' : '#FAFAFA',
                    opacity: ok ? 1 : 0.6,
                    transition:'all .15s',
                  }}>
                    <div style={{fontSize:22,flexShrink:0}}>{opt.icon}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600}}>{opt.label}</div>
                      <div style={{fontSize:11,fontWeight:700,color:ok?'var(--green)':'var(--muted)',marginTop:1}}>
                        {opt.tokens} tokens{!ok ? ` · need ${opt.tokens - bal} more` : ' · Ready!'}
                      </div>
                    </div>
                    <button
                      className={`btn btn-sm ${ok ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => redeem(opt)}
                      disabled={!ok || !!loading}
                      style={{flexShrink:0}}
                    >
                      {loading===opt.value ? '…' : ok ? 'Redeem' : 'Locked'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Info */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginTop:16}}>
          {[
            ['🛡️','Not Crypto','Closed-loop loyalty credits — no trading or speculation.'],
            ['🎯','Earn Daily','Helmet +3 · Quiz +5 · No-claim +15 · Referral +30'],
            ['💳','Real Rewards','Data bundles, airtime, discounts and vouchers.'],
          ].map(([icon,title,desc]) => (
            <div key={title} style={{background:'var(--bg)',borderRadius:9,padding:'12px 14px',border:'1px solid var(--border)'}}>
              <div style={{fontSize:20,marginBottom:6}}>{icon}</div>
              <div style={{fontSize:12,fontWeight:700,marginBottom:3}}>{title}</div>
              <div style={{fontSize:11,color:'var(--muted)',lineHeight:1.5}}>{desc}</div>
            </div>
          ))}
        </div>
        </>)}
      </div>
    </div>
  );
}
