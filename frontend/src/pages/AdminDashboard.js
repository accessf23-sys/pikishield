// v9-FINAL + search/filter
import React, { useState, useEffect, useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Legend, AreaChart, Area
} from 'recharts';
import { usersAPI, documentsAPI } from '../utils/api';
import CameraCapture from '../components/CameraCapture';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icons';

const s  = (v, fb = '') => v == null ? fb : typeof v === 'object' ? fb : String(v) || fb;
const sd = (v) => s(v, '—');

async function dlDoc(id, name) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/documents/${id}/download`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name || 'document'; a.style.display = 'none';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch { alert('Download failed — please try again.'); }
}

function SuspendModal({ user, onClose, onSuspend }) {
  const [reason, setReason] = useState('');
  if (!user) return null;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={onClose}>
      <div style={{ background:'white', borderRadius:8, padding:24, width:420, maxWidth:'95vw' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize:16, marginBottom:4 }}>{user.suspended ? 'Reinstate' : 'Suspend'} Account</h3>
        <p style={{ fontSize:13, color:'var(--muted)', marginBottom:16 }}>{user.fullName} · {user.memberNumber || user.phone}</p>
        {!user.suspended && (
          <div className="form-group">
            <label className="form-label">Reason for suspension</label>
            <input className="form-input" placeholder="e.g. Suspected document fraud..." value={reason} onChange={e => setReason(e.target.value)}/>
          </div>
        )}
        <div style={{ display:'flex', gap:8, marginTop:12 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className={'btn ' + (user.suspended ? 'btn-primary' : 'btn-danger')} onClick={() => onSuspend(user, reason)}>
            {user.suspended ? 'Reinstate Account' : 'Suspend Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

function OnboardReviewModal({ person, onClose, onApprove, onReject, onSuspend }) {
  const [docs, setDocs] = useState([]);
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (person) documentsAPI.getForUser(String(person._id||person.id)).then(r => setDocs(r.data)).catch(() => {});
  }, [person]);
  if (!person) return null;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div style={{ background:'white', borderRadius:8, width:'100%', maxWidth:640, maxHeight:'92vh', overflow:'hidden', display:'flex', flexDirection:'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div>
            <div style={{ fontWeight:700, fontSize:16 }}>Review: {person.fullName}</div>
            <div style={{ fontSize:12, color:'var(--muted)' }}>{person.memberNumber || 'No member no.'} · {String(person.phone||'')} · KYC: <strong style={{ color:'var(--yellow)' }}>{String(person.kycStatus||'pending')}</strong></div>
          </div>
          <button onClick={onClose} style={{ background:'#F1F5F9', border:'none', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontWeight:600 }}>x</button>
        </div>
        <div style={{ overflow:'auto', flex:1, padding:'16px 20px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
            {[
              ['Role', person.role], ['National ID', person.nationalId], ['County', person.profile?.county],
              ['Registered', new Date(person.createdAt).toLocaleDateString('en-KE')],
              person.agentName && ['Agent', person.agentName + ' (' + person.agentCode + ')'],
              person.profile?.bikeReg && ['Bike Reg', person.profile.bikeReg],
              person.profile?.licenseNumber && ['License', person.profile.licenseNumber],
              person.profile?.bikeType && ['Bike Type', person.profile.bikeType],
              person.profile?.isBikeOwner === false && ['Bike Owner', (person.profile.ownerName||'?') + ' · ' + (person.profile.ownerPhone||'?')],
            ].filter(Boolean).map(([k,v]) => (
              <div key={k} style={{ background:'var(--bg)', borderRadius:7, padding:'8px 12px' }}>
                <div style={{ fontSize:10, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', marginBottom:2 }}>{k}</div>
                <div style={{ fontSize:12, fontWeight:600 }}>{v||'—'}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>KYC Documents ({docs.length})</div>
            {docs.length === 0 ? (
              <div style={{ background:'#FFF8E1', border:'1px solid #FDE68A', borderRadius:8, padding:'10px 12px', fontSize:12, color:'#92400E' }}>No KYC documents uploaded.</div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {docs.map(d => (
                  <div key={d.id} style={{ display:'flex', alignItems:'center', gap:10, background:'white', border:'1px solid var(--border)', borderRadius:8, padding:'8px 12px' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:600 }}>{d.originalName}</div>
                      <div style={{ fontSize:11, color:'var(--muted)' }}>{d.docLabel||d.docType}</div>
                    </div>
                    {d.verified && <span style={{ fontSize:10, background:'var(--green-light)', color:'var(--green)', padding:'1px 6px', borderRadius:4, fontWeight:700 }}>Verified</span>}
                    <button onClick={() => dlDoc(d.id, d.originalName)} style={{ fontSize:12, background:'var(--green-light)', border:'none', borderRadius:6, padding:'4px 10px', cursor:'pointer', color:'var(--green)', fontWeight:600 }}>Download</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {person.kycStatus === 'pending' && (
            <div style={{ borderTop:'1px solid var(--border)', paddingTop:14 }}>
              <div className="form-group">
                <label className="form-label">Rejection reason (if rejecting)</label>
                <input className="form-input" placeholder="e.g. Documents incomplete..." value={reason} onChange={e => setReason(e.target.value)}/>
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:8 }}>
                <button className="btn btn-primary" onClick={() => onApprove(String(person._id||person.id))}>Approve KYC</button>
                <button className="btn btn-danger"  onClick={() => onReject(String(person._id||person.id), reason)}>Reject KYC</button>
                <button className="btn btn-secondary" onClick={() => onSuspend(person)}>Suspend Account</button>
              </div>
            </div>
          )}
          {person.kycStatus !== 'pending' && (
            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              <button className="btn btn-secondary" onClick={() => onSuspend(person)}>{person.suspended ? 'Reinstate Account' : 'Suspend Account'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickCreateAgent({ onClose, onDone }) {
  const [form, setForm] = useState({ fullName:'', phone:'', email:'', nationalId:'', region:'', password:'', commission:'' });
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [tempId] = useState(() => 'AGT_' + Date.now());
  const [idDoc, setIdDoc] = useState(null);
  const [idUploading, setIdUploading] = useState(false);
  const COUNTIES = ['Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Thika','Nyeri','Meru','Kitale','Kakamega','Bungoma','Machakos','Embu','Kericho','Kilifi','Kwale',"Murang'a",'Kiambu','Migori','Kisii','Homa Bay','Siaya','Busia','Trans Nzoia','Uasin Gishu','Nandi','Baringo','West Pokot','Samburu','Turkana','Marsabit','Isiolo','Mwingi','Tana River','Lamu','Taita Taveta','Garissa','Wajir','Mandera','Narok','Kajiado','Laikipia','Nyahururu','Nyandarua','Kirinyaga','Tharaka Nithi','Vihiga','Butere'];
  const uploadId = (file) => {
    if (!file) return; setIdUploading(true);
    const fd = new FormData(); fd.append('files', file); fd.append('docType','national_id'); fd.append('tempUploadId',tempId);
    fetch('/api/documents/upload-kyc', { method:'POST', body:fd }).then(r=>r.json()).then(d=>{ if(d.documents?.[0]) setIdDoc(d.documents[0]); }).catch(()=>{}).finally(()=>setIdUploading(false));
  };
  const submit = async () => {
    if (!form.fullName||!form.phone||!form.nationalId||!form.region||!form.password) return setErr('Full name, phone, national ID, region and password are required');
    if (form.password.length<8) return setErr('Password must be at least 8 characters');
    setCreating(true); setErr('');
    try {
      const res = await usersAPI.createAgent(form);
      const { agentCode, user } = res.data;
      if (idDoc && user?.id) await fetch('/api/documents/attach-kyc', { method:'POST', headers:{'Content-Type':'application/json',Authorization:'Bearer '+localStorage.getItem('token')}, body:JSON.stringify({tempUploadId:tempId,userId:user.id}) }).catch(()=>{});
      setOk('Agent created!\nCode: '+agentCode+'\nPhone: '+form.phone+'\nPass: '+form.password);
      if (onDone) onDone();
    } catch(e) { setErr(e.response?.data?.error||'Failed'); } finally { setCreating(false); }
  };
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(5,14,31,.75)', backdropFilter:'blur(5px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ width:'100%', maxWidth:460, background:'white', borderRadius:8, boxShadow:'var(--shadow-lg)', overflow:'hidden' }} onClick={e=>e.stopPropagation()}>
        <div style={{ background:'#0F7B5C', padding:'13px 17px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:'white' }}>Create Field Agent</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.5)' }}>New agent account with unique code</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.1)', border:'none', borderRadius:7, width:28, height:28, color:'white', cursor:'pointer', fontSize:15 }}>x</button>
        </div>
        <div style={{ padding:'13px 16px 16px', maxHeight:'70vh', overflowY:'auto' }}>
          {err && <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:7, padding:'8px 11px', fontSize:12, color:'#991B1B', marginBottom:9 }}>{err}</div>}
          {ok ? (
            <div>
              <div style={{ background:'#EEF6F2', border:'2px solid #BFDCCF', borderRadius:6, padding:'12px', marginBottom:9 }}>
                <div style={{ fontSize:12, color:'#047857', fontFamily:'monospace', background:'#EEF6F2', borderRadius:5, padding:'8px', whiteSpace:'pre', lineHeight:1.9 }}>{ok}</div>
              </div>
              <div style={{ display:'flex', gap:7 }}>
                <button style={{ flex:1, padding:'9px', background:'#0F7B5C', color:'white', border:'none', borderRadius:7, fontWeight:700, fontSize:12, cursor:'pointer' }} onClick={()=>{setOk('');setForm({fullName:'',phone:'',email:'',nationalId:'',region:'',password:'',commission:''});setIdDoc(null);}}>Create Another</button>
                <button style={{ flex:1, padding:'9px', background:'#F3F4F6', color:'#374151', border:'none', borderRadius:7, fontWeight:700, fontSize:12, cursor:'pointer' }} onClick={onClose}>Done</button>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {[{key:'fullName',label:'Full Name',ph:'e.g. John Kamau',type:'text',req:true},{key:'phone',label:'Phone',ph:'+254700000000',type:'tel',req:true},{key:'nationalId',label:'National ID',ph:'e.g. 12345678',type:'text',req:true},{key:'email',label:'Email (optional)',ph:'agent@email.com',type:'email',req:false},{key:'password',label:'Password',ph:'Min 8 chars',type:'password',req:true},{key:'commission',label:'Commission %',ph:'Default 5%',type:'number',req:false}].map(f=>(
                <div key={f.key}>
                  <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>{f.label}{f.req&&<span style={{color:'#EF4444',marginLeft:2}}>*</span>}</label>
                  <input type={f.type} placeholder={f.ph} style={{ width:'100%', border:'1.5px solid #E5E7EB', borderRadius:6, padding:'6px 9px', fontSize:12, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} value={form[f.key]||''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} onFocus={e=>{e.target.style.borderColor='#0F7B5C';}} onBlur={e=>{e.target.style.borderColor='#E5E7EB';}}/>
                </div>
              ))}
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>Region / County<span style={{color:'#EF4444',marginLeft:2}}>*</span></label>
                <select style={{ width:'100%', border:'1.5px solid #E5E7EB', borderRadius:6, padding:'6px 9px', fontSize:12, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} value={form.region||''} onChange={e=>setForm(p=>({...p,region:e.target.value}))} onFocus={e=>{e.target.style.borderColor='#0F7B5C';}} onBlur={e=>{e.target.style.borderColor='#E5E7EB';}}>
                  <option value="">Select county...</option>
                  {COUNTIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button style={{ width:'100%', marginTop:4, padding:'10px', background:'#0F7B5C', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer' }} onClick={submit} disabled={creating}>{creating?'Creating...':'Create Agent'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickCreateAdmin({ onClose, onDone }) {
  const [form, setForm] = useState({ fullName:'', phone:'', email:'', password:'' });
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const submit = async () => {
    if (!form.fullName||!form.phone||!form.password) return setErr('Full name, phone and password are required');
    if (form.password.length<8) return setErr('Password must be at least 8 characters');
    setCreating(true); setErr('');
    try {
      await usersAPI.createAdmin(form);
      setOk('Admin created!\nPhone: '+form.phone+'\nPass: '+form.password);
      if (onDone) onDone();
    } catch(e) { setErr(e.response?.data?.error||'Failed'); } finally { setCreating(false); }
  };
  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(5,14,31,.75)', backdropFilter:'blur(5px)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={onClose}>
      <div style={{ width:'100%', maxWidth:440, background:'white', borderRadius:8, boxShadow:'var(--shadow-lg)', overflow:'hidden' }} onClick={e=>e.stopPropagation()}>
        <div style={{ background:'#0B1F3A', padding:'13px 17px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontWeight:700, fontSize:13, color:'white' }}>Create Admin Account</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.4)' }}>Full system access — use carefully</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.1)', border:'none', borderRadius:7, width:28, height:28, color:'white', cursor:'pointer', fontSize:15 }}>x</button>
        </div>
        <div style={{ padding:'13px 16px 16px', maxHeight:'70vh', overflowY:'auto' }}>
          {err && <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:7, padding:'8px 11px', fontSize:12, color:'#991B1B', marginBottom:9 }}>{err}</div>}
          {ok ? (
            <div>
              <div style={{ background:'#EEF6F2', border:'2px solid #BFDCCF', borderRadius:6, padding:'12px', marginBottom:9 }}>
                <div style={{ fontSize:12, color:'#047857', fontFamily:'monospace', background:'#EEF6F2', borderRadius:5, padding:'8px', whiteSpace:'pre', lineHeight:1.9 }}>{ok}</div>
              </div>
              <div style={{ display:'flex', gap:7 }}>
                <button style={{ flex:1, padding:'9px', background:'#1E3A5F', color:'white', border:'none', borderRadius:7, fontWeight:700, fontSize:12, cursor:'pointer' }} onClick={()=>{setOk('');setForm({fullName:'',phone:'',email:'',password:''});}}>Create Another</button>
                <button style={{ flex:1, padding:'9px', background:'#F3F4F6', color:'#374151', border:'none', borderRadius:7, fontWeight:700, fontSize:12, cursor:'pointer' }} onClick={onClose}>Done</button>
              </div>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {[{key:'fullName',label:'Full Name',ph:'e.g. Jane Wanjiku',type:'text',req:true},{key:'phone',label:'Phone',ph:'+254700000000',type:'tel',req:true},{key:'email',label:'Email (optional)',ph:'admin@email.com',type:'email',req:false},{key:'password',label:'Password',ph:'Min 8 chars',type:'password',req:true}].map(f=>(
                <div key={f.key}>
                  <label style={{ fontSize:11, fontWeight:700, color:'#374151', display:'block', marginBottom:2 }}>{f.label}{f.req&&<span style={{color:'#EF4444',marginLeft:2}}>*</span>}</label>
                  <input type={f.type} placeholder={f.ph} style={{ width:'100%', border:'1.5px solid #E5E7EB', borderRadius:6, padding:'6px 9px', fontSize:12, outline:'none', boxSizing:'border-box', fontFamily:'inherit' }} value={form[f.key]||''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))} onFocus={e=>{e.target.style.borderColor='#1E3A5F';}} onBlur={e=>{e.target.style.borderColor='#E5E7EB';}}/>
                </div>
              ))}
              <div style={{ background:'#FEF3C7', border:'1px solid #FCD34D', borderRadius:6, padding:'8px 10px', fontSize:11, color:'#92400E', lineHeight:1.5 }}>Admin accounts have <strong>full system access</strong>. Only create for trusted team members.</div>
              <button style={{ width:'100%', marginTop:4, padding:'10px', background:'#1E3A5F', color:'white', border:'none', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer' }} onClick={submit} disabled={creating}>{creating?'Creating...':'Create Admin Account'}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PolicyBreakdownCard({ data }) {
  const funeralFromMembers = data.totalMembers || 0;
  const bailPolicies       = (data.policyBreakdown?.bail)        || 0;
  const bailIncomePolicies = (data.policyBreakdown?.bail_income) || 0;
  const funeralPolicies    = (data.policyBreakdown?.funeral)     || funeralFromMembers;
  const totalPolicies      = (data.activePolicies)               || (funeralPolicies + bailPolicies + bailIncomePolicies);
  const types = [
    { label:'Funeral',        value: funeralPolicies,    color:'#3B4B6B', bg:'#EEF1F6' },
    { label:'Bail',           value: bailPolicies,       color:'#2F5D8C', bg:'#EEF3F8' },
    { label:'Bail + Stipend', value: bailIncomePolicies, color:'#B08A3E', bg:'#FFFBEB' },
  ];
  return (
    <div className="card" style={{ padding:'14px 16px', marginBottom:16 }}>
      <div style={{ fontSize:13, fontWeight:700, marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span>Policy Breakdown</span>
        <span style={{ fontSize:11, color:'var(--muted)', fontWeight:500 }}>Active subscriptions</span>
      </div>
      <div style={{ background:'#0B1F3A', borderRadius:6, padding:'12px 14px', marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:.8, marginBottom:2 }}>Total Active Policies</div>
          <div style={{ fontSize:28, fontWeight:700, color:'white', lineHeight:1 }}>{totalPolicies}</div>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
        {types.map(t => (
          <div key={t.label} style={{ background:t.bg, borderRadius:6, padding:'10px 12px', border:`1px solid ${t.color}22` }}>
            <div style={{ fontSize:11, color:t.color, fontWeight:600, marginBottom:4, lineHeight:1.3 }}>{t.label}</div>
            <div style={{ fontSize:22, fontWeight:700, color:t.color, lineHeight:1 }}>{t.value}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:7 }}>
        {types.map(t => (
          <div key={t.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ fontSize:11, color:'var(--muted)', width:120, flexShrink:0 }}>{t.label}</div>
            <div style={{ flex:1, height:6, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
              <div style={{ width: totalPolicies > 0 ? `${(t.value / totalPolicies) * 100}%` : '0%', height:'100%', background:t.color, borderRadius:3, transition:'width .4s' }}/>
            </div>
            <div style={{ fontSize:11, fontWeight:700, color:t.color, width:24, textAlign:'right' }}>{t.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Executive glass overview ─────────────────────────────────── */
const GLASS_CSS = `
.adm{position:relative;min-height:100vh;background:
  radial-gradient(900px 520px at 8% -8%,rgba(15,123,92,.22),transparent 60%),
  radial-gradient(800px 520px at 100% 0%,rgba(59,75,107,.22),transparent 60%),
  radial-gradient(700px 500px at 60% 100%,rgba(253,199,3,.16),transparent 60%),
  linear-gradient(180deg,#EAF0F7 0%,#F4F6FA 100%)}
.adm .card,.adm .stat-card,.adm .glass{background:rgba(255,255,255,.62)!important;backdrop-filter:blur(16px) saturate(160%);-webkit-backdrop-filter:blur(16px) saturate(160%);
  border:1px solid rgba(255,255,255,.75)!important;box-shadow:0 10px 30px rgba(11,31,58,.08),inset 0 1px 0 rgba(255,255,255,.9)!important;border-radius:18px!important}
.adm .form-input{background:rgba(255,255,255,.7)!important;backdrop-filter:blur(8px)}
.adm table{background:transparent!important}
.adm .kpi{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-radius:16px;padding:12px 14px;transition:transform .15s}
.adm .kpi:hover{transform:translateY(-2px)}
.adm-grid2{display:grid;grid-template-columns:1.6fr 1fr;gap:14px;margin-bottom:14px}
.adm-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:14px}
@media (max-width:900px){.adm-grid2,.adm-grid3{grid-template-columns:1fr}}
`;

const chartTip = { contentStyle:{ background:'rgba(255,255,255,.92)', border:'1px solid #E6EAF2', borderRadius:12, fontSize:12, boxShadow:'0 8px 24px rgba(11,31,58,.12)' } };
const fmtK = (v) => v >= 1000000 ? (v/1000000).toFixed(1)+'M' : v >= 1000 ? Math.round(v/1000)+'k' : String(v);

function GlassCard({ title, sub, children, right }) {
  return (
    <div className="glass" style={{ padding:'16px 16px 12px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10, gap:8 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'#0B1F3A' }}>{title}</div>
          {sub && <div style={{ fontSize:11, color:'#6B7683', marginTop:2 }}>{sub}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function ExecutiveCharts({ data, isSuperAdmin }) {
  const fin = data.monthlyFinancials || [];
  const growth = data.userGrowth || [];
  const claimsBy = (data.claimBreakdown || []).map(c => ({ name: c.type === 'income' ? 'Stipend' : c.type.charAt(0).toUpperCase()+c.type.slice(1), Paid:c.paid, Pending:c.pending, Rejected:c.rejected }));
  const hasFin = fin.some(m => m.revenue || m.payouts);
  const hasGrowth = growth.some(m => m.riders || m.members);
  const hasClaims = claimsBy.some(c => c.Paid || c.Pending || c.Rejected);
  const empty = (t) => <div style={{ height:190, display:'flex', alignItems:'center', justifyContent:'center', color:'#8A94A3', fontSize:12 }}>{t}</div>;
  return (
    <>
      <div className={isSuperAdmin ? 'adm-grid2' : ''}>
        {isSuperAdmin && (
          <GlassCard title="Revenue vs payouts" sub="Last 12 months, KES">
            {hasFin ? (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={fin} margin={{ top:6, right:6, left:-14, bottom:0 }}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0F7B5C" stopOpacity=".45"/><stop offset="100%" stopColor="#0F7B5C" stopOpacity="0"/></linearGradient>
                    <linearGradient id="gPay" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#E0A800" stopOpacity=".4"/><stop offset="100%" stopColor="#E0A800" stopOpacity="0"/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,31,58,.08)" vertical={false}/>
                  <XAxis dataKey="month" tick={{ fontSize:10, fill:'#6B7683' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize:10, fill:'#6B7683' }} axisLine={false} tickLine={false} tickFormatter={fmtK}/>
                  <Tooltip {...chartTip} formatter={(v,n)=>['KES '+Number(v).toLocaleString(), n]}/>
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#0F7B5C" strokeWidth={2.5} fill="url(#gRev)"/>
                  <Area type="monotone" dataKey="payouts" name="Payouts" stroke="#E0A800" strokeWidth={2.5} fill="url(#gPay)"/>
                </AreaChart>
              </ResponsiveContainer>
            ) : empty('No payments yet')}
          </GlassCard>
        )}
        <GlassCard title="New sign-ups" sub="Last 6 months">
          {hasGrowth ? (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={growth} margin={{ top:6, right:6, left:-22, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,31,58,.08)" vertical={false}/>
                <XAxis dataKey="month" tick={{ fontSize:10, fill:'#6B7683' }} axisLine={false} tickLine={false}/>
                <YAxis allowDecimals={false} tick={{ fontSize:10, fill:'#6B7683' }} axisLine={false} tickLine={false}/>
                <Tooltip {...chartTip}/>
                <Bar dataKey="riders" name="Riders" stackId="a" fill="#0B1F3A" radius={[0,0,0,0]}/>
                <Bar dataKey="members" name="Members" stackId="a" fill="#FDC703" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : empty('No sign-ups yet')}
        </GlassCard>
      </div>

      <div className="adm-grid2" style={{ gridTemplateColumns:'1fr 1fr' }}>
        <GlassCard title="Claims by type" sub="Paid, pending and rejected">
          {hasClaims ? (
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={claimsBy} margin={{ top:6, right:6, left:-22, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(11,31,58,.08)" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize:10, fill:'#6B7683' }} axisLine={false} tickLine={false}/>
                <YAxis allowDecimals={false} tick={{ fontSize:10, fill:'#6B7683' }} axisLine={false} tickLine={false}/>
                <Tooltip {...chartTip}/>
                <Bar dataKey="Paid" fill="#0F7B5C" radius={[6,6,0,0]}/>
                <Bar dataKey="Pending" fill="#E0A800" radius={[6,6,0,0]}/>
                <Bar dataKey="Rejected" fill="#C2415A" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          ) : empty('No claims yet')}
        </GlassCard>
        <GlassCard title="Needs attention">
          {[
            { label:'Claims waiting for review', value:data.pendingClaims, color:'#C2415A', icon:'claim' },
            { label:'Accounts waiting for ID approval', value:data.pendingOnboards, color:'#B08A3E', icon:'idcard' },
            { label:'Suspended accounts', value:data.suspended, color:'#3B4B6B', icon:'alert' },
          ].map(r => (
            <div key={r.label} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderTop:'1px solid rgba(11,31,58,.07)' }}>
              <div style={{ width:34, height:34, borderRadius:11, background:r.color+'1A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><Icon name={r.icon} color={r.color} size={17}/></div>
              <div style={{ flex:1, fontSize:12, color:'#3B4B6B' }}>{r.label}</div>
              <div style={{ fontFamily:"'Source Serif 4',Georgia,serif", fontWeight:700, fontSize:20, color:r.color }}>{r.value || 0}</div>
            </div>
          ))}
        </GlassCard>
      </div>
    </>
  );
}

export default function AdminDashboard() {
  const { user: authUser } = useAuth();
  const isSuperAdmin = authUser?.role === 'superadmin';

  const [data, setData] = useState({
    totalUsers:0, totalMembers:0, totalNOKs:0, totalAgents:0,
    activePolicies:0, pendingClaims:0, pendingOnboards:0,
    totalClaims:0, totalPayouts:0, totalRevenue:0, netPosition:0,
    riskDistribution:{ green:0, yellow:0, red:0 },
    recentClaims:[], monthlyFinancials:[], claimBreakdown:[],
    userGrowth:[], suspended:0, allUsers:[], admins:[],
    policyBreakdown:{ funeral:0, bail:0, bail_income:0 },
  });

  const [agents, setAgents]               = useState([]);
  const [pending, setPending]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [tab, setTab]                     = useState('overview');
  const [reviewPerson, setReviewPerson]   = useState(null);
  const [suspendPerson, setSuspendPerson] = useState(null);
  const navigate = useNavigate();
  const [showNewAgent, setShowNewAgent] = useState(false);
  const [showNewAdmin, setShowNewAdmin] = useState(false);

  // ── Search state for pending KYC table ──────────────────────────────────
  const [searchQuery, setSearchQuery]   = useState('');
  const [filterRole, setFilterRole]     = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const [d, a, p] = await Promise.all([
        usersAPI.getAdminDashboard(),
        usersAPI.getAgentReport(),
        usersAPI.getPendingOnboards(),
      ]);
      setData(d.data);
      setAgents(a.data.agents || []);
      setPending((p.data.pending || []).filter(u => u.role !== 'nok'));
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // ── Filtered pending list ────────────────────────────────────────────────
  const filteredPending = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return pending.filter(p => {
      const matchRole = filterRole === 'all' || p.role === filterRole;
      if (!q) return matchRole;
      const name   = (p.fullName || '').toLowerCase();
      const phone  = (p.phone || '').toLowerCase();
      const mno    = (p.memberNumber || p.nokNumber || '').toLowerCase();
      return matchRole && (name.includes(q) || phone.includes(q) || mno.includes(q));
    });
  }, [pending, searchQuery, filterRole]);

  const handleApprove = async (id) => {
    try { await usersAPI.approveKyc(id); setReviewPerson(null); load(); }
    catch(e) { alert('Approve failed: ' + (e.response?.data?.error || e.message)); }
  };
  const handleReject = async (id, reason) => {
    try { await usersAPI.rejectKyc(id, reason || 'Documents incomplete or not legible'); setReviewPerson(null); load(); }
    catch(e) { alert('Reject failed: ' + (e.response?.data?.error || e.message)); }
  };
  const handleSuspend = async (user, reason) => {
    if (user.suspended) await usersAPI.unsuspendUser(user.id);
    else await usersAPI.suspendUser(user.id, reason || 'Admin action');
    setSuspendPerson(null); setReviewPerson(null); load();
  };

  const riskData = [
    { name:'Green',  value: data?.riskDistribution?.green  || 0, color:'#1A9F73' },
    { name:'Yellow', value: data?.riskDistribution?.yellow || 0, color:'#B08A3E' },
    { name:'Red',    value: data?.riskDistribution?.red    || 0, color:'#F43F5E' },
  ];

  const funeralCount    = (data.policyBreakdown?.funeral)     || data.totalMembers || 0;
  const bailCount       = (data.policyBreakdown?.bail)        || 0;
  const bailIncomeCount = (data.policyBreakdown?.bail_income) || 0;
  const totalPolicies   = data.activePolicies                 || (funeralCount + bailCount + bailIncomeCount);

  return (
    <div className="adm">
      <style>{GLASS_CSS}</style>
      <div className="page-body" style={{ paddingTop:28 }}>

        {/* Hero banner */}
        <div style={{ background:'linear-gradient(135deg,#0B1F3A 0%,#0E4D63 55%,#0F7B5C 100%)', borderRadius:22, padding:'24px 26px', marginBottom:18, position:'relative', overflow:'hidden', boxShadow:'0 18px 40px rgba(11,31,58,.22)' }}>
          <svg style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', opacity:.04, pointerEvents:'none' }} xmlns="http://www.w3.org/2000/svg">
            <defs><pattern id="ag" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M 36 0 L 0 0 0 36" fill="none" stroke="white" strokeWidth="1"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#ag)"/>
          </svg>
          <div style={{ position:'absolute', top:-60, left:200, width:240, height:240, borderRadius:'50%', background:'transparent', pointerEvents:'none' }}/>
          <div style={{ position:'absolute', bottom:-80, right:100, width:300, height:300, borderRadius:'50%', background:'transparent', pointerEvents:'none' }}/>
          <div style={{ position:'relative', zIndex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.5)', letterSpacing:2, textTransform:'uppercase', marginBottom:6 }}>
                  {isSuperAdmin ? 'Super Admin' : 'Admin'} Dashboard
                </div>
                <h1 style={{ fontSize:26, fontWeight:700, color:'white', margin:0, lineHeight:1.2 }}>{authUser?.fullName || 'Admin'}</h1>
                <div style={{ fontSize:13, color:'rgba(255,255,255,.6)', marginTop:6 }}>
                  {new Date().toLocaleDateString('en-KE', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
                </div>
              </div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <button className="btn" style={{ background:'rgba(255,255,255,.08)', color:'white', border:'1px solid rgba(255,255,255,.15)', backdropFilter:'blur(8px)', fontSize:12, padding:'8px 16px' }} onClick={() => navigate('/admin/claims')}>
                  Claims {data.pendingClaims > 0 && <span style={{ background:'#EF4444', borderRadius:6, padding:'1px 6px', fontSize:10, marginLeft:4 }}>{data.pendingClaims}</span>}
                </button>
                {isSuperAdmin && (
                  <button className="btn" style={{ background:'rgba(79,70,229,.18)', color:'#C7D2FE', border:'1px solid rgba(99,102,241,.3)', fontSize:12, padding:'8px 16px' }} onClick={() => setShowNewAdmin(true)}>New Admin</button>
                )}
                <button className="btn" style={{ background:'#FDC703', color:'#0B1F3A', border:'none', fontWeight:700, fontSize:12, padding:'8px 16px' }} onClick={load}>Refresh</button>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:10, marginTop:20 }}>
              {[
                { label:'Agents',         value: data.totalAgents,  color:'#2F5D8C' },
                { label:'Total Policies', value: totalPolicies,     color:'#B08A3E' },
                { label:'Funeral',        value: funeralCount,      color:'#3B4B6B' },
                { label:'Bail',           value: bailCount,         color:'#2F5D8C' },
                { label:'Bail + Stipend', value: bailIncomeCount,   color:'#B08A3E' },
                { label:'Claims',         value: data.totalClaims,  color:'#9A4D6B' },
                ...(isSuperAdmin ? [{ label:'Revenue', value:'KES '+(data.totalRevenue||0).toLocaleString(), color:'#fff' }, { label:'Payouts', value:'KES '+(data.totalPayouts||0).toLocaleString(), color:'#fff' }, { label:'Net Position', value:'KES '+(data.netPosition||0).toLocaleString(), color:'#fff' }] : []),
              ].map(k => (
                <div key={k.label} className="kpi">
                  <div style={{ fontFamily:"'Source Serif 4',Georgia,serif", fontSize:20, fontWeight:700, color:'#fff', lineHeight:1, marginTop:2, whiteSpace:'nowrap' }}>{k.value ?? 0}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.7)', marginTop:4, letterSpacing:.4, textTransform:'uppercase' }}>{k.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
          {[
            { id:'overview',  label:'Overview' },
            { id:'agents',    label:'Agents' },
            ...(isSuperAdmin ? [
              { id:'financial', label:'Financial Health' },
              { id:'admins',    label:'Admin Accounts' },
            ] : []),
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:'8px 18px', borderRadius:999, border:'1px solid rgba(255,255,255,.7)', backdropFilter:'blur(10px)', cursor:'pointer', fontSize:12, fontWeight:600, background: tab===t.id ? '#0B1F3A' : 'rgba(255,255,255,.6)', color: tab===t.id ? 'white' : '#0B1F3A', boxShadow: tab===t.id ? '0 2px 8px rgba(0,214,143,.3)' : 'none' }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && <div style={{ textAlign:'center', padding:40, color:'var(--muted)' }}>Loading...</div>}

        {!loading && tab === 'overview' && (
          <>
            <ExecutiveCharts data={data} isSuperAdmin={isSuperAdmin}/>
            <PolicyBreakdownCard data={data}/>

            <div className="stats-grid" style={{ marginBottom:16, gridTemplateColumns:'repeat(2, 1fr)' }}>
              {[
                { label:'Agents',        value: data.totalAgents,  color:'#2F5D8C', bg:'#EEF3F8' },
                { label:'Total Claims',  value: data.totalClaims,  color:'#9A4D6B', bg:'#F6EEF1' },
                ...(isSuperAdmin ? [
                  { label:'Admin Accounts', value:(data.admins||[]).length, color:'#3B4B6B', bg:'#EEF1F6' },
                  { label:'Net Position', value:'KES '+(data.netPosition||0).toLocaleString(), color:(data.netPosition||0)>=0?'var(--green)':'var(--red)', bg:(data.netPosition||0)>=0?'var(--green-light)':'var(--red-light)' },
                ] : []),
                { label:'Claims Pending', value: data.pendingClaims, color:'var(--red)', bg:'var(--red-light)' },
              ].map(stat => (
                <div key={stat.label} className="stat-card" style={{ padding:'12px 10px' }}>
                  <div className="stat-icon" style={{ background:stat.bg, color:stat.color }}></div>
                  <div className="stat-value" style={{ color:stat.color }}>{stat.value ?? 0}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="two-col" style={{ marginBottom:16 }}>
              <div className="card" style={{ padding:'14px' }}>
                <div style={{ fontSize:12, fontWeight:700, marginBottom:10 }}>Risk Distribution</div>
                {riskData.length > 0 ? (
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <ResponsiveContainer width={110} height={110}>
                      <PieChart>
                        <Pie data={riskData} cx="50%" cy="50%" innerRadius={28} outerRadius={50} dataKey="value" paddingAngle={4}>
                          {riskData.map((d,i) => <Cell key={i} fill={d.color}/>)}
                        </Pie>
                        <Tooltip formatter={(v,n) => [v,n]}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {riskData.map(d => (
                        <div key={d.name} style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:8, height:8, borderRadius:2, background:d.color, flexShrink:0 }}/>
                          <span style={{ fontSize:11, color:'var(--muted)' }}>{d.name}</span>
                          <span style={{ fontWeight:700, fontSize:12, marginLeft:'auto', color:d.color }}>{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ height:110, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--muted)', fontSize:12 }}>No risk data yet</div>
                )}
              </div>

              <div className="card" style={{ padding:'14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                  <div style={{ fontSize:12, fontWeight:700 }}>Recent Claims</div>
                  <button className="btn btn-sm btn-secondary" style={{ fontSize:11, padding:'4px 10px' }} onClick={() => navigate('/admin/claims')}>All</button>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  {(data.recentClaims || []).slice(0,4).map(c => (
                    <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'var(--bg)', borderRadius:8 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.userId?.fullName || c.userName || 'Unknown'}</div>
                        <div style={{ fontSize:10, color:'var(--muted)', marginTop:1 }}>
                          <span style={{ fontWeight:600, textTransform:'capitalize' }}>{c.type==='income'?'Stipend':c.type}</span>{' · '}{c.referenceNumber||'—'}{(c.amountRequested||c.amountApproved)?' · KES '+(c.amountRequested||c.amountApproved).toLocaleString():''}
                        </div>
                      </div>
                      <span className={'status-badge status-'+c.status} style={{ fontSize:9, padding:'2px 7px' }}>{c.status}</span>
                    </div>
                  ))}
                  {(data.recentClaims||[]).length===0 && <div style={{ textAlign:'center', padding:'16px 0', color:'var(--muted)', fontSize:12 }}>No claims yet</div>}
                </div>
              </div>
            </div>

            {pending.length > 0 && (
              <div className="card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:10 }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:700 }}>Pending KYC Reviews</div>
                    <div style={{ fontSize:12, color:'var(--muted)' }}>Review documents before approving accounts</div>
                  </div>
                  <span style={{ fontSize:12, background:'#FFF8E1', color:'#92400E', padding:'4px 12px', borderRadius:8, fontWeight:600 }}>{filteredPending.length} of {pending.length}</span>
                </div>

                {/* Search + filter bar */}
                <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
                  <input
                    className="form-input"
                    placeholder="Search by name, phone or member number..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ flex:1, minWidth:200, fontSize:12, padding:'7px 12px' }}
                  />
                  <select
                    className="form-input"
                    value={filterRole}
                    onChange={e => setFilterRole(e.target.value)}
                    style={{ width:130, fontSize:12, padding:'7px 10px' }}
                  >
                    <option value="all">All roles</option>
                    <option value="rider">Rider</option>
                    <option value="member">Member</option>
                    <option value="agent">Agent</option>
                  </select>
                  {(searchQuery || filterRole !== 'all') && (
                    <button className="btn btn-secondary" style={{ fontSize:11, padding:'7px 12px', whiteSpace:'nowrap' }} onClick={() => { setSearchQuery(''); setFilterRole('all'); }}>
                      Clear
                    </button>
                  )}
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width:'30%' }}>Name</th>
                        <th style={{ width:'15%' }}>Member No.</th>
                        <th style={{ width:'10%' }}>Role</th>
                        <th style={{ width:'15%' }}>County</th>
                        <th style={{ width:'15%' }}>Joined</th>
                        <th style={{ width:'15%' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPending.length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign:'center', padding:24, color:'var(--muted)', fontSize:12 }}>No results match your search</td></tr>
                      )}
                      {filteredPending.slice(0,20).map(p => (
                        <tr key={p.id}>
                          <td style={{ fontWeight:600, fontSize:13 }}>{s(p.fullName)}<div style={{ fontSize:11, color:'var(--muted)' }}>{s(p.phone)}</div></td>
                          <td style={{ fontSize:11, fontWeight:700 }}>{sd(p.memberNumber||p.nokNumber)}</td>
                          <td><span className={'tier-badge '+(p.role==='rider'?'tier-green':p.role==='member'?'tier-yellow':'tier-red')} style={{ fontSize:10 }}>{s(p.role)}</span></td>
                          <td style={{ fontSize:12 }}>{typeof p.profile?.county==='object'?'—':(p.profile?.county||'—')}</td>
                          <td style={{ fontSize:11, color:'var(--muted)' }}>{new Date(p.createdAt).toLocaleDateString('en-KE')}</td>
                          <td><button className="btn btn-sm btn-primary" style={{ fontSize:11, padding:'5px 12px' }} onClick={() => setReviewPerson({...p,id:String(p._id||p.id)})}>Review</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && tab === 'agents' && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontSize:14, fontWeight:700 }}>Field Agents</div>
              <button className="btn btn-sm" onClick={() => setShowNewAgent(true)} style={{ background:'#0F7B5C', color:'white', border:'none' }}>New Agent</button>
            </div>
            {agents.length > 0 && (
              <div className="card" style={{ marginBottom:20 }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:12 }}>Agent Onboarding Performance</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={agents.map(a => ({ name:(a.name||a.fullName||'').split('')[0], riders:a.ridersCount, members:a.membersCount, kyc:a.approvedKYC }))} barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                    <XAxis dataKey="name" tick={{ fontSize:11 }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize:10 }} axisLine={false} tickLine={false}/>
                    <Tooltip/>
                    <Bar dataKey="riders"  name="Riders"       fill="#1A9F73" radius={[4,4,0,0]}/>
                    <Bar dataKey="members" name="Members"      fill="#2F5D8C" radius={[4,4,0,0]}/>
                    <Bar dataKey="kyc"     name="KYC Approved" fill="#1E3A5F" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="card">
              <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>Agent Performance Details</div>
              {agents.length === 0 ? (
                <div className="empty-state"><p>No agents registered yet</p></div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Agent</th><th>Code</th><th>Region</th><th>Riders</th><th>Members</th><th>KYC Approved</th><th>KYC Pending</th><th>Claims</th><th>Approval Rate</th><th>Last Activity</th></tr></thead>
                    <tbody>
                      {agents.map(a => (
                        <tr key={a.id}>
                          <td style={{ fontWeight:600 }}>{s(a.name||a.fullName)}<div style={{ fontSize:11, color:'var(--muted)' }}>{s(a.phone)}</div></td>
                          <td style={{ fontFamily:'monospace', fontSize:12, color:'var(--green)', fontWeight:700 }}>{s(a.agentCode)}</td>
                          <td style={{ fontSize:12 }}>{typeof a.region==='object'?'':(a.region||'')}</td>
                          <td style={{ fontWeight:600, textAlign:'center' }}>{a.ridersCount??0}</td>
                          <td style={{ fontWeight:600, textAlign:'center' }}>{a.membersCount??0}</td>
                          <td style={{ fontWeight:600, textAlign:'center', color:'var(--green)' }}>{a.approvedKYC??0}</td>
                          <td style={{ fontWeight:600, textAlign:'center', color:'var(--yellow)' }}>{a.pendingKYC??0}</td>
                          <td style={{ textAlign:'center' }}>{a.claimsCount??0}</td>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <div style={{ flex:1, height:5, background:'var(--border)', borderRadius:3, overflow:'hidden' }}>
                                <div style={{ width:(a.kycApprovalRate||0)+'%', height:'100%', borderRadius:3, background:(a.kycApprovalRate||0)>=80?'var(--green)':(a.kycApprovalRate||0)>=50?'#EAB308':'var(--red)' }}/>
                              </div>
                              <span style={{ fontSize:11, fontWeight:600, width:32 }}>{a.kycApprovalRate??0}%</span>
                            </div>
                          </td>
                          <td style={{ fontSize:11, color:'var(--muted)' }}>{a.lastActivity ? new Date(a.lastActivity).toLocaleDateString('en-KE') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {!loading && tab === 'financial' && isSuperAdmin && (
          <>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
              {[
                { label:'Total Revenue',   value:'KES '+(data.totalRevenue||0).toLocaleString(),  color:'#1A9F73', bg:'#E8F3EF' },
                { label:'Total Payouts',   value:'KES '+(data.totalPayouts||0).toLocaleString(),  color:'#EF4444', bg:'#FEF2F2' },
                { label:'Net Position',    value:'KES '+(data.netPosition||0).toLocaleString(),   color:(data.netPosition||0)>=0?'#1A9F73':'#EF4444', bg:(data.netPosition||0)>=0?'#E8F3EF':'#FEF2F2' },
                { label:'Active Policies', value:(data.activePolicies||0).toLocaleString(),       color:'#1E3A5F', bg:'#EEF1F6' },
                { label:'Total Claims',    value:(data.totalClaims||0).toLocaleString(),           color:'#B08A3E', bg:'#FFFBEB' },
                { label:'Paid Claims',     value:(data.claimBreakdown||[]).reduce((a,c)=>a+(c.paid||0),0).toLocaleString(), color:'#0F7B5C', bg:'#EEF6F2' },
              ].map(k => (
                <div key={k.label} style={{ background:'var(--surface)', borderRadius:6, padding:'14px 16px', border:'1px solid var(--border)', position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:k.color, borderRadius:'8px 8px 0 0' }}/>
                  <div style={{ width:34, height:34, borderRadius:8, background:k.bg, marginBottom:8 }}/>
                  <div style={{ fontWeight:700, fontSize:17, color:k.color, lineHeight:1, marginBottom:3 }}>{k.value}</div>
                  <div style={{ fontSize:10, color:'var(--muted)', fontWeight:500 }}>{k.label}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:16 }}>Revenue vs Payouts — Last 12 Months</div>
              {(data.monthlyFinancials||[]).length===0 ? (
                <div style={{ textAlign:'center', padding:'40px 0', color:'var(--muted)', fontSize:13 }}>No payment data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.monthlyFinancials||[]} barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                    <XAxis dataKey="month" tick={{ fontSize:10 }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>(v/1000).toFixed(0)+'k'}/>
                    <Tooltip formatter={v=>'KES '+v.toLocaleString()}/><Legend/>
                    <Bar dataKey="revenue" name="Revenue" fill="#1A9F73" radius={[3,3,0,0]}/>
                    <Bar dataKey="payouts" name="Payouts" fill="#EF4444" radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="card" style={{ marginBottom:16 }}>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:16 }}>Net Financial Position — 12 Months</div>
              {(data.monthlyFinancials||[]).length===0 ? (
                <div style={{ textAlign:'center', padding:'40px 0', color:'var(--muted)', fontSize:13 }}>No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={data.monthlyFinancials||[]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                    <XAxis dataKey="month" tick={{ fontSize:10 }} axisLine={false} tickLine={false}/>
                    <YAxis tick={{ fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>(v/1000).toFixed(0)+'k'}/>
                    <Tooltip formatter={v=>'KES '+v.toLocaleString()}/>
                    <Line type="monotone" dataKey="net" name="Net Position" stroke="#1E3A5F" strokeWidth={2.5} dot={{ r:3 }} activeDot={{ r:5 }}/>
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
              <div className="card">
                <div style={{ fontWeight:700, fontSize:14, marginBottom:14 }}>Claims by Type</div>
                {(data.claimBreakdown||[]).length===0 ? (
                  <div style={{ textAlign:'center', padding:24, color:'var(--muted)', fontSize:12 }}>No claims yet</div>
                ) : (
                  (data.claimBreakdown||[]).map(c => (
                    <div key={c.type} style={{ marginBottom:12 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ fontSize:12, fontWeight:700, textTransform:'capitalize' }}>{c.type==='bail'?'Bail':c.type==='income'?'Income':'Funeral'} ({c.total})</span>
                        <span style={{ fontSize:11, color:'var(--muted)' }}>KES {(c.amount||0).toLocaleString()} paid</span>
                      </div>
                      <div style={{ display:'flex', gap:3, height:6, borderRadius:3, overflow:'hidden', background:'#F1F5F9' }}>
                        <div style={{ width:(c.total?((c.paid/c.total)*100):0)+'%', background:'#1A9F73' }}/>
                        <div style={{ width:(c.total?((c.pending/c.total)*100):0)+'%', background:'#B08A3E' }}/>
                        <div style={{ width:(c.total?((c.rejected/c.total)*100):0)+'%', background:'#EF4444' }}/>
                      </div>
                      <div style={{ display:'flex', gap:12, marginTop:4, fontSize:10, color:'var(--muted)' }}>
                        <span>{c.paid} paid</span><span>{c.pending} pending</span><span>{c.rejected} rejected</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="card">
                <div style={{ fontWeight:700, fontSize:14, marginBottom:14 }}>Member Growth — 6 Months</div>
                {(data.userGrowth||[]).length===0 ? (
                  <div style={{ textAlign:'center', padding:24, color:'var(--muted)', fontSize:12 }}>No growth data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={data.userGrowth||[]} barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
                      <XAxis dataKey="month" tick={{ fontSize:10 }} axisLine={false} tickLine={false}/>
                      <YAxis tick={{ fontSize:10 }} axisLine={false} tickLine={false}/>
                      <Tooltip/>
                      <Bar dataKey="riders"  name="Riders"  fill="#1A9F73" radius={[3,3,0,0]}/>
                      <Bar dataKey="members" name="Members" fill="#3B4B6B" radius={[3,3,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        )}

        {!loading && tab === 'admins' && isSuperAdmin && (
          <div className="card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontWeight:700, fontSize:14 }}>Admin Accounts ({(data.admins||[]).length})</div>
              <button className="btn btn-sm" onClick={() => setShowNewAdmin(true)} style={{ background:'#1E3A5F', color:'white', border:'none' }}>New Admin</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr style={{ borderBottom:'2px solid var(--border)' }}>
                    {['Name','Phone','Role','Joined','Status'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'8px 12px', fontSize:10, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:.6 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.admins||[]).length===0 && <tr><td colSpan={5} style={{ textAlign:'center', padding:32, color:'var(--muted)' }}>No admin accounts yet</td></tr>}
                  {(data.admins||[]).map(a => (
                    <tr key={a.id} style={{ borderBottom:'1px solid var(--border)' }}>
                      <td style={{ padding:'10px 12px', fontWeight:700 }}>{a.fullName}</td>
                      <td style={{ padding:'10px 12px', color:'var(--muted)' }}>{a.phone}</td>
                      <td style={{ padding:'10px 12px' }}>
                        <span style={{ background:a.role==='superadmin'?'#1E3A5F':'var(--green-light)', color:a.role==='superadmin'?'white':'var(--green)', borderRadius:8, padding:'2px 10px', fontSize:11, fontWeight:700 }}>
                          {a.role==='superadmin'?'Super Admin':'Admin'}
                        </span>
                      </td>
                      <td style={{ padding:'10px 12px', color:'var(--muted)', fontSize:12 }}>{new Date(a.createdAt).toLocaleDateString('en-KE')}</td>
                      <td style={{ padding:'10px 12px' }}><span className={'status-badge '+(a.suspended?'status-rejected':'status-approved')}>{a.suspended?'Suspended':'Active'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      <OnboardReviewModal person={reviewPerson} onClose={() => setReviewPerson(null)} onApprove={handleApprove} onReject={handleReject} onSuspend={setSuspendPerson}/>
      <SuspendModal user={suspendPerson} onClose={() => setSuspendPerson(null)} onSuspend={handleSuspend}/>
      {showNewAgent && <QuickCreateAgent onClose={() => setShowNewAgent(false)} onDone={() => { setShowNewAgent(false); load(); }}/>}
      {showNewAdmin && <QuickCreateAdmin onClose={() => setShowNewAdmin(false)} onDone={() => { setShowNewAdmin(false); load(); }}/>}
    </div>
  );
}

const TYPE_META = { bail:{ icon:'B' }, funeral:{ icon:'F' }, income:{ icon:'I' } };