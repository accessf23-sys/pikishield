import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { policiesAPI, usersAPI } from '../utils/api';

import { getCache, setCache } from '../utils/pageCache';
const REDEEM = [
  { label:'Data Bundle 500MB',          tokens:50,   value:'data_500mb',      icon:'' },
  { label:'5% Contribution Discount',   tokens:80,   value:'contrib_5pct',    icon:'' },
  { label:'Airtime KES 50',             tokens:100,  value:'airtime_50',      icon:'' },
  { label:'Jumia Voucher KES 100',       tokens:150,  value:'jumia_100',       icon:'' },
  { label:'Fuel / Charge Voucher KES 200', tokens:250, value:'fuel_200',      icon:'' },
  { label:'10% Contribution Discount',  tokens:350,  value:'contrib_10pct',   icon:'' },
  { label:'1 Month Free Coverage',      tokens:600,  value:'free_month',      icon:'' },
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

// Shrinks a phone photo (often several MB) to a small JPEG before upload
function shrinkImage(file) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const max = 1024;
        const r = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob((b) => resolve(b || file), 'image/jpeg', 0.8);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    } catch (e) { resolve(file); }
  });
}

// Live front-camera capture only: no gallery or file picker, so it has to be a fresh selfie
function HelmetCamera({ preview, onCapture, onRetake }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [err, setErr] = useState('');

  const stop = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  };
  const start = async () => {
    setErr('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('nocam');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
    } catch (e) {
      setErr('Camera could not open. Allow camera access for this app in your phone settings, then try again.');
    }
  };
  useEffect(() => { if (!preview) start(); return stop; }, [preview]); // eslint-disable-line

  const snap = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const r = Math.min(1, 1024 / Math.max(v.videoWidth, v.videoHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(v.videoWidth * r); c.height = Math.round(v.videoHeight * r);
    const ctx = c.getContext('2d');
    ctx.drawImage(v, 0, 0, c.width, c.height);
    // Date and time printed on the photo (the server also records its own upload time)
    const stamp = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' });
    const fs = Math.max(14, Math.round(c.width / 28));
    ctx.font = 'bold ' + fs + 'px Arial, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, c.height - fs * 1.9, c.width, fs * 1.9);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(stamp, fs * 0.6, c.height - fs * 0.6);
    c.toBlob((b) => {
      if (!b) return;
      stop();
      onCapture(new File([b], 'helmet.jpg', { type: 'image/jpeg' }), URL.createObjectURL(b));
    }, 'image/jpeg', 0.8);
  };

  if (preview) {
    return (
      <div style={{marginBottom:12,textAlign:'center'}}>
        <img src={preview} alt="helmet" style={{width:'100%',maxHeight:260,objectFit:'cover',borderRadius:8,border:'2px solid var(--green)'}}/>
        <button className="btn btn-ghost" style={{width:'100%',justifyContent:'center',marginTop:8}} onClick={onRetake}>Retake</button>
      </div>
    );
  }
  return (
    <div style={{marginBottom:12}}>
      {err
        ? <div className="alert alert-error" style={{marginBottom:8}}>{err}</div>
        : <video ref={videoRef} playsInline muted style={{width:'100%',maxHeight:300,objectFit:'cover',borderRadius:8,background:'#000',transform:'scaleX(-1)'}}/>}
      {err
        ? <button className="btn btn-ghost" style={{width:'100%',justifyContent:'center'}} onClick={start}>Try again</button>
        : <button className="btn btn-ghost" style={{width:'100%',justifyContent:'center',marginTop:8}} onClick={snap}>Take photo</button>}
    </div>
  );
}

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
        <div style={{ fontSize:48, marginBottom:12 }}>{passed ? '' : ''}</div>
        <div style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>
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
  const [showHelmet, setShowHelmet] = useState(false);
  const [helmetFile, setHelmetFile] = useState(null);
  const [helmetPreview, setHelmetPreview] = useState(null);

  const isEV = user?.profile?.bikeType === 'EV';

  const EARN = [
    { key:'helmet_check',   label:'Helmet Compliance Check', tokens:3,  icon:'', desc:'Once per day · 24h cooldown' },
    { key:'safety_quiz',    label:'Complete Safety Quiz',     tokens:5,  icon:'', desc:'Once per day · must score 7/10 to earn' },
    ...(isEV ? [{ key:'ev_charging', label:'EV Charging Logged', tokens:4, icon:'', desc:'Log a full charge · once per day (EV riders)' }] : []),
    { key:'no_claim_month', label:'No-Claim Month Bonus', tokens:15, icon:'', desc:'Auto-credited after 30 claim-free days', auto:true },
    { key:'referral', label:'Refer a New Rider', tokens:30, icon:'', desc:'Auto-credited when referred rider gets KYC approved', auto:true },
  ];

  const flash = (ok, text) => {
    if (ok) { setMsg(text); setError(''); }
    else { setError(text); setMsg(''); }
    setTimeout(() => { setMsg(''); setError(''); }, 5000);
  };

  const earn = async (action) => {
    if (action !== 'safety_quiz' && isLocked(action)) return;
    if (action === 'safety_quiz' && (isLocked('safety_quiz') || isLocked('safety_quiz_attempt'))) return;
    if (action === 'safety_quiz') { setShowQuiz(true); return; }
    if (action === 'helmet_check') { setShowHelmet(true); return; }
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
    setLoading('safety_quiz');
    try {
      if (passed) {
        const res = await usersAPI.earnTokens('safety_quiz');
        flash(true, res.data.message);
      } else {
        // Record attempt even on failure to enforce 24h cooldown
        await usersAPI.earnTokens('safety_quiz_attempt').catch(() => {});
        flash(false, 'Score too low — quiz locked for 24 hours. Study the highway code!');
      }
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

  const [policies, setPolicies] = React.useState(getCache('policies') || []);
  const [policiesLoading, setPoliciesLoading] = React.useState(!getCache('policies'));
  React.useEffect(() => {
    policiesAPI.getMyPolicies()
      .then(r => { setCache('policies', r.data || []); setPolicies(r.data || []); })
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
            <div style={{width:32,height:32,border:'3px solid #E2EAF0',borderTopColor:'#1A9F73',borderRadius:'50%',animation:'spin 0.7s linear infinite',margin:'0 auto 12px'}}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            Checking your token status…
          </div>
        ) : !hasContributed ? (
          <>
          {/* Show referral code even when locked */}
          {user?.referralCode && (
            <div style={{background:'var(--electric-light)',border:'1.5px solid var(--electric)',borderRadius:12,padding:'8px 12px',marginBottom:10,display:'flex',alignItems:'center',gap:10}}>
              <div style={{flex:1}}>
                <div style={{fontSize:11,fontWeight:700,color:'var(--electric)',marginBottom:1}}>Your Referral Code</div>
                <div style={{fontFamily:"'Source Serif 4',Georgia,serif",fontWeight:700,fontSize:17,letterSpacing:2,color:'var(--text)'}}>{user.referralCode}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>Share with friends — earn 30 tokens when they get KYC approved</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => {
                navigator.clipboard?.writeText(user.referralCode);
                flash(true, 'Referral code copied!');
              }}>Copy</button>
            </div>
          )}
          <div style={{background:'#FBF6EA',border:'1.5px solid #B08A3E',borderRadius:8,padding:'28px 24px',textAlign:'center',marginBottom:20}}>
            <div style={{fontSize:40,marginBottom:12}}></div>
            <h3 style={{fontSize:18,fontWeight:700,color:'#92400E',marginBottom:8}}>Tokens Locked</h3>
            <p style={{fontSize:13,color:'#78350F',lineHeight:1.6,maxWidth:360,margin:'0 auto 16px'}}>
              Shield Tokens become available after your first contribution payment.
            </p>
            <a href="/payments" className="btn btn-primary" style={{background:'#B08A3E',border:'none',color:'white'}}>
              Make First Contribution
            </a>
          </div>
          </>
        ) : (<>

        {/* Helmet Modal */}
        {showHelmet && (
          <div style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
            <div style={{background:'white',borderRadius:8,width:'100%',maxWidth:400,padding:'20px 24px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div style={{fontSize:15,fontWeight:700}}>Helmet Check-in</div>
                <button onClick={() => { setShowHelmet(false); setHelmetFile(null); setHelmetPreview(null); }} style={{background:'#F1F5F9',border:'none',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:13}}>×</button>
              </div>
              <p style={{fontSize:13,color:'var(--muted)',marginBottom:16,lineHeight:1.5}}>
                Take a selfie wearing your helmet to earn 3 tokens. Photos from your gallery are not accepted. The photo is saved for compliance records.
              </p>
              <HelmetCamera
                preview={helmetPreview}
                onCapture={(file, url) => { setHelmetFile(file); setHelmetPreview(url); }}
                onRetake={() => { setHelmetFile(null); setHelmetPreview(null); }}
              />
              <button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}}
                disabled={!helmetFile || !!loading}
                onClick={async () => {
                  if (!helmetFile) return;
                  setLoading('helmet_check');
                  try {
                    const fd = new FormData();
                    const small = await shrinkImage(helmetFile);
                    fd.append('photo', small, 'helmet.jpg');
                    const token = localStorage.getItem('token');
                    const send = async (base) => {
                      const r = await fetch(base + '/api/users/helmet-checkin', { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body:fd });
                      const raw = await r.text();
                      let d = {};
                      try { d = raw ? JSON.parse(raw) : {}; } catch (e) { d = {}; }
                      return { ok: r.ok && !!raw, status: r.status, data: d };
                    };
                    let out;
                    try { out = await send(''); } catch (e) { out = { ok:false, status:0, data:{} }; }
                    if (!out.ok && !out.data.error) {
                      // The same-site route did not answer properly: ask the server directly
                      let out2;
                      try { out2 = await send('https://pikishield.onrender.com'); } catch (e) { out2 = { ok:false, status:0, data:{} }; }
                      if (out2.ok || out2.data.error) out = out2;
                      else out.status = out.status + '/' + out2.status;
                    }
                    if (!out.ok) throw new Error(out.data.error || ('Photo could not be uploaded (code ' + out.status + ').'));
                    const data = out.data;
                    flash(true, data.message);
                    refreshUser();
                    setShowHelmet(false); setHelmetFile(null); setHelmetPreview(null);
                  } catch(err) { flash(false, err.message || 'Upload failed'); }
                  finally { setLoading(''); }
                }}
              >
                {loading==='helmet_check' ? 'Uploading…' : 'Submit +3 Tokens'}
              </button>
            </div>
          </div>
        )}

        {/* Quiz Modal */}
        {showQuiz && (
          <div style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,.6)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
            <div style={{background:'white',borderRadius:8,width:'100%',maxWidth:480,padding:'20px 24px',maxHeight:'90vh',overflow:'auto'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div style={{fontSize:15,fontWeight:700}}>Safety Quiz</div>
                <button onClick={() => setShowQuiz(false)} style={{background:'#F1F5F9',border:'none',borderRadius:8,padding:'4px 10px',cursor:'pointer',fontSize:13}}>×</button>
              </div>
              <SafetyQuiz onComplete={handleQuizComplete} onClose={() => setShowQuiz(false)} />
            </div>
          </div>
        )}

        {/* Balance card */}
        <div style={{
          background:'#0B1F3A',
          borderRadius:14, padding:'12px 14px', marginBottom:10,
        }}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div>
              <div style={{fontSize:10,color:'rgba(255,255,255,.4)',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Your Balance</div>
              <div style={{fontFamily:"'Source Serif 4',Georgia,serif",fontWeight:700,fontSize:26,color:'white',lineHeight:1}}>
                {bal} <span style={{fontSize:14}}>tokens</span>
              </div>
              <div style={{color:'rgba(255,255,255,.35)',marginTop:4,fontSize:11}}>
                {streak > 0 ? `${streak} day safe streak` : 'Start your streak today'}
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:11,color:'rgba(255,255,255,.4)',marginBottom:3}}>Next reward</div>
              <div style={{fontFamily:"'Source Serif 4',Georgia,serif",fontWeight:700,fontSize:17,color:'#FDC703'}}>
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

        {/* Referral code card */}
        {user?.referralCode && (
          <div style={{background:'var(--electric-light)',border:'1.5px solid var(--electric)',borderRadius:12,padding:'8px 12px',marginBottom:10,display:'flex',alignItems:'center',gap:10}}>
            <div style={{flex:1}}>
              <div style={{fontSize:11,fontWeight:700,color:'var(--electric)',marginBottom:1}}>Your Referral Code</div>
              <div style={{fontFamily:"'Source Serif 4',Georgia,serif",fontWeight:700,fontSize:17,letterSpacing:2,color:'var(--text)'}}>{user.referralCode}</div>
              <div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>Share with friends — earn 30 tokens when they get KYC approved</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              navigator.clipboard?.writeText(user.referralCode);
              flash(true, 'Referral code copied!');
            }}>Copy</button>
          </div>
        )}

        {msg   && <div className="alert alert-success">{msg}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="two-col">
          {/* Earn */}
          <div className="card">
            <div style={{marginBottom:8}}>
              <div style={{fontSize:13,fontWeight:700}}>Earn Tokens</div>
              <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>Daily actions have a 24-hour cooldown</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {EARN.map(a => {
                const locked = isLocked(a.key) || (a.key === 'safety_quiz' && isLocked('safety_quiz_attempt'));
                const hours  = hoursLeft(a.key) || (a.key === 'safety_quiz' ? hoursLeft('safety_quiz_attempt') : 0);
                return (
                  <div key={a.key} style={{
                    display:'flex',alignItems:'center',gap:8,padding:'6px 10px',
                    border:`1.5px solid ${locked ? 'var(--border)' : 'var(--border)'}`,
                    borderRadius:6,
                    background: locked ? '#FAFAFA' : 'white',
                    opacity: locked ? 0.7 : 1,
                    transition:'all .15s',
                  }}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600}}>{a.label}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>
                        {locked ? `Available in ${hours}h` : a.desc}
                      </div>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => earn(a.key)}
                      disabled={!!loading || locked || !!a.auto}
                      style={{flexShrink:0}}
                    >
                      {a.auto ? 'System' : loading===a.key ? '…' : locked ? 'Locked' : `+${a.tokens}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Redeem */}
          <div className="card">
            <div style={{marginBottom:8}}>
              <div style={{fontSize:13,fontWeight:700}}>Redeem Tokens</div>
              <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>Button activates when you reach the required amount</div>
            </div>
            <div style={{fontSize:11,color:'#7A5A12',background:'#FFF8E1',border:'1px solid #F3E2A8',borderRadius:8,padding:'7px 10px',marginBottom:10}}>
              Tokens can be redeemed after 3 months of active cover.
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {REDEEM.map(opt => {
                const ok = bal >= opt.tokens;
                return (
                  <div key={opt.value} style={{
                    display:'flex',alignItems:'center',gap:8,padding:'6px 10px',
                    border:`1.5px solid ${ok ? 'var(--green)' : 'var(--border)'}`,
                    borderRadius:6,
                    background: ok ? 'var(--green-light)' : '#FAFAFA',
                    opacity: ok ? 1 : 0.6,
                    transition:'all .15s',
                  }}>
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
        <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:16}}>
          {[
            ['Not crypto','Closed-loop loyalty credits. No trading or speculation.'],
            ['Earn daily','Helmet check +3, safety quiz +5, no-claim month +15, referral +30.'],
            ['Real rewards','Data bundles, airtime, contribution discounts and vouchers.'],
          ].map(([title,desc]) => (
            <div key={title} style={{background:'white',borderRadius:10,padding:'12px 14px',border:'1px solid var(--border)',borderLeft:'4px solid var(--emerald)'}}>
              <div style={{fontSize:13,fontWeight:700,marginBottom:2}}>{title}</div>
              <div style={{fontSize:12,color:'var(--muted)',lineHeight:1.5}}>{desc}</div>
            </div>
          ))}
        </div>
        </>)}
      </div>
    </div>
  );
}
