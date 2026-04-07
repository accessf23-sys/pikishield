import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { documentsAPI, authAPI } from '../utils/api';
import CameraCapture from '../components/CameraCapture';
import PikiLogo from '../components/PikiLogo';

const COUNTIES = [
  'Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa',
  'Homa Bay','Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi',
  'Kirinyaga','Kisii','Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos',
  'Makueni','Mandera','Marsabit','Meru','Migori','Mombasa',"Murang'a",
  'Nairobi','Nakuru','Nandi','Narok','Nyamira','Nyandarua','Nyeri','Samburu',
  'Siaya','Taita-Taveta','Tana River','Tharaka-Nithi','Trans-Nzoia','Turkana',
  'Uasin Gishu','Vihiga','Wajir','West Pokot',
];

function KycUploader({ label, docType, required, onUploaded, tempId, uploaded }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
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
  const isUploaded = !!uploaded;
  return (
    <div style={{border:`1.5px ${isUploaded?'solid':'dashed'} ${isUploaded?'var(--green)':drag?'var(--green)':'var(--border)'}`,borderRadius:8,padding:'10px 12px',background:isUploaded?'var(--green-light)':drag?'#F0FDF4':'#FAFAFA',transition:'all .2s'}}
      onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);upload(e.dataTransfer.files[0]);}}>
      <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
        <div style={{flex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
            <span style={{fontSize:12,fontWeight:600}}>{label}</span>
            {required && !isUploaded && <span style={{fontSize:9,background:'#FEF2F2',color:'var(--red)',padding:'1px 5px',borderRadius:3,fontWeight:700}}>REQUIRED</span>}
            {isUploaded && <span style={{fontSize:9,background:'var(--green-light)',color:'var(--green)',padding:'1px 5px',borderRadius:3,fontWeight:700}}>✓ UPLOADED</span>}
          </div>
          {isUploaded ? <div style={{fontSize:11,color:'var(--green)'}}>📄 {uploaded.originalName} · {(uploaded.size/1024).toFixed(0)} KB</div>
            : <div style={{fontSize:11,color:'var(--muted)'}}>JPG, PNG or PDF · drag, browse or take photo</div>}
          {error && <div style={{fontSize:11,color:'var(--red)',marginTop:2}}>⚠️ {error}</div>}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:5,flexShrink:0}}>
          <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,image/*" style={{display:'none'}} onChange={e=>upload(e.target.files[0])}/>
          {isUploaded ? (
            <button type="button" onClick={()=>ref.current?.click()} disabled={uploading}
              style={{padding:'5px 10px',borderRadius:6,border:'1.5px solid var(--border)',background:'white',fontSize:11,fontWeight:600,cursor:'pointer'}}>↺ Replace</button>
          ) : (
            <>
              <button type="button" onClick={()=>ref.current?.click()} disabled={uploading}
                style={{padding:'5px 10px',borderRadius:6,border:'1.5px solid var(--border)',background:'white',fontSize:11,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
                {uploading ? '⏳ Uploading…' : '📁 Browse'}
              </button>
              <CameraCapture disabled={uploading} color="var(--green)" onCapture={f=>upload(f)}/>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const normalizePhone = (phone) => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '254' + cleaned.substring(1);
  else if (cleaned.startsWith('7') || cleaned.startsWith('1')) cleaned = '254' + cleaned;
  return cleaned;
};

// ── RIDER REGISTRATION (existing 3-step flow) ───────────────────────────────
function RiderRegister({ onBack }) {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [kycDocs, setKycDocs] = useState({});
  const tempId = useRef(`reg-${Date.now()}`).current;
  const [form, setForm] = useState({
    fullName:'', phone:'', email:'', password:'', confirmPassword:'',
    nationalId:'', county:'Nairobi', licenseNumber:'', bikeReg:'', bikeType:'Petrol',
    isBikeOwner:true, ownerName:'', ownerPhone:'',
  });
  const up = (k,v) => setForm(f=>({...f,[k]:v}));
  const handleUploaded = (docType, doc) => setKycDocs(prev=>({...prev,[docType]:doc}));

  const STEPS = ['Account','Rider Info','Documents'];
  const isStepComplete = (i) => {
    if (i===0) return !!(form.fullName && form.phone && form.password && form.password===form.confirmPassword);
    if (i===1) return !!(form.nationalId && form.bikeReg && form.licenseNumber);
    return [kycDocs.national_id,kycDocs.riders_license,kycDocs.insurance_cert].filter(Boolean).length===3;
  };

  const next = (e) => {
    e.preventDefault();
    if (step===1) {
      if (!form.fullName.trim()) return setError('Full name is required');
      if (!form.phone.trim()) return setError('Phone number is required');
      const cleaned = form.phone.replace(/\D/g,''); if (cleaned.length<9||cleaned.length>12) return setError('Enter a valid Kenyan phone number');
      if (form.password!==form.confirmPassword) return setError('Passwords do not match');
      if (form.password.length<8) return setError('Password must be at least 8 characters');
      setError(''); setStep(2);
    } else if (step===2) {
      if (!form.nationalId) return setError('National ID is required');
      if (!form.licenseNumber) return setError("Rider's license number is required");
      if (!form.bikeReg) return setError('Bike registration is required');
      if (!form.isBikeOwner && !form.ownerName.trim()) return setError("Enter bike owner's name");
      if (!form.isBikeOwner && !form.ownerPhone.trim()) return setError("Enter bike owner's phone number");
      setError(''); setStep(3);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const missing = [];
    if (!kycDocs.national_id) missing.push('National ID');
    if (!kycDocs.riders_license) missing.push("Rider's License");
    if (!kycDocs.insurance_cert) missing.push('Bike Insurance Certificate');
    if (missing.length) return setError(`Please upload: ${missing.join(', ')}`);
    if (form.password!==form.confirmPassword) return setError('Passwords do not match');
    setError(''); setLoading(true);
    try {
      await register({...form, phone:normalizePhone(form.phone), tempUploadId:tempId});
      try { await documentsAPI.attachKyc({tempUploadId:tempId}); } catch {}
      const savedPhone = normalizePhone(form.phone);
      const savedPass = form.password;
      window.confirm(
        `✅ Registration successful!\n\n📱 Phone: ${savedPhone}\n🔑 Password: ${savedPass}\n\nIMPORTANT: Save these credentials — you will need them to log in.\n\nPress OK to go to login.`
      );
      navigate('/login');
    } catch (err) { setError(err.response?.data?.error || 'Registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <>
      {/* Step bar */}
      <div style={{display:'flex',gap:6,marginBottom:24}}>
        {STEPS.map((s,i)=>(
          <div key={s} style={{flex:1}}>
            <div style={{height:3,borderRadius:2,background:step>i+1?'var(--green)':step===i+1?'var(--green-mid)':'var(--border)',transition:'background .3s'}}/>
            <div style={{fontSize:10,marginTop:3,fontWeight:step===i+1?700:400,color:step===i+1?'var(--text)':'var(--muted)'}}>{isStepComplete(i)?'✅ '+s:s}</div>
          </div>
        ))}
      </div>
      <h2 style={{fontSize:22,fontWeight:800,marginBottom:2}}>
        {step===1?'Create Your Account':step===2?'Rider Details':'Upload Documents'}
      </h2>
      <p className="text-muted" style={{marginBottom:18,fontSize:12}}>
        {step===1?'Step 1 of 3 — Personal information':step===2?'Step 2 of 3 — KYC & bike details':'Step 3 of 3 — All 3 documents required'}
      </p>
      {error && <div className="alert alert-error">{error}</div>}

      {step===1 && (
        <form onSubmit={next}>
          <div className="form-group"><label className="form-label">Full Name</label>
            <input className="form-input" placeholder="James Mwangi" value={form.fullName} onChange={e=>up('fullName',e.target.value)} required/></div>
          <div className="form-group"><label className="form-label">Phone Number (M-Pesa)</label>
            <input className="form-input" placeholder="+254712345678" value={form.phone} onChange={e=>up('phone',e.target.value)} required/></div>
          <div className="form-group"><label className="form-label">Email <span style={{color:'var(--muted)',fontWeight:400}}>(optional)</span></label>
            <input className="form-input" type="email" placeholder="james@email.com" value={form.email} onChange={e=>up('email',e.target.value)}/></div>
          <div className="two-col">
            <div className="form-group"><label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Min 8 chars" value={form.password} onChange={e=>up('password',e.target.value)} required minLength={8}/></div>
            <div className="form-group"><label className="form-label">Confirm Password</label>
              <input className="form-input" type="password" placeholder="Repeat" value={form.confirmPassword} onChange={e=>up('confirmPassword',e.target.value)} required/></div>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button className="btn btn-secondary" type="button" onClick={onBack}>← Change</button>
            <button className="btn btn-primary btn-lg" style={{flex:1,justifyContent:'center'}} type="submit">Continue →</button>
          </div>
        </form>
      )}

      {step===2 && (
        <form onSubmit={next}>
          <div className="two-col">
            <div className="form-group"><label className="form-label">National ID Number</label>
              <input className="form-input" placeholder="12345678" value={form.nationalId} onChange={e=>up('nationalId',e.target.value)} required/></div>
            <div className="form-group"><label className="form-label">County</label>
              <select className="form-input" value={form.county} onChange={e=>up('county',e.target.value)}>
                {COUNTIES.map(c=><option key={c}>{c}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Rider's License No. *</label>
              <input className="form-input" placeholder="DL-NBI-2021-..." value={form.licenseNumber} onChange={e=>up('licenseNumber',e.target.value)} required/></div>
            <div className="form-group"><label className="form-label">Bike Registration No. *</label>
              <input className="form-input" placeholder="KCZ 123A" value={form.bikeReg} onChange={e=>up('bikeReg',e.target.value)} required/></div>
          </div>
          <div className="form-group"><label className="form-label">Bike Type</label>
            <div style={{display:'flex',gap:8}}>
              {['Petrol','EV','Hybrid'].map(t=>(
                <button key={t} type="button" onClick={()=>up('bikeType',t)}
                  style={{flex:1,padding:'8px 0',borderRadius:8,border:form.bikeType===t?'2px solid var(--green)':'1.5px solid var(--border)',background:form.bikeType===t?'var(--green-light)':'white',fontWeight:600,fontSize:13,cursor:'pointer',color:form.bikeType===t?'var(--green)':'var(--text)'}}>
                  {t}</button>
              ))}</div></div>
          <div className="form-group"><label className="form-label">Are you the registered owner of this bike?</label>
            <div style={{display:'flex',gap:8}}>
              {[['yes',true,'Yes, I own it'],['no',false,"No, it's not mine"]].map(([key,val,lbl])=>(
                <button key={key} type="button" onClick={()=>up('isBikeOwner',val)}
                  style={{flex:1,padding:'8px 12px',borderRadius:8,border:form.isBikeOwner===val?'2px solid var(--green)':'1.5px solid var(--border)',background:form.isBikeOwner===val?'var(--green-light)':'white',fontWeight:600,fontSize:12,cursor:'pointer',color:form.isBikeOwner===val?'var(--green)':'var(--text)'}}>
                  {lbl}</button>
              ))}</div></div>
          {!form.isBikeOwner && (
            <div className="two-col" style={{background:'#FFF8E1',border:'1px solid #FDE68A',borderRadius:8,padding:'12px 14px',marginBottom:16}}>
              <div className="form-group" style={{marginBottom:0}}><label className="form-label">Bike Owner's Full Name *</label>
                <input className="form-input" placeholder="Owner name" value={form.ownerName} onChange={e=>up('ownerName',e.target.value)} required/></div>
              <div className="form-group" style={{marginBottom:0}}><label className="form-label">Owner's Phone Number *</label>
                <input className="form-input" placeholder="+254..." value={form.ownerPhone} onChange={e=>up('ownerPhone',e.target.value)} required/></div>
            </div>
          )}
          <div style={{display:'flex',gap:10}}>
            <button className="btn btn-secondary" type="button" onClick={()=>setStep(1)}>← Back</button>
            <button className="btn btn-primary btn-lg" style={{flex:1,justifyContent:'center'}} type="submit">Continue →</button>
          </div>
        </form>
      )}

      {step===3 && (
        <form onSubmit={handleSubmit}>
          <div style={{background:'#FFF8E1',border:'1px solid #FDE68A',borderRadius:8,padding:'10px 12px',marginBottom:14,fontSize:12}}>
            ⚠️ All 3 documents below are <strong>required</strong> before your account can be activated.
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:16}}>
            <KycUploader label="National ID (Front & Back)" docType="national_id" required onUploaded={handleUploaded} tempId={tempId} uploaded={kycDocs.national_id}/>
            <KycUploader label="Rider's License" docType="riders_license" required onUploaded={handleUploaded} tempId={tempId} uploaded={kycDocs.riders_license}/>
            <KycUploader label="Bike Insurance Certificate" docType="insurance_cert" required onUploaded={handleUploaded} tempId={tempId} uploaded={kycDocs.insurance_cert}/>
          </div>
          {(()=>{ const done=[kycDocs.national_id,kycDocs.riders_license,kycDocs.insurance_cert].filter(Boolean).length; return (
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:14}}>
              <div style={{flex:1,height:4,background:'var(--border)',borderRadius:2,overflow:'hidden'}}>
                <div style={{width:`${(done/3)*100}%`,height:'100%',background:done===3?'var(--green)':'var(--orange)',borderRadius:2,transition:'width .3s'}}/></div>
              <span style={{fontSize:11,fontWeight:600,color:done===3?'var(--green)':'var(--muted)',whiteSpace:'nowrap'}}>{done}/3 uploaded{done===3?' ✓':''}</span>
            </div>); })()}
          <div style={{display:'flex',gap:10}}>
            <button className="btn btn-secondary" type="button" onClick={()=>setStep(2)}>← Back</button>
            <button className="btn btn-primary btn-lg" style={{flex:1,justifyContent:'center'}} type="submit" disabled={loading}>
              {loading?'⏳ Creating account…':'🛡️ Create My Account'}</button>
          </div>
        </form>
      )}
    </>
  );
}

// ── FUNERAL MEMBER REGISTRATION (non-rider, 4-step flow) ────────────────────
function MemberRegister({ onBack }) {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = React.useState(1);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [kycDocs, setKycDocs] = React.useState({});
  const [nokDocs, setNokDocs] = React.useState({});
  const [nokResult, setNokResult] = React.useState(null);
  const [nokPassword, setNokPassword] = React.useState('');
  const tempId = React.useRef(`mem-${Date.now()}`).current;
  const nokTempId = React.useRef(`nok-${Date.now()}`).current;
  const [form, setForm] = React.useState({
    fullName:'', phone:'', email:'', password:'', confirmPassword:'',
    nationalId:'', county:'Nairobi',
    nokName:'', nokPhone:'', nokRelationship:'', nokNationalId:'',
    household:[],
  });
  const up = (k,v) => setForm(f=>({...f,[k]:v}));
  const handleUploaded = (docType, doc) => setKycDocs(prev=>({...prev,[docType]:doc}));
  const handleNokUploaded = (docType, doc) => setNokDocs(prev=>({...prev,[docType]:doc}));

  const STEPS = ['Account','Personal Info','Documents','NOK Setup'];

  const next = (e) => {
    e.preventDefault();
    if (step===1) {
      if (!form.fullName.trim()) return setError('Full name is required');
      if (!form.phone.trim()) return setError('Phone number is required');
      const cleaned = form.phone.replace(/\D/g,''); if (cleaned.length<9||cleaned.length>12) return setError('Enter a valid Kenyan phone number');
      if (form.password!==form.confirmPassword) return setError('Passwords do not match');
      if (form.password.length<8) return setError('Password must be at least 8 characters');
      setError(''); setStep(2);
    } else if (step===2) {
      if (!form.nationalId) return setError('National ID is required');
      if (!form.nokName.trim()) return setError("Next of Kin's name is required");
      if (!form.nokPhone.trim()) return setError("Next of Kin's phone is required");
      if (!form.nokRelationship) return setError("Please select your relationship to your Next of Kin");
      setError(''); setStep(3);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!kycDocs.national_id) return setError('Please upload your National ID');
    setError(''); setLoading(true);
    try {
      const householdMembers = form.household.filter(h=>h.name&&h.name.trim());
      await register({ ...form, phone: normalizePhone(form.phone), tempUploadId: tempId, registrationType: 'funeral_member', householdMembers });
      try { await documentsAPI.attachKyc({tempUploadId:tempId}); } catch {}
      setStep(4);
    } catch (err) { setError(err.response?.data?.error || 'Registration failed'); }
    finally { setLoading(false); }
  };

  const handleNokRegister = async () => {
    if (!nokPassword) return setError('NOK password is required');
    if (nokPassword.length<8) return setError('NOK password must be at least 8 characters');
    setLoading(true); setError('');
    try {
      const res = await authAPI.registerNok({ fullName: form.nokName, phone: normalizePhone(form.nokPhone), nationalId: form.nokNationalId||'', password: nokPassword, tempUploadId: nokTempId });
      try { await documentsAPI.attachKyc({tempUploadId: nokTempId}); } catch {}
      setNokResult(res.data);
    } catch(err){ setError(err.response?.data?.error||'NOK registration failed'); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div style={{background:'linear-gradient(135deg,#1a0533,#2d0a5e)',borderRadius:12,padding:'14px 16px',marginBottom:20,border:'1px solid rgba(139,92,246,.3)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:24}}>🕊️</span>
          <div>
            <div style={{fontWeight:800,fontSize:14,color:'white',marginBottom:2}}>Funeral Protection Package</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.6)',lineHeight:1.5}}>Cover for yourself and your household · Up to KES 200,000 per claim</div>
          </div>
        </div>
      </div>
      <div style={{display:'flex',gap:6,marginBottom:24}}>
        {STEPS.map((s,i)=>(
          <div key={s} style={{flex:1}}>
            <div style={{height:3,borderRadius:2,background:step>i+1?'var(--violet)':step===i+1?'#A78BFA':'var(--border)',transition:'background .3s'}}/>
            <div style={{fontSize:10,marginTop:3,fontWeight:step===i+1?700:400,color:step===i+1?'var(--text)':'var(--muted)'}}>{s}</div>
          </div>
        ))}
      </div>
      <h2 style={{fontSize:20,fontWeight:800,marginBottom:2}}>
        {step===1?'Create Your Account':step===2?'ID & Next of Kin':step===3?'Upload Documents':'Register Your NOK'}
      </h2>
      <p className="text-muted" style={{marginBottom:16,fontSize:12}}>
        Step {step} of 4
      </p>
      {error && <div className="alert alert-error">{error}</div>}

      {step===1 && (
        <form onSubmit={next}>
          <div className="form-group"><label className="form-label">Full Name</label>
            <input className="form-input" placeholder="Jane Wanjiru" value={form.fullName} onChange={e=>up('fullName',e.target.value)} required/></div>
          <div className="form-group"><label className="form-label">Phone Number (M-Pesa)</label>
            <input className="form-input" placeholder="+254712345678" value={form.phone} onChange={e=>up('phone',e.target.value)} required/></div>
          <div className="form-group"><label className="form-label">Email <span style={{color:'var(--muted)',fontWeight:400}}>(optional)</span></label>
            <input className="form-input" type="email" placeholder="jane@email.com" value={form.email} onChange={e=>up('email',e.target.value)}/></div>
          <div className="two-col">
            <div className="form-group"><label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="Min 8 chars" value={form.password} onChange={e=>up('password',e.target.value)} required minLength={8}/></div>
            <div className="form-group"><label className="form-label">Confirm Password</label>
              <input className="form-input" type="password" placeholder="Repeat" value={form.confirmPassword} onChange={e=>up('confirmPassword',e.target.value)} required/></div>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button className="btn btn-secondary" type="button" onClick={onBack}>← Back</button>
            <button className="btn btn-primary btn-lg" style={{flex:1,justifyContent:'center',background:'var(--violet)',borderColor:'var(--violet)'}} type="submit">Continue →</button>
          </div>
        </form>
      )}

      {step===2 && (
        <form onSubmit={next}>
          <div className="two-col">
            <div className="form-group"><label className="form-label">National ID *</label>
              <input className="form-input" placeholder="12345678" value={form.nationalId} onChange={e=>up('nationalId',e.target.value)} required/></div>
            <div className="form-group"><label className="form-label">County</label>
              <select className="form-input" value={form.county} onChange={e=>up('county',e.target.value)}>
                {COUNTIES.map(c=><option key={c}>{c}</option>)}</select></div>
          </div>
          <div style={{background:'#F0FDF4',border:'1px solid var(--green-border)',borderRadius:10,padding:'14px 16px',marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:'var(--green)',marginBottom:10}}>👤 Next of Kin (Required)</div>
            <div className="form-group" style={{marginBottom:8}}><label className="form-label">NOK Full Name *</label>
              <input className="form-input" placeholder="e.g. Peter Wanjiru" value={form.nokName} onChange={e=>up('nokName',e.target.value)} required/></div>
            <div className="two-col">
              <div className="form-group" style={{marginBottom:0}}><label className="form-label">NOK Phone *</label>
                <input className="form-input" placeholder="+254..." value={form.nokPhone} onChange={e=>up('nokPhone',e.target.value)} required/></div>
              <div className="form-group" style={{marginBottom:0}}><label className="form-label">Relationship *</label>
                <select className="form-input" value={form.nokRelationship} onChange={e=>up('nokRelationship',e.target.value)} required>
                  <option value="">Select…</option>
                  <option value="spouse">Spouse</option><option value="child">Child</option>
                  <option value="parent">Parent</option><option value="sibling">Sibling</option>
                  <option value="other">Other</option>
                </select></div>
            </div>
          </div>
          <div style={{background:'#F5F3FF',border:'1px solid #DDD6FE',borderRadius:10,padding:'14px 16px',marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,color:'#5B21B6',marginBottom:4}}>👨‍👩‍👧 Household Members (optional)</div>
            <div style={{fontSize:11,color:'var(--muted)',marginBottom:12}}>Up to 3 members · Max age 70</div>
            {form.household.map((h,i)=>(
              <div key={i} style={{background:'white',borderRadius:8,padding:'12px',marginBottom:10,border:'1px solid #DDD6FE'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <span style={{fontSize:11,fontWeight:700,color:'#5B21B6'}}>Member {i+1}</span>
                  <button type="button" onClick={()=>up('household',form.household.filter((_,idx)=>idx!==i))} style={{background:'none',border:'none',color:'#EF4444',cursor:'pointer',fontSize:16}}>✕</button>
                </div>
                <div className="two-col">
                  <div className="form-group" style={{marginBottom:8}}><label className="form-label">Full Name</label>
                    <input className="form-input" placeholder="Full name" value={h.name||''} onChange={e=>{const hh=[...form.household];hh[i]={...hh[i],name:e.target.value};up('household',hh);}}/></div>
                  <div className="form-group" style={{marginBottom:8}}><label className="form-label">Age (max 70)</label>
                    <input className="form-input" type="number" placeholder="e.g. 45" min="1" max="70" value={h.age||''} onChange={e=>{if(parseInt(e.target.value)>70){setError('Max age is 70');return;}setError('');const hh=[...form.household];hh[i]={...hh[i],age:e.target.value};up('household',hh);}}/></div>
                  <div className="form-group" style={{marginBottom:0,gridColumn:'1/-1'}}><label className="form-label">Relationship</label>
                    <select className="form-input" value={h.relationship||''} onChange={e=>{const hh=[...form.household];hh[i]={...hh[i],relationship:e.target.value};up('household',hh);}}>
                      <option value="">Select…</option>
                      <option value="mother">Mother</option><option value="father">Father</option>
                      <option value="spouse">Spouse</option><option value="child">Child</option>
                      <option value="sibling">Sibling</option>
                    </select></div>
                </div>
              </div>
            ))}
            {form.household.length < 3 && (
              <button type="button" onClick={()=>up('household',[...form.household,{name:'',age:'',relationship:''}])}
                style={{width:'100%',padding:'10px',borderRadius:8,border:'1.5px dashed #A78BFA',background:'transparent',color:'#5B21B6',fontWeight:700,fontSize:13,cursor:'pointer'}}>
                + Add Member
              </button>
            )}
          </div>
          <div style={{display:'flex',gap:10}}>
            <button className="btn btn-secondary" type="button" onClick={()=>setStep(1)}>← Back</button>
            <button className="btn btn-primary btn-lg" style={{flex:1,justifyContent:'center',background:'var(--violet)',borderColor:'var(--violet)'}} type="submit">Continue →</button>
          </div>
        </form>
      )}

      {step===3 && (
        <form onSubmit={handleSubmit}>
          <div style={{background:'#F5F3FF',border:'1px solid #DDD6FE',borderRadius:8,padding:'10px 12px',marginBottom:14,fontSize:12,color:'#5B21B6'}}>
            📋 Upload your National ID for identity verification.
          </div>
          <div style={{marginBottom:16}}>
            <KycUploader label="National ID (Front & Back)" docType="national_id" required onUploaded={handleUploaded} tempId={tempId} uploaded={kycDocs.national_id}/>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button className="btn btn-secondary" type="button" onClick={()=>setStep(2)}>← Back</button>
            <button className="btn btn-primary btn-lg" style={{flex:1,justifyContent:'center',minWidth:0,background:'var(--violet)',borderColor:'var(--violet)'}} type="submit" disabled={loading}>
              {loading?'⏳ Creating…':'Continue →'}</button>
          </div>
        </form>
      )}

      {step===4 && (
        <div>
          {!nokResult ? (
            <>
              <div style={{background:'#F0FDF4',border:'1px solid var(--green-border)',borderRadius:10,padding:'14px',marginBottom:16}}>
                <div style={{fontSize:12,fontWeight:700,color:'var(--green)',marginBottom:4}}>🔗 Why register a NOK?</div>
                <div style={{fontSize:12,color:'var(--muted)',lineHeight:1.6}}>Your NOK can log in with a unique NOK number and lodge funeral claims on behalf of the family.</div>
              </div>
              <div className="form-group"><label className="form-label">NOK Full Name</label>
                <input className="form-input" value={form.nokName} readOnly style={{background:'var(--bg)'}}/></div>
              <div className="form-group"><label className="form-label">NOK Phone</label>
                <input className="form-input" value={form.nokPhone} readOnly style={{background:'var(--bg)'}}/></div>
              <div className="form-group"><label className="form-label">NOK National ID</label>
                <input className="form-input" placeholder="12345678" value={form.nokNationalId||''} onChange={e=>up('nokNationalId',e.target.value)}/></div>
              <div className="form-group"><label className="form-label">NOK Password *</label>
                <input className="form-input" type="password" placeholder="Min 8 chars" value={nokPassword} onChange={e=>setNokPassword(e.target.value)}/></div>
              <div style={{marginBottom:16}}>
                <KycUploader label="NOK National ID Copy" docType="nok_id" required={false} onUploaded={handleNokUploaded} tempId={nokTempId} uploaded={nokDocs.nok_id}/>
              </div>
              {error && <div className="alert alert-error">{error}</div>}
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button className="btn btn-secondary" type="button" onClick={()=>{window.alert(`✅ Account created!\n\nPhone: ${normalizePhone(form.phone)}\nPassword: ${form.password}\n\nSave these credentials.`);navigate('/login');}}>Skip</button>
                <button className="btn btn-primary btn-lg" style={{flex:1,justifyContent:'center',minWidth:0,background:'var(--violet)'}} disabled={loading} onClick={handleNokRegister}>
                  {loading?'⏳…':'🔗 Register NOK'}
                </button>
              </div>
            </>
          ) : (
            <div style={{textAlign:'center',padding:'20px 0'}}>
              <div style={{fontSize:48,marginBottom:12}}>🎉</div>
              <h3 style={{fontSize:20,fontWeight:800,marginBottom:8}}>All Done!</h3>
              <p style={{fontSize:13,color:'var(--muted)',marginBottom:20}}>Save these credentials</p>
              <div style={{background:'var(--navy)',borderRadius:14,padding:'20px',marginBottom:20,textAlign:'left'}}>
                {[['Your Phone',normalizePhone(form.phone)],['Your Password',form.password],['NOK Number',nokResult.nokNumber||'—'],['NOK Password',nokPassword]].map(([l,v])=>(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,.08)'}}>
                    <span style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>{l}</span>
                    <span style={{fontSize:13,fontWeight:700,color:'white',fontFamily:'monospace'}}>{v}</span>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary btn-lg" style={{width:'100%',justifyContent:'center',background:'var(--violet)'}} onClick={()=>navigate('/login')}>Go to Login →</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}


// ── MAIN RegisterPage with type selector ────────────────────────────────────
export default function RegisterPage() {
  // null = not chosen yet, 'rider' = boda boda rider, 'member' = funeral member
  const [regType, setRegType] = useState(null);

  return (
    <div className="auth-layout">
      {/* Left hero */}
      <div className="auth-hero">
        <div><PikiLogo size={36} textSize={17} light /></div>
        <div>
          <h1 style={{fontSize:34,fontWeight:800,color:'white',lineHeight:1.15,marginBottom:14,letterSpacing:'-0.5px'}}>
            Join <span style={{color:'#22C55E'}}>50,000+</span><br/>protected Kenyans
          </h1>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {['Complete KYC in under 5 minutes','Protection starts same day','Claims via M-Pesa in 4 hours','Boda boda & funeral cover available'].map(f=>(
              <div key={f} style={{display:'flex',gap:8,color:'rgba(255,255,255,.7)',fontSize:13}}>
                <span style={{color:'#22C55E',fontWeight:700,flexShrink:0}}>✓</span>{f}
              </div>
            ))}
          </div>
        </div>
        <div style={{background:'rgba(34,197,94,.1)',border:'1px solid rgba(34,197,94,.25)',borderRadius:10,padding:14}}>
          <p style={{color:'rgba(255,255,255,.6)',fontSize:12,lineHeight:1.6}}>
            🔒 Data protected with AES-256 encryption and verified against NTSA records.
          </p>
        </div>
      </div>

      {/* Right form */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">

          {/* ── TYPE SELECTOR — shown first ── */}
          {!regType && (
            <>
              <h2 style={{fontSize:22,fontWeight:800,marginBottom:4}}>Create Your Account</h2>
              <p className="text-muted" style={{marginBottom:24,fontSize:13}}>
                Choose the type of protection you need
              </p>

              {/* Rider option */}
              <button type="button" onClick={()=>setRegType('rider')}
                style={{width:'100%',background:'white',border:'2px solid var(--border)',borderRadius:14,
                  padding:'20px 18px',marginBottom:12,cursor:'pointer',textAlign:'left',
                  transition:'border-color .2s,box-shadow .2s',display:'flex',alignItems:'flex-start',gap:14}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--green)';e.currentTarget.style.boxShadow='0 0 0 3px rgba(0,214,143,.12)';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.boxShadow='none';}}>
                <div style={{width:48,height:48,borderRadius:12,background:'linear-gradient(135deg,#00D68F,#007A50)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>🏍️</div>
                <div>
                  <div style={{fontWeight:800,fontSize:15,color:'var(--text)',marginBottom:4}}>I am a Boda Boda Rider</div>
                  <div style={{fontSize:12,color:'var(--muted)',lineHeight:1.6}}>
                    Full protection: bail cover, income stipend, funeral cover + Shield Tokens
                  </div>
                  <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
                    {['🚔 Bail KES 20k','💰 Stipend KES 15k','🕊️ Funeral KES 200k','🪙 Tokens'].map(t=>(
                      <span key={t} style={{fontSize:10,background:'var(--green-light)',color:'var(--green)',padding:'2px 8px',borderRadius:20,fontWeight:600}}>{t}</span>
                    ))}
                  </div>
                </div>
              </button>

              {/* Funeral member option */}
              <button type="button" onClick={()=>setRegType('member')}
                style={{width:'100%',background:'white',border:'2px solid var(--border)',borderRadius:14,
                  padding:'20px 18px',marginBottom:24,cursor:'pointer',textAlign:'left',
                  transition:'border-color .2s,box-shadow .2s',display:'flex',alignItems:'flex-start',gap:14}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--violet)';e.currentTarget.style.boxShadow='0 0 0 3px rgba(139,92,246,.12)';}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.boxShadow='none';}}>
                <div style={{width:48,height:48,borderRadius:12,background:'linear-gradient(135deg,#8B5CF6,#5B21B6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,flexShrink:0}}>🕊️</div>
                <div>
                  <div style={{fontWeight:800,fontSize:15,color:'var(--text)',marginBottom:4}}>I am NOT a Rider — Funeral Cover Only</div>
                  <div style={{fontSize:12,color:'var(--muted)',lineHeight:1.6}}>
                    Funeral protection for you and your household dependants — no bike required
                  </div>
                  <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
                    {['🕊️ Funeral KES 200k','👨‍👩‍👧 Covers dependants','📋 Easy claims'].map(t=>(
                      <span key={t} style={{fontSize:10,background:'#F5F3FF',color:'var(--violet)',padding:'2px 8px',borderRadius:20,fontWeight:600}}>{t}</span>
                    ))}
                  </div>
                </div>
              </button>

              <p style={{textAlign:'center',fontSize:12,color:'var(--muted)'}}>
                Already have an account? <Link to="/login" style={{color:'var(--green)',fontWeight:600,textDecoration:'none'}}>Sign in →</Link>
              </p>
            </>
          )}

          {regType === 'rider'  && <RiderRegister  onBack={()=>setRegType(null)}/>}
          {regType === 'member' && <MemberRegister onBack={()=>setRegType(null)}/>}

          {regType && (
            <p style={{textAlign:'center',marginTop:18,fontSize:12,color:'var(--muted)'}}>
              Already have an account? <Link to="/login" style={{color:'var(--green)',fontWeight:600,textDecoration:'none'}}>Sign in →</Link>
            </p>
          )}

        </div>
      </div>
    </div>
  );
}