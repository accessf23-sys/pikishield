import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { policiesAPI, authAPI, documentsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const PACKAGE_INFO = {
  bail:       { icon: '⚖️', color: '#0066FF', features: ['Traffic arrest bail up to KES 20,000', 'Max 2 claims/year', 'Police abstract required', 'Claims open after 3 months of cover'], ideal: 'Ideal for riders with high road exposure' },
  bail_income:{ icon: '🛡️', color: '#00C896', features: ['Bail up to KES 20,000 + Stipend KES 15,000', 'Bail: max 2 claims/year', 'Stipend: max 2/year (6-month gap)', 'Doctor\'s note & hospital details required for stipend', 'Claims open after 3 months of cover'], ideal: 'Best value — full income protection', popular: true },
  funeral:    { icon: '🕊️', color: '#FF6B35', features: ['Up to 3 household members (max age 70)', 'Cover up to KES 200,000 — no minimum', 'Claims open after 3 months', 'NOK can lodge claims directly', 'Death certificate + burial permit required'], ideal: 'Protect loved ones from funeral costs' },
};

const normalizeKEPhone = (phone) => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '254' + cleaned.substring(1);
  else if (cleaned.startsWith('7') || cleaned.startsWith('1')) cleaned = '254' + cleaned;
  return cleaned;
};

function NokIdUploader({ onUploaded, uploaded, tempId }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const ref = useRef();
  const upload = async (f) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { setErr('File too large — max 10MB'); return; }
    setUploading(true); setErr('');
    try {
      const fd = new FormData();
      fd.append('files', f); fd.append('docType', 'national_id'); fd.append('tempUploadId', tempId);
      const res = await documentsAPI.uploadKyc(fd);
      onUploaded(res.data.documents[0]);
    } catch(e) { setErr(e.response?.data?.error||'Upload failed'); }
    finally { setUploading(false); }
  };
  return (
    <div style={{
      border:`1.5px ${uploaded?'solid':'dashed'} ${uploaded?'var(--green)':'var(--border)'}`,
      borderRadius:8, padding:'10px 14px',
      background:uploaded?'var(--green-light)':'#FAFAFA',
    }}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{flex:1}}>
          <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:3}}>
            <span style={{fontSize:12,fontWeight:600}}>NOK National ID Copy</span>
            {!uploaded && <span style={{fontSize:9,background:'#FEF2F2',color:'var(--red)',padding:'1px 5px',borderRadius:3,fontWeight:700}}>REQUIRED</span>}
            {uploaded && <span style={{fontSize:9,background:'var(--green-light)',color:'var(--green)',padding:'1px 5px',borderRadius:3,fontWeight:700}}>✓ UPLOADED</span>}
          </div>
          {uploaded ? <div style={{fontSize:11,color:'var(--green)'}}>📄 {uploaded.originalName}</div>
                    : <div style={{fontSize:11,color:'var(--muted)'}}>PDF, JPG or PNG · max 10MB</div>}
          {err && <div style={{fontSize:11,color:'var(--red)',marginTop:2}}>⚠️ {err}</div>}
        </div>
        <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:'none'}} onChange={e=>upload(e.target.files[0])}/>
        <button type="button" onClick={()=>ref.current?.click()} disabled={uploading}
          style={{padding:'6px 12px',borderRadius:6,border:'1.5px solid var(--border)',background:'white',fontSize:12,fontWeight:600,cursor:'pointer',flexShrink:0}}>
          {uploading?'⏳':uploaded?'↺ Replace':'📎 Browse'}
        </button>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  const { user } = useAuth();
  const kycApproved = user?.kycStatus === 'approved';
  const [packages, setPackages] = useState({});
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState(1); // 1=pick, 2=members, 3=nok, 4=done
  const [members, setMembers] = useState([{ name: '', relation: '', age: '', id: '' }]);
  const [nokForm, setNokForm] = useState({ fullName: '', phone: '', nationalId: '', password: '' });
  const [newPolicyId, setNewPolicyId] = useState(null);
  const [nokResult, setNokResult] = useState(null);
  const [nokIdDoc, setNokIdDoc]   = useState(null);
  const [nokTempId, setNokTempId] = useState(`nok-${Date.now()}`);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => { policiesAPI.getPackages().then(r => setPackages(r.data)); }, []);

  const handleSubscribe = async () => {
    if (!selected) return;
    setLoading(true); setError('');
    try {
      const payload = { type: selected };
      if (selected === 'funeral') payload.members = members.filter(m => m.name);
      const res = await policiesAPI.subscribe(payload);
      setNewPolicyId(res.data.policy.id);
      setSuccess(res.data.message);
      if (selected === 'funeral') {
        setStep(3); // go to NOK registration
      } else {
        setTimeout(() => navigate('/policies'), 2000);
      }
    } catch (err) { setError(err.response?.data?.error || 'Subscription failed'); }
    finally { setLoading(false); }
  };

  const handleNokRegister = async () => {
    if (!nokForm.fullName || !nokForm.phone || !nokForm.nationalId || !nokForm.password) {
      return setError('All NOK fields are required');
    }
    if (!nokIdDoc) return setError('NOK must upload their National ID copy before registering');
    setLoading(true); setError('');
    try {
      const res = await authAPI.registerNok({ ...nokForm, phone: normalizeKEPhone(nokForm.phone), policyId: newPolicyId, tempUploadId: nokTempId });
      // Attach the uploaded ID doc to the new NOK user
      try { await documentsAPI.attachKyc(nokTempId); } catch {}
      setNokResult(res.data);
      setNokTempId(`nok-${Date.now()}`);
      setStep(4);
    } catch (err) { setError(err.response?.data?.error || 'NOK registration failed'); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line no-unused-vars
  const info = selected ? PACKAGE_INFO[selected] : null;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Choose Your Protection</h1>
        <p className="page-subtitle">Select a package that fits your needs and budget</p>
      </div>
      <div className="page-body">
        {error && <div className="alert alert-error">❌ {error}</div>}
        {success && step < 3 && <div className="alert alert-success">✅ {success}</div>}

        {!kycApproved && (
          <div style={{ background: '#FEF3C7', border: '2px solid #F59E0B', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>⏳</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: '#92400E', marginBottom: 3 }}>KYC Pending — Browse Only</div>
              <div style={{ fontSize: 12, color: '#78350F', lineHeight: 1.6 }}>
                You can explore packages but <strong>cannot enroll or pay</strong> until your KYC is approved by an admin.
              </div>
            </div>
          </div>
        )}

        {/* Step 1 — Package selection */}
        {step === 1 && (
          <>
            <div className="three-col" style={{ marginBottom: 24 }}>
              {Object.entries(packages).map(([key, pkg]) => {
                const i = PACKAGE_INFO[key];
                const isSel = selected === key;
                return (
                  <div key={key} className="card" onClick={() => setSelected(key)} style={{
                    cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                    border: isSel ? `2px solid ${i?.color}` : '1.5px solid var(--border)',
                    transform: 'none',
                    boxShadow: isSel ? `0 8px 32px ${i?.color}22` : 'var(--shadow)',
                  }}>
                    {i?.popular && <div style={{ position: 'absolute', top: 14, right: -18, background: 'var(--green)', color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 26px', transform: 'rotate(45deg)', letterSpacing: 0.5 }}>POPULAR</div>}
                    {isSel && <div style={{ position: 'absolute', top: 12, left: 12, width: 22, height: 22, borderRadius: '50%', background: i?.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12 }}>✓</div>}
                    <div style={{ fontSize: 36, marginBottom: 12 }}>{i?.icon}</div>
                    <h3 style={{ fontSize: 17, marginBottom: 4 }}>{pkg.name}</h3>
                    <p className="text-muted" style={{ fontSize: 12, marginBottom: 14 }}>{i?.ideal}</p>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 14 }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 28, color: i?.color }}>KES {pkg.dailyContribution}</span>
                      <span className="text-muted" style={{ fontSize: 13 }}>/day</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
                      {i?.features.map(f => <div key={f} style={{ display: 'flex', gap: 8, fontSize: 12 }}><span style={{ color: i?.color, fontWeight: 700, flexShrink: 0 }}>✓</span>{f}</div>)}
                    </div>
                    <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px' }}>
                      {Object.entries(pkg.coverages).map(([k, v]) => (
                        <div key={k} style={{ fontSize: 12, color: 'var(--muted)' }}>
                          <strong style={{ textTransform: 'capitalize' }}>{k}</strong> cover: <span style={{ color: i?.color, fontWeight: 700 }}>KES {v.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {selected && (
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setSelected(null)}>Deselect</button>
                <button className="btn btn-primary btn-lg" onClick={() => selected === 'funeral' ? setStep(2) : handleSubscribe()} disabled={loading || !kycApproved} title={!kycApproved ? 'KYC verification required to enroll' : ''}>
                  {loading ? 'Enrolling...' : kycApproved ? `🛡️ Enroll in ${packages[selected]?.name}` : '🔒 KYC Required to Enroll'}
                </button>
              </div>
            )}
          </>
        )}

        {/* Step 2 — Funeral members */}
        {step === 2 && selected === 'funeral' && (
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <span style={{ fontSize: 28 }}>🕊️</span>
              <div>
                <h3 style={{ fontSize: 17 }}>Nominate Household Members</h3>
                <p className="text-muted" style={{ fontSize: 12 }}>Up to 3 members · Maximum age 70 years</p>
              </div>
            </div>
            <hr className="divider" />
            {members.slice(0, 3).map((m, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.7fr 1.5fr auto', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                <input className="form-input" placeholder="Full Name" value={m.name} onChange={e => { const ms = [...members]; ms[i].name = e.target.value; setMembers(ms); }} />
                <select className="form-input" value={m.relation} onChange={e => { const ms = [...members]; ms[i].relation = e.target.value; setMembers(ms); }}>
                  <option value="">Relation</option>
                  {['Mother','Father','Spouse','Child','Sibling','Parent'].map(r => <option key={r}>{r}</option>)}
                </select>
                <div>
                  <input className="form-input" type="number" placeholder="Age"
                    min={1} max={70}
                    value={m.age}
                    onChange={e => {
                      const v = e.target.value;
                      if (v !== '' && parseInt(v,10) > 70) { setError('Maximum age for funeral cover is 70 years'); return; }
                      setError('');
                      const ms = [...members]; ms[i].age = v; setMembers(ms);
                    }}
                    style={{ borderColor: m.age && parseInt(m.age,10) > 70 ? 'var(--red)' : undefined }}
                  />
                  {m.age && parseInt(m.age,10) > 70 && <div style={{fontSize:10,color:'var(--red)',marginTop:2}}>Max 70 yrs</div>}
                </div>
                <input className="form-input" placeholder="National ID" value={m.id} onChange={e => { const ms = [...members]; ms[i].id = e.target.value; setMembers(ms); }} />
                {members.length > 1 && <button type="button" onClick={() => setMembers(members.filter((_, j) => j !== i))} style={{ background: '#FFF0F0', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', fontSize: 16 }}>✕</button>}
              </div>
            ))}
            {members.length < 3 && (
              <button className="btn btn-secondary btn-sm" style={{ marginBottom: 20 }} onClick={() => setMembers([...members, { name: '', relation: '', age: '', id: '' }])}>+ Add member</button>
            )}
            <div className="alert alert-info">
              🔗 <strong>Next step:</strong> You'll register a <strong>Next of Kin (NOK)</strong> who can log in and lodge funeral claims on your behalf if needed.
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary btn-lg" onClick={handleSubscribe} disabled={loading}>
                {loading ? 'Enrolling...' : '🛡️ Enroll & Continue to NOK Setup'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — NOK registration */}
        {step === 3 && (
          <div className="card" style={{ maxWidth: 560 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 32 }}>🔗</span>
              <div>
                <h3 style={{ fontSize: 18 }}>Register Next of Kin (NOK)</h3>
                <p className="text-muted" style={{ fontSize: 13 }}>Your NOK gets a unique login to lodge funeral claims on your behalf</p>
              </div>
            </div>
            <div className="alert alert-success" style={{ marginBottom: 20 }}>✅ {success}</div>
            <div className="alert alert-info" style={{ marginBottom: 20 }}>
              <strong>Why register a NOK?</strong> If the principal contributor passes away, the NOK can log in using their unique NOK number and lodge a funeral claim on behalf of the family — without needing the principal's credentials.
            </div>
            {error && <div className="alert alert-error">❌ {error}</div>}
            <div className="form-group">
              <label className="form-label">NOK Full Name</label>
              <input className="form-input" placeholder="Mary Kamau" value={nokForm.fullName} onChange={e => setNokForm(f => ({ ...f, fullName: e.target.value }))} />
            </div>
            <div className="two-col">
              <div className="form-group">
                <label className="form-label">NOK Phone Number</label>
                <input className="form-input" placeholder="+254712345678" value={nokForm.phone} onChange={e => setNokForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">NOK National ID</label>
                <input className="form-input" placeholder="87654321" value={nokForm.nationalId} onChange={e => setNokForm(f => ({ ...f, nationalId: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">NOK Password (they will use this to log in)</label>
              <input className="form-input" type="password" placeholder="Min 8 characters" value={nokForm.password} onChange={e => setNokForm(f => ({ ...f, password: e.target.value }))} minLength={8} />
            </div>
            {/* ID Upload — required */}
            <div style={{ marginBottom: 16 }}>
              <NokIdUploader onUploaded={setNokIdDoc} uploaded={nokIdDoc} tempId={nokTempId}/>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => navigate('/policies')}>Skip (do later)</button>
              <button className="btn btn-primary btn-lg" onClick={handleNokRegister} disabled={loading}>
                {loading ? 'Registering NOK...' : '🔗 Register NOK Account'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4 — Done + show NOK credentials */}
        {step === 4 && nokResult && (
          <div className="card" style={{ maxWidth: 560 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 56 }}>🎉</div>
              <h3 style={{ fontSize: 22, marginTop: 12, marginBottom: 6 }}>All Set!</h3>
              <p className="text-muted">Funeral protection active. NOK account created.</p>
            </div>

            {/* Credentials card — prominent */}
            <div style={{ background: 'linear-gradient(135deg, #0A1628, #06352A)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16, textAlign: 'center' }}>
                🔐 NOK Login Credentials — Save These Now
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Login ID (NOK Number)', value: nokResult.nokNumber, highlight: true },
                  { label: 'Phone Number', value: nokForm.phone },
                  { label: 'Password', value: nokForm.password },
                  { label: 'Login URL', value: 'pikishield.co.ke/login' },
                ].map(({ label, value, highlight }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '10px 14px' }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{label}</span>
                    <span style={{ fontSize: highlight ? 18 : 13, fontWeight: 800, color: highlight ? '#00D68F' : 'white', letterSpacing: highlight ? 2 : 0 }}>{value}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, background: 'rgba(255,165,0,0.15)', border: '1px solid rgba(255,165,0,0.4)', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#FFD080', textAlign: 'center' }}>
                ⚠️ Screenshot or write down these credentials. The password will not be shown again.
              </div>
            </div>

            {/* Instructions */}
            <div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: 10, padding: 14, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#065F46', marginBottom: 8 }}>📱 Share with {nokForm.fullName}</div>
              <div style={{ fontSize: 12, color: '#047857', lineHeight: 1.7 }}>
                Tell them to go to <strong>pikishield.co.ke/login</strong> and enter:<br/>
                • <strong>NOK Number:</strong> {nokResult.nokNumber}<br/>
                • <strong>Password:</strong> their password (set above)<br/>
                They can also log in with their phone number: <strong>{nokForm.phone}</strong>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/policies')}>
              Go to My Policies →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
