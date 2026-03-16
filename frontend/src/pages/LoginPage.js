import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PikiLogo from '../components/PikiLogo';

// Amounts are WITHIN policy limits: Bail max 20k, Stipend max 15k, Funeral max 200k
const TESTIMONIALS = [
  { name:'James M.',   county:'Nairobi',      role:'Boda Boda Rider', quote:'Got held at Pangani after a matatu incident. PikiShield sent KES 20,000 bail to my wife in under 4 hours. Back on road same evening.', cover:'Bail Bond',     amount:'KES 20,000', catchline:'Full bail cover · 1 of 2 claims this year remaining', color:'#00D68F' },
  { name:'Grace W.',   county:'Kiambu',        role:'Boda Boda Rider', quote:'Broke my wrist at Ruaka roundabout. Could not ride for 3 weeks. PikiShield paid KES 15,000 income. My children ate properly.', cover:'Income Stipend', amount:'KES 15,000', catchline:'Full stipend paid · still 1 more claim available this year', color:'#3B82F6' },
  { name:'Peter O.',   county:'Kisumu',        role:'Funeral Member',  quote:'My father passed suddenly in Kondele. PikiShield paid KES 200,000 for the funeral in 3 days. Our family did not beg anyone.', cover:'Funeral Cover',  amount:'KES 200,000', catchline:'Full KES 200,000 funeral cover paid', color:'#8B5CF6' },
  { name:'Faith N.',   county:'Mombasa',       role:'Boda Boda Rider', quote:'Police arrested me near Likoni. PikiShield bail money arrived on my wife\'s Mpesa before I even finished being booked. Asante sana.', cover:'Bail Bond',     amount:'KES 20,000', catchline:'Maximum bail cover · KES 20/day is all it costs', color:'#F59E0B' },
  { name:'David K.',   county:'Nakuru',        role:'Boda Boda Rider', quote:'Had an accident near Nakuru town. Was off road 2 weeks. KES 15,000 stipend from PikiShield kept my family afloat.', cover:'Income Stipend', amount:'KES 15,000', catchline:'Full income cover · 1 claim left for the year', color:'#EF4444' },
  { name:'Mary A.',    county:'Machakos',      role:'Funeral Member',  quote:'We lost my husband to a road accident. PikiShield paid KES 200,000 within 4 days. We buried him with dignity and had money left.', cover:'Funeral Cover',  amount:'KES 200,000', catchline:'Full funeral cover — no harambee needed', color:'#EC4899' },
  { name:'Hassan S.',  county:'Kwale',         role:'Boda Boda Rider', quote:'KES 40 per day covers both bail AND income. Used bail once and stipend once this year — both paid in full. Best investment I make.', cover:'Bail + Stipend', amount:'KES 40/day', catchline:'Bail KES 20k + Income KES 15k · 2 products, 1 price', color:'#00D68F' },
  { name:'Lucy W.',    county:'Nyeri',         role:'Funeral Member',  quote:'Mama died at Nyeri PGH. PikiShield covered KES 200,000 of the funeral. No harambee needed. The family was so relieved.', cover:'Funeral Cover',  amount:'KES 200,000', catchline:'Maximum KES 200,000 · paid in 3 days', color:'#8B5CF6' },
  { name:'Brian O.',   county:'Uasin Gishu',   role:'Boda Boda Rider', quote:'Arrested near Eldoret town. My agent registered me the week before. KES 20,000 bail paid in 5 hours. Saved my business.', cover:'Bail Bond',     amount:'KES 20,000', catchline:'Full bail · still 1 more claim available this year', color:'#3B82F6' },
  { name:'Rose M.',    county:'Kakamega',      role:'Boda Boda Rider', quote:'Leg fracture near Kakamega. 3 weeks off road. KES 15,000 stipend arrived on Mpesa. I never went hungry, not even one day.', cover:'Income Stipend', amount:'KES 15,000', catchline:'Full income stipend · KES 20/day — cancel anytime', color:'#F59E0B' },
  { name:'Simon T.',   county:'Murang\'a',     role:'Boda Boda Rider', quote:'Police at Kangari held me over a brake light. KES 20,000 bail from PikiShield. My sacco chairman could not believe it.', cover:'Bail Bond',     amount:'KES 20,000', catchline:'Max bail cover · 2 claims per year, 1 still unused', color:'#00D68F' },
  { name:'Agnes K.',   county:'Embu',          role:'Funeral Member',  quote:'Lost my son to illness. PikiShield sent KES 200,000. We had a dignified burial without selling land. I tell every woman to join.', cover:'Funeral Cover',  amount:'KES 200,000', catchline:'Full KES 200,000 cover · KES 15/day only', color:'#EC4899' },
  { name:'Joseph N.',  county:'Bungoma',       role:'Boda Boda Rider', quote:'Hit by a matatu near Bungoma town. Off road 2 weeks. KES 15,000 stipend arrived on Mpesa. I did not have to borrow from anyone.', cover:'Income Stipend', amount:'KES 15,000', catchline:'Maximum stipend · 1 more claim remaining this year', color:'#3B82F6' },
  { name:'Fatuma A.',  county:'Kilifi',        role:'Boda Boda Rider', quote:'Arrested at Malindi roadblock. PikiShield paid KES 20,000 bail. Money arrived before OCS could process my release. Pure miracle.', cover:'Bail Bond',     amount:'KES 20,000', catchline:'Full KES 20,000 bail · only KES 20/day premium', color:'#F59E0B' },
  { name:'Charles M.', county:'Trans Nzoia',   role:'Funeral Member',  quote:'Brother died at Kitale County Hospital. PikiShield paid KES 200,000 in full. That money saved our family from total breakdown.', cover:'Funeral Cover',  amount:'KES 200,000', catchline:'Maximum funeral cover · KES 15/day is all it takes', color:'#8B5CF6' },
];

export default function LoginPage() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [phone, setPhone]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [tIdx, setTIdx]         = useState(0);
  const [fading, setFading]     = useState(false);

  const timerRef = useRef(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setTIdx(i => (i + 1) % TESTIMONIALS.length);
        setFading(false);
      }, 380);
    }, 4000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  const doLogin = async (identifier, pw) => {
    setError('');
    setLoading(true);
    try {
      const res = await login(identifier, pw);
      const user = res?.user;
      if (!user) throw new Error('User data missing from response');
      if (user.mustChangePassword) return navigate('/password');

      const routes = {
        admin: '/admin',
        superadmin: '/admin',
        agent: '/agent',
        member: '/member-dashboard',
        nok: '/claims'
      };

      navigate(routes[user.role] || '/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const t = TESTIMONIALS[tIdx];
  const prev = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setFading(true);
    setTimeout(() => { setTIdx(i => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length); setFading(false); startTimer(); }, 300);
  };
  const next = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setFading(true);
    setTimeout(() => { setTIdx(i => (i + 1) % TESTIMONIALS.length); setFading(false); startTimer(); }, 300);
  };

  return (
    <div className="auth-layout">
      {/* ── Left Hero ── */}
      <div className="auth-hero" style={{display:'flex',flexDirection:'column',justifyContent:'space-between',padding:'32px 36px',gap:0}}>

        {/* Logo */}
        <PikiLogo size={36} textSize={17} light />

        {/* Centre content */}
        <div style={{marginTop:28}}>
          <h1 style={{fontSize:30,fontWeight:800,color:'white',lineHeight:1.2,marginBottom:10,letterSpacing:'-0.5px'}}>
            Financial <span style={{color:'#4ADE80'}}>protection</span><br/>for every rider.
          </h1>
          <div style={{color:'rgba(255,255,255,.45)',fontSize:12.5,lineHeight:1.7,marginBottom:20}}>
            From KES 20/day — bail, income &amp; funeral cover for Kenya's boda boda riders.
            <div style={{marginTop:10,display:'inline-flex',alignItems:'center',gap:6,background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.15)',borderRadius:20,padding:'4px 12px'}}>
              <span style={{fontSize:10,color:'rgba(255,255,255,.5)'}}>A product of</span>
              <span style={{fontSize:11,fontWeight:800,color:'#00D68F',letterSpacing:.3}}>CAD-Kenya</span>
              <span style={{fontSize:9,color:'rgba(255,255,255,.4)'}}>Community Action for Development</span>
            </div>
          </div>

          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,marginBottom:22}}>
            {[['2.5M+','Riders eligible'],['KES 20/day','Starting from'],['4 hrs','Claim payout'],['47','Counties covered']].map(([v,l])=>(
              <div key={v} style={{background:'rgba(255,255,255,.06)',borderRadius:9,padding:'9px 12px',border:'1px solid rgba(255,255,255,.07)'}}>
                <div style={{fontWeight:800,fontSize:16,color:'white'}}>{v}</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,.38)',marginTop:1}}>{l}</div>
              </div>
            ))}
          </div>

          {/* Testimonial card */}
          <div style={{
            opacity: fading ? 0 : 1,
            transition: 'opacity 0.38s ease',
            background:`linear-gradient(135deg, ${t.color}18 0%, rgba(255,255,255,.04) 100%)`,
            border:`1.5px solid ${t.color}55`,
            borderLeft: `4px solid ${t.color}`,
            borderRadius:13,
            padding:'15px 16px',
            boxShadow:`0 4px 24px ${t.color}22`,
          }}>
            {/* Header row */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:9}}>
              <div style={{display:'flex',alignItems:'center',gap:9}}>
                <div style={{width:36,height:36,borderRadius:'50%',background:`linear-gradient(135deg,${t.color},${t.color}99)`,border:`2px solid ${t.color}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'white',flexShrink:0,boxShadow:`0 2px 8px ${t.color}55`}}>
                  {t.name[0]}
                </div>
                <div>
                  <div style={{fontSize:12.5,fontWeight:700,color:'white',lineHeight:1}}>{t.name}</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,.35)',marginTop:2}}>{t.role} · {t.county} County</div>
                </div>
              </div>
              <div style={{textAlign:'right',flexShrink:0,marginLeft:8}}>
                <div style={{fontSize:9,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:.5}}>Received</div>
                <div style={{fontSize:14,fontWeight:900,color:t.color,lineHeight:1.1,textShadow:`0 0 20px ${t.color}88`}}>{t.amount}</div>
              </div>
            </div>

            <p style={{fontSize:11,color:'rgba(255,255,255,.82)',lineHeight:1.6,margin:'0 0 7px',fontStyle:'italic'}}>
              "{t.quote}"
            </p>
            <div style={{fontSize:10,color:t.color,fontWeight:700,letterSpacing:.2,opacity:.9,marginBottom:6}}>
              ✦ {t.catchline}
            </div>

            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:9.5,background:t.color,color:'white',padding:'3px 10px',borderRadius:20,fontWeight:800,boxShadow:`0 2px 8px ${t.color}55`}}>
                {t.cover}
              </span>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{color:'#FBBF24',fontSize:11,letterSpacing:1}}>★★★★★</span>
                {/* Nav arrows */}
                <div style={{display:'flex',gap:4}}>
                  <button onClick={prev} style={{background:'rgba(255,255,255,.08)',border:'none',borderRadius:5,width:22,height:22,color:'rgba(255,255,255,.6)',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
                  <button onClick={next} style={{background:'rgba(255,255,255,.08)',border:'none',borderRadius:5,width:22,height:22,color:'rgba(255,255,255,.6)',cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
                </div>
              </div>
            </div>
          </div>

          {/* Dot indicators */}
          <div style={{display:'flex',justifyContent:'center',gap:4,marginTop:10,flexWrap:'wrap'}}>
            {TESTIMONIALS.map((_,i)=>(
              <div key={i} onClick={()=>{ setTIdx(i); startTimer(); }} style={{
                width:i===tIdx?18:5, height:5, borderRadius:3,
                background:i===tIdx ? TESTIMONIALS[i].color : 'rgba(255,255,255,.15)',
                transition:'all .3s ease', cursor:'pointer', flexShrink:0,
                boxShadow: i===tIdx ? `0 0 8px ${TESTIMONIALS[i].color}` : 'none'
              }}/>
            ))}
          </div>
        </div>

        <div style={{fontSize:10.5,color:'rgba(255,255,255,.18)',marginTop:20}}>
          © 2025 PikiShield Ltd · Licensed by IRA Kenya
        </div>
      </div>

      {/* ── Right Form ── */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          {/* Mobile-only top banner */}
          <div className="mobile-login-banner" style={{display:'none',marginBottom:28,background:'linear-gradient(135deg,#050E1F,#0A1628)',borderRadius:16,padding:'20px 18px',color:'white'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#00C896,#00D68F)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🏍️</div>
              <div>
                <div style={{fontWeight:800,fontSize:16,letterSpacing:0.3}}>PikiShield</div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.5)',letterSpacing:1}}>MICRO-PROTECTION</div>
              </div>
            </div>
            <p style={{fontSize:12,color:'rgba(255,255,255,0.6)',lineHeight:1.6,margin:0}}>
              From <strong style={{color:'#00D68F'}}>KES 20/day</strong> — bail, income &amp; funeral cover for Kenya's boda boda riders.
            </p>
            <div style={{marginTop:12,padding:'10px 14px',background:'rgba(255,255,255,0.05)',borderRadius:10,borderLeft:'3px solid #00D68F'}}>
              <p style={{fontSize:11,color:'rgba(255,255,255,0.7)',margin:0,lineHeight:1.6,fontStyle:'italic'}}>
                "{TESTIMONIALS[0].quote}"
              </p>
              <div style={{fontSize:10,color:'#00D68F',marginTop:6,fontWeight:700}}>{TESTIMONIALS[0].name} · {TESTIMONIALS[0].county}</div>
            </div>
          </div>

          <div style={{marginBottom:28}}>
            <h2 style={{fontSize:24,fontWeight:800,marginBottom:4}}>Welcome back</h2>
            <p className="text-muted">Sign in to your PikiShield account</p>
          </div>

          {error && <div className="alert alert-error" style={{marginBottom:16}}>{error}</div>}

          <form onSubmit={e=>{e.preventDefault();doLogin(phone,password);}}>
            <div className="form-group">
              <label className="form-label">Phone, email, member or NOK number</label>
              <input
                className="form-input"
                type="text"
                placeholder="+254712345678 / name@email.com / PS-XXXXXX / NOK-XXXXXX"
                value={phone}
                onChange={e=>setPhone(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={e=>setPassword(e.target.value)}
                required
              />
              <div style={{textAlign:'right',marginTop:5}}>
                <Link to="/forgot-password" style={{fontSize:11.5,color:'var(--green)',fontWeight:600,textDecoration:'none'}}>Forgot password?</Link>
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg"
              type="submit"
              disabled={loading}
              style={{width:'100%',justifyContent:'center',marginTop:4}}
            >
              {loading ? '⏳ Signing in…' : 'Sign In →'}
            </button>
          </form>

          <p style={{textAlign:'center',marginTop:24,fontSize:13,color:'var(--muted)'}}>
            New rider? <Link to="/register" style={{color:'var(--green)',fontWeight:600,textDecoration:'none'}}>Create account →</Link>
          </p>
          <p style={{textAlign:'center',marginTop:8,fontSize:12,color:'var(--muted)'}}>
            <Link to="/forgot-password" style={{color:'var(--muted)',fontWeight:500,textDecoration:'none'}}>🔑 Forgot your password?</Link>
          </p>
        </div>
      </div>
    </div>
  );
}