import React, { useState, useEffect, useRef } from 'react';
import { usersAPI, authAPI, documentsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
const s=(v,fb='')=>v==null?fb:typeof v==='object'?fb:String(v)||fb; const sd=(v)=>s(v,'—');


const COUNTIES = [
  'Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa',
  'Homa Bay','Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi',
  'Kirinyaga','Kisii','Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos',
  'Makueni','Mandera','Marsabit','Meru','Migori','Mombasa',"Murang'a",
  'Nairobi','Nakuru','Nandi','Narok','Nyamira','Nyandarua','Nyeri','Samburu',
  'Siaya','Taita-Taveta','Tana River','Tharaka-Nithi','Trans-Nzoia','Turkana',
  'Uasin Gishu','Vihiga','Wajir','West Pokot',
];

function KycDoc({ label, docType, required, onUploaded, tempId, uploaded }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError]     = useState('');
  const [drag, setDrag]       = useState(false);
  const ref = useRef();

  const upload = async (f) => {
    if (!f) return;
    setUploading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('files', f); fd.append('docType', docType); fd.append('tempUploadId', tempId);
      const res = await documentsAPI.uploadKyc(fd);
      onUploaded(docType, res.data.documents[0]);
    } catch (e) { setError(e.response?.data?.error || 'Upload failed'); }
    finally { setUploading(false); }
  };

  return (
    <div style={{
      border:`1.5px ${uploaded?'solid':'dashed'} ${uploaded?'var(--green)':drag?'var(--green)':'var(--border)'}`,
      borderRadius:8, padding:'9px 12px', background:uploaded?'var(--green-light)':drag?'#F0FDF4':'#FAFAFA', transition:'all .2s'
    }}
      onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);upload(e.dataTransfer.files[0]);}}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:2 }}>
            <span style={{ fontSize:12, fontWeight:600 }}>{label}</span>
            {required && !uploaded && <span style={{ fontSize:9, background:'#FEF2F2', color:'var(--red)', padding:'1px 5px', borderRadius:3, fontWeight:700 }}>REQ</span>}
            {uploaded && <span style={{ fontSize:9, background:'var(--green-light)', color:'var(--green)', padding:'1px 5px', borderRadius:3, fontWeight:700 }}>✓ DONE</span>}
          </div>
          {uploaded ? <div style={{ fontSize:11, color:'var(--green)' }}>📄 {uploaded.originalName || uploaded.name || 'File uploaded'}</div>
                    : <div style={{ fontSize:11, color:'var(--muted)' }}>PDF, JPG, PNG · drag or browse</div>}
          {error && <div style={{ fontSize:11, color:'var(--red)' }}>⚠️ {error}</div>}
        </div>
        <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display:'none' }} onChange={e=>upload(e.target.files[0])}/>
        <button type="button" onClick={()=>ref.current?.click()} disabled={uploading}
          style={{ padding:'5px 10px', borderRadius:6, border:'1.5px solid var(--border)', background:'white', fontSize:11, fontWeight:600, cursor:'pointer', flexShrink:0 }}>
          {uploading?'⏳':uploaded?'↺':'📎'}
        </button>
      </div>
    </div>
  );
}

const RIDER_STEPS   = ['Personal','Bike & ID','Docs'];
const MEMBER_STEPS  = ['Personal','ID & NOK','Doc'];

export default function AgentDashboard() {
  const { user } = useAuth();
  const [data, setData]           = useState({riders:[],members:[],stats:{totalRiders:0,totalMembers:0,pendingKYC:0,activePolicies:0}});
  const [loading, setLoading]     = useState(false);
  const [tab, setTab]             = useState('overview');
  const [regType, setRegType]     = useState('rider'); // 'rider' | 'member'
  const [step, setStep]           = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]     = useState('');
  const [error, setError]         = useState('');
  const [kycDocs, setKycDocs]     = useState({});
  const [tempId, setTempId] = useState(`agent-${Date.now()}`);

  const [form, setForm] = useState({
    fullName:'', phone:'', email:'', password:'Rider@1234',
    nationalId:'', county:'Nairobi', licenseNumber:'', bikeReg:'', bikeType:'Petrol',
    isBikeOwner:true, ownerName:'', ownerPhone:'',
    // funeral member fields
    relationship:'', nokName:'', nokPhone:'',
  });
  const up = (k,v) => setForm(f=>({...f,[k]:v}));

  const load = () => usersAPI.getAgentDashboard()
    .then(r => setData(r.data))
    .catch(()=>{}).finally(()=>setLoading(false));
  useEffect(()=>{ load(); }, []);

  const resetForm = () => {
    setTempId(`agent-${user?.id||'x'}-${Date.now()}`);
    setStep(1); setKycDocs({});
    setForm({ fullName:'', phone:'', email:'', password:'Rider@1234',
      nationalId:'', county:'Nairobi', licenseNumber:'', bikeReg:'', bikeType:'Petrol',
      isBikeOwner:true, ownerName:'', ownerPhone:'',
      relationship:'', nokName:'', nokPhone:'',
    });
  };

  const handleOnboard = async (e) => {
    e.preventDefault();
    setError('');

    // RIDER registration
    if (regType === 'rider') {
      if (step === 1) {
        if (!form.fullName||!form.phone) return setError('Name and phone required');
        return setStep(2);
      }
      if (step === 2) {
        if (!form.nationalId) return setError('National ID required');
        if (!form.licenseNumber) return setError("Rider's license required");
        if (!form.bikeReg) return setError('Bike registration required');
        if (!form.isBikeOwner && !form.ownerName) return setError("Enter bike owner's name");
        return setStep(3);
      }
      // Step 3 — validate docs + submit
      const missing = [];
      if (!kycDocs.national_id) missing.push('National ID');
      if (!kycDocs.riders_license) missing.push("Rider's License");
      if (!kycDocs.insurance_cert) missing.push('Insurance Cert');
      if (missing.length) return setError(`Missing: ${missing.join(', ')}`);

      setSubmitting(true);
      try {
        await authAPI.register({ ...form, isBikeOwner: form.isBikeOwner, agentId: user.id, tempUploadId: tempId });
        // attach docs
        try { await documentsAPI.attachKyc(tempId); } catch {}
        setSuccess(`✅ ${form.fullName} registered as rider! KYC pending admin review.`);
        setTab('overview'); resetForm(); load();
      } catch (err) { setError(err.response?.data?.error||'Registration failed'); }
      finally { setSubmitting(false); }
      return;
    }

    // MEMBER (funeral) registration
    if (regType === 'member') {
      if (step === 1) {
        if (!form.fullName||!form.phone) return setError('Name and phone required');
        return setStep(2);
      }
      if (step === 2) {
        if (!form.nationalId) return setError('National ID required');
        if (!form.relationship) return setError('Relationship to rider required');
        return setStep(3);
      }
      // Step 3 — validate + submit
      if (!kycDocs.national_id) return setError("Member's National ID required");
      setSubmitting(true);
      try {
        const { authAPI: aAPI } = await import('../utils/api');
        const res = await aAPI.registerMember({ ...form, agentId: user.id, tempUploadId: tempId });
        try { await documentsAPI.attachKyc(tempId); } catch {}
        const tp = res.data.tempPassword || 'See SMS';
        const nokInfo = res.data.nok
          ? `\n\n👤 NOK Account Auto-Created:\n  Name: ${form.nokName}\n  Phone: ${form.nokPhone}\n  NOK No: ${res.data.nokNumber || res.data.nok?.nokNumber || '—'}\n  Temp Password: ${res.data.nokTempPassword || '(same as above)'}\n  Login: phone number + temp password`
          : '';
        setSuccess(`✅ ${form.fullName} registered! Member No: ${res.data.memberNumber}\nTemp login: ${form.phone} / ${tp} — member must change on first login.${nokInfo}`);
        setTab('overview'); resetForm(); load();
      } catch (err) { setError(err.response?.data?.error||'Registration failed'); }
      finally { setSubmitting(false); }
      return;
    }
  };

  

  const STEPS = regType === 'rider' ? RIDER_STEPS : MEMBER_STEPS;

  return (
    <div>
      <div className="page-header">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <h1 className="page-title">Agent Dashboard</h1>
            <p className="page-subtitle">
              {user.fullName} · Code: <strong style={{ color:'var(--green)' }}>{user.agentCode}</strong> · {data?.region && typeof data.region !== 'object' ? data.region : ''}
            </p>
          </div>
          <button className="btn btn-primary" onClick={()=>{ setTab(tab==='onboard'?'overview':'onboard'); resetForm(); setError(''); setSuccess(''); }}>
            {tab==='onboard' ? '✕ Cancel' : '➕ Register New'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {success && <div className="alert alert-success">{success}</div>}

        {/* Tabs */}
        <div style={{ display:'flex', gap:6, marginBottom:20 }}>
          {[['overview','📊 Overview'],['riders',`🏍️ Riders (${data?.riders?.length||0})`],['members',`👥 Members (${data?.members?.length||0})`]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} className={`btn btn-sm ${tab===k?'btn-primary':'btn-secondary'}`}>{l}</button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
              {[
                {icon:'🏍️',label:'Riders Enrolled',  value:data?.riders?.length||0,  color:'#00D68F',bg:'#E6FBF3'},
                {icon:'👥',label:'Funeral Members',   value:data?.members?.length||0, color:'#4F46E5',bg:'#EEF2FF'},
                {icon:'⏳',label:'Pending KYC',       value:data?.pendingKYC||0,       color:'#F59E0B',bg:'#FFFBEB'},
              ].map(s=>(
                <div key={s.label} style={{
                  background:'var(--surface)',borderRadius:12,padding:'14px 16px',
                  border:'1px solid var(--border)',position:'relative',overflow:'hidden',
                  boxShadow:'0 1px 4px rgba(0,0,0,.05)',
                }}>
                  <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:s.color,borderRadius:'12px 12px 0 0'}}/>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:34,height:34,borderRadius:9,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{s.icon}</div>
                    <div>
                      <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:800,fontSize:20,color:s.color,lineHeight:1}}>{s.value}</div>
                      <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{s.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="card">
              <h3 style={{ fontSize:15, marginBottom:14 }}>Recent Registrations</h3>
              {!data?.riders?.length && !data?.members?.length ? (
                <div className="empty-state"><div className="emoji">👥</div><p>No registrations yet.</p></div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Name</th><th>Member No.</th><th>Type</th><th>KYC</th><th>Joined</th></tr></thead>
                    <tbody>
                      {[...(data?.riders||[]).map(r=>({...r,_t:'Rider'})), ...(data?.members||[]).map(m=>({...m,_t:'Member'}))].slice(0,8).map(r=>(
                        <tr key={r.id}>
                          <td style={{ fontWeight:600 }}>{s(r.fullName)}</td>
                          <td style={{ fontSize:11, fontFamily:'monospace', color:'var(--muted)' }}>{sd(r.memberNumber)}</td>
                          <td><span className={`tier-badge ${r._t==='Rider'?'tier-green':'tier-yellow'}`}>{s(r._t)}</span></td>
                          <td><span className={`status-badge status-${r.kycStatus==='approved'?'approved':'pending'}`}>{s(r.kycStatus)}</span></td>
                          <td style={{ fontSize:11, color:'var(--muted)' }}>{new Date(r.createdAt).toLocaleDateString('en-KE')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Riders tab */}
        {tab === 'riders' && (
          <div className="card">
            <h3 style={{ fontSize:15, marginBottom:14 }}>My Riders</h3>
            {!data?.riders?.length ? <div className="empty-state"><div className="emoji">🏍️</div><p>No riders yet</p></div> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Name</th><th>Member No.</th><th>County</th><th>Bike</th><th>KYC</th><th>Joined</th></tr></thead>
                  <tbody>
                    {(data.riders||[]).map(r=>(
                      <tr key={r.id}>
                        <td style={{ fontWeight:600 }}>{s(r.fullName)}</td>
                        <td style={{ fontSize:11, fontFamily:'monospace', color:'var(--muted)' }}>{sd(r.memberNumber)}</td>
                        <td>{typeof r.profile?.county==='object'?'—':(r.profile?.county||'—')}</td>
                        <td style={{ fontSize:12 }}>{typeof r.profile?.bikeReg==='object'?'—':(r.profile?.bikeReg||'—')} {r.profile?.isBikeOwner===false && <span style={{ fontSize:10, color:'var(--orange)' }}>not owner</span>}</td>
                        <td><span className={`status-badge status-${r.kycStatus==='approved'?'approved':'pending'}`}>{s(r.kycStatus)}</span></td>
                        <td style={{ fontSize:11, color:'var(--muted)' }}>{new Date(r.createdAt).toLocaleDateString('en-KE')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Members tab */}
        {tab === 'members' && (
          <div className="card">
            <h3 style={{ fontSize:15, marginBottom:14 }}>Funeral Members</h3>
            {!data?.members?.length ? <div className="empty-state"><div className="emoji">👥</div><p>No funeral members yet</p></div> : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Name</th><th>Member No.</th><th>County</th><th>Relationship</th><th>KYC</th><th>Joined</th></tr></thead>
                  <tbody>
                    {(data.members||[]).map(m=>(
                      <tr key={m.id}>
                        <td style={{ fontWeight:600 }}>{s(m.fullName)}</td>
                        <td style={{ fontSize:11, fontFamily:'monospace', color:'var(--muted)' }}>{sd(m.memberNumber)}</td>
                        <td>{typeof m.profile?.county==='object'?'—':(m.profile?.county||'—')}</td>
                        <td style={{ fontSize:12 }}>{typeof m.profile?.relationship==='object'?'—':(m.profile?.relationship||'—')}</td>
                        <td><span className={`status-badge status-${m.kycStatus==='approved'?'approved':'pending'}`}>{s(m.kycStatus)}</span></td>
                        <td style={{ fontSize:11, color:'var(--muted)' }}>{new Date(m.createdAt).toLocaleDateString('en-KE')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Onboard form */}
        {tab === 'onboard' && (
          <div className="card" style={{ maxWidth:640 }}>
            {/* Registration type toggle */}
            <div style={{ display:'flex', gap:8, marginBottom:20 }}>
              {[['rider','🏍️ Rider'],['member','👥 Funeral Member']].map(([k,l])=>(
                <button key={k} type="button"
                  onClick={()=>{ setRegType(k); resetForm(); setError(''); }}
                  style={{ flex:1, padding:'10px 0', borderRadius:8,
                    border:regType===k?'2px solid var(--green)':'1.5px solid var(--border)',
                    background:regType===k?'var(--green-light)':'white',
                    fontWeight:700, fontSize:13, cursor:'pointer',
                    color:regType===k?'var(--green)':'var(--text)' }}>
                  {l}
                </button>
              ))}
            </div>

            <h3 style={{ fontSize:16, marginBottom:2 }}>Register {regType === 'rider' ? 'New Rider' : 'Funeral Member'}</h3>
            <p className="text-muted" style={{ fontSize:12, marginBottom:18 }}>
              {regType === 'rider' ? 'Rider will receive an SMS with login credentials.' : 'Funeral member gets a unique membership number.'}
            </p>

            {/* Step bar */}
            <div style={{ display:'flex', gap:6, marginBottom:20 }}>
              {STEPS.map((s,i)=>(
                <div key={s} style={{ flex:1 }}>
                  <div style={{ height:3, borderRadius:2, transition:'background .3s', background:step>i?'var(--green)':step===i+1?'var(--green-mid)':'var(--border)' }}/>
                  <div style={{ fontSize:10, marginTop:3, fontWeight:step===i+1?700:400, color:step===i+1?'var(--text)':'var(--muted)' }}>{s}</div>
                </div>
              ))}
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleOnboard}>
              {/* ── RIDER STEPS ── */}
              {regType === 'rider' && step === 1 && (
                <>
                  <div className="two-col">
                    <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" placeholder="Jane Kamau" value={form.fullName} onChange={e=>up('fullName',e.target.value)} required /></div>
                    <div className="form-group"><label className="form-label">Phone (M-Pesa)</label><input className="form-input" placeholder="+254712345678" value={form.phone} onChange={e=>up('phone',e.target.value)} required /></div>
                  </div>
                  <div className="form-group"><label className="form-label">Email (optional)</label><input className="form-input" type="email" value={form.email} onChange={e=>up('email',e.target.value)}/></div>
                  <div className="form-group"><label className="form-label">Temporary Password</label><input className="form-input" value={form.password} onChange={e=>up('password',e.target.value)} required /><p style={{ fontSize:11, color:'var(--muted)', marginTop:3 }}>Rider changes on first login</p></div>
                  <button className="btn btn-primary" type="submit" style={{ width:'100%', justifyContent:'center' }}>Continue →</button>
                </>
              )}
              {regType === 'rider' && step === 2 && (
                <>
                  <div className="two-col">
                    <div className="form-group"><label className="form-label">National ID *</label><input className="form-input" placeholder="12345678" value={form.nationalId} onChange={e=>up('nationalId',e.target.value)} required /></div>
                    <div className="form-group"><label className="form-label">County</label>
                      <select className="form-input" value={form.county} onChange={e=>up('county',e.target.value)}>
                        {COUNTIES.map(c=><option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label className="form-label">License No. *</label><input className="form-input" placeholder="DL-NBI-..." value={form.licenseNumber} onChange={e=>up('licenseNumber',e.target.value)} required /></div>
                    <div className="form-group"><label className="form-label">Bike Reg. *</label><input className="form-input" placeholder="KCZ 123A" value={form.bikeReg} onChange={e=>up('bikeReg',e.target.value)} required /></div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bike Type</label>
                    <div style={{ display:'flex', gap:8 }}>
                      {['Petrol','EV','Hybrid'].map(t=>(
                        <button key={t} type="button" onClick={()=>up('bikeType',t)}
                          style={{ flex:1, padding:'7px 0', borderRadius:7, border:form.bikeType===t?'2px solid var(--green)':'1.5px solid var(--border)', background:form.bikeType===t?'var(--green-light)':'white', fontSize:12, fontWeight:600, cursor:'pointer', color:form.bikeType===t?'var(--green)':'var(--text)' }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Is the rider the registered bike owner?</label>
                    <div style={{ display:'flex', gap:8 }}>
                      {[['yes',true,'Yes, owns the bike'],['no',false,'No, different owner']].map(([k,v,l])=>(
                        <button key={k} type="button" onClick={()=>up('isBikeOwner',v)}
                          style={{ flex:1, padding:'7px 0', borderRadius:7, border:form.isBikeOwner===v?'2px solid var(--green)':'1.5px solid var(--border)', background:form.isBikeOwner===v?'var(--green-light)':'white', fontSize:12, fontWeight:600, cursor:'pointer', color:form.isBikeOwner===v?'var(--green)':'var(--text)' }}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  {!form.isBikeOwner && (
                    <div className="two-col" style={{ background:'#FFF8E1', borderRadius:8, padding:'10px', marginBottom:14 }}>
                      <div className="form-group" style={{ marginBottom:0 }}><label className="form-label">Owner's Name *</label><input className="form-input" value={form.ownerName} onChange={e=>up('ownerName',e.target.value)} required /></div>
                      <div className="form-group" style={{ marginBottom:0 }}><label className="form-label">Owner's Phone *</label><input className="form-input" value={form.ownerPhone} onChange={e=>up('ownerPhone',e.target.value)} required /></div>
                    </div>
                  )}
                  <div style={{ display:'flex', gap:10 }}>
                    <button className="btn btn-secondary" type="button" onClick={()=>setStep(1)}>← Back</button>
                    <button className="btn btn-primary" style={{ flex:1, justifyContent:'center' }} type="submit">Continue →</button>
                  </div>
                </>
              )}
              {regType === 'rider' && step === 3 && (
                <>
                  <div style={{ background:'#FFF8E1', border:'1px solid #FDE68A', borderRadius:8, padding:'8px 12px', marginBottom:12, fontSize:12 }}>
                    ⚠️ All 3 documents are <strong>required</strong> to activate this rider's account.
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
                    <KycDoc label="National ID (Front & Back)" docType="national_id" required onUploaded={(t,d)=>setKycDocs(p=>({...p,[t]:d}))} tempId={tempId} uploaded={kycDocs.national_id}/>
                    <KycDoc label="Rider's License" docType="riders_license" required onUploaded={(t,d)=>setKycDocs(p=>({...p,[t]:d}))} tempId={tempId} uploaded={kycDocs.riders_license}/>
                    <KycDoc label="Bike Insurance Certificate" docType="insurance_cert" required onUploaded={(t,d)=>setKycDocs(p=>({...p,[t]:d}))} tempId={tempId} uploaded={kycDocs.insurance_cert}/>
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <button className="btn btn-secondary" type="button" onClick={()=>setStep(2)}>← Back</button>
                    <button className="btn btn-primary btn-lg" style={{ flex:1, justifyContent:'center' }} type="submit" disabled={submitting}>
                      {submitting ? '⏳ Registering…' : '✅ Complete Registration'}
                    </button>
                  </div>
                </>
              )}

              {/* ── MEMBER STEPS ── */}
              {regType === 'member' && step === 1 && (
                <>
                  <div className="two-col">
                    <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" placeholder="Mary Kamau" value={form.fullName} onChange={e=>up('fullName',e.target.value)} required /></div>
                    <div className="form-group"><label className="form-label">Phone</label><input className="form-input" placeholder="+254..." value={form.phone} onChange={e=>up('phone',e.target.value)} required /></div>
                  </div>
                  <div className="two-col">
                    <div className="form-group"><label className="form-label">County</label>
                      <select className="form-input" value={form.county} onChange={e=>up('county',e.target.value)}>
                        {COUNTIES.map(c=><option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label className="form-label">Relationship to Rider *</label>
                      <select className="form-input" value={form.relationship} onChange={e=>up('relationship',e.target.value)} required>
                        <option value="">-- Select --</option>
                        {['Spouse','Child','Parent','Sibling','Other'].map(r=><option key={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                  <button className="btn btn-primary" type="submit" style={{ width:'100%', justifyContent:'center' }}>Continue →</button>
                </>
              )}
              {regType === 'member' && step === 2 && (
                <>
                  <div className="two-col">
                    <div className="form-group"><label className="form-label">National ID *</label><input className="form-input" placeholder="12345678" value={form.nationalId} onChange={e=>up('nationalId',e.target.value)} required /></div>
                    <div className="form-group"><label className="form-label">Temporary Password</label><input className="form-input" value={form.password} onChange={e=>up('password',e.target.value)} required /></div>
                  </div>
                  {/* NOK Details */}
                  <div style={{background:'#F0FDF4',border:'1px solid #A7F3D0',borderRadius:10,padding:'12px 14px',marginTop:4}}>
                    <div style={{fontSize:12,fontWeight:700,color:'#065F46',marginBottom:10}}>👤 Next of Kin (NOK) Details</div>
                    <div className="two-col">
                      <div className="form-group" style={{marginBottom:8}}>
                        <label className="form-label">NOK Full Name *</label>
                        <input className="form-input" placeholder="e.g. Mary Kamau" value={form.nokName} onChange={e=>up('nokName',e.target.value)} required />
                      </div>
                      <div className="form-group" style={{marginBottom:8}}>
                        <label className="form-label">NOK Phone *</label>
                        <input className="form-input" placeholder="+254712345678" value={form.nokPhone} onChange={e=>up('nokPhone',e.target.value)} required />
                      </div>
                    </div>
                    <div className="form-group" style={{marginBottom:0}}>
                      <label className="form-label">Relationship to Member *</label>
                      <select className="form-input" value={form.relationship} onChange={e=>up('relationship',e.target.value)} required>
                        <option value="">Select…</option>
                        <option value="spouse">Spouse</option>
                        <option value="child">Child</option>
                        <option value="parent">Parent</option>
                        <option value="sibling">Sibling</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div style={{fontSize:11,color:'#047857',marginTop:8,lineHeight:1.5}}>
                      ℹ️ A NOK account will be auto-created. They will receive login credentials to submit funeral claims.
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:10, marginTop:12 }}>
                    <button className="btn btn-secondary" type="button" onClick={()=>setStep(1)}>← Back</button>
                    <button className="btn btn-primary" style={{ flex:1, justifyContent:'center' }} type="submit">Continue →</button>
                  </div>
                </>
              )}
              {regType === 'member' && step === 3 && (
                <>
                  <div style={{ background:'#FFF8E1', border:'1px solid #FDE68A', borderRadius:8, padding:'8px 12px', marginBottom:12, fontSize:12 }}>
                    ⚠️ Member's National ID is required.
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
                    <KycDoc label="Member's National ID" docType="national_id" required onUploaded={(t,d)=>setKycDocs(p=>({...p,[t]:d}))} tempId={tempId} uploaded={kycDocs.national_id}/>
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <button className="btn btn-secondary" type="button" onClick={()=>setStep(2)}>← Back</button>
                    <button className="btn btn-primary btn-lg" style={{ flex:1, justifyContent:'center' }} type="submit" disabled={submitting}>
                      {submitting ? '⏳ Registering…' : '✅ Register Member'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
