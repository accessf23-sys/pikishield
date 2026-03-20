import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import CameraCapture from '../components/CameraCapture';
import { usersAPI, documentsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
const s=(v,fb='')=>v==null?fb:typeof v==='object'?fb:String(v)||fb; const sd=(v)=>s(v,'—');


async function downloadDoc(id, name) {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/documents/${id}/download`, { headers: token ? { Authorization:`Bearer ${token}` } : {} });
  if (!res.ok) { alert('Download failed'); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=name||'doc'; a.style.display='none';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}
async function previewDoc(id) {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/documents/${id}/preview`, { headers: token ? { Authorization:`Bearer ${token}` } : {} });
  if (!res.ok) { alert('Preview failed'); return; }
  window.open(URL.createObjectURL(await res.blob()),'_blank');
}

function KycDocViewer({ userId }) {
  const [docs,setDocs]=useState([]); const [loading,setLoading]=useState(false);
  useEffect(()=>{ documentsAPI.getForUser(userId).then(r=>setDocs(r.data||[])).catch(()=>setDocs([])).finally(()=>setLoading(false)); },[userId]);
  
  if (!docs.length) return <div style={{background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#92400E'}}>⚠️ No KYC documents uploaded yet.</div>;
  return (
    <div style={{display:'flex',flexDirection:'column',gap:7}}>
      {docs.map(d=>(
        <div key={d.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#F8FAFC',borderRadius:8,padding:'9px 11px',border:'1px solid #E5E7EB'}}>
          <div style={{fontSize:12,fontWeight:600,color:'#374151'}}>📄 {d.docType||d.originalName}</div>
          <div style={{display:'flex',gap:5}}>
            <button style={{fontSize:11,padding:'3px 8px',background:'#EFF6FF',color:'#1D4ED8',border:'1px solid #BFDBFE',borderRadius:5,cursor:'pointer',fontWeight:600}} onClick={()=>previewDoc(d.id)}>👁 View</button>
            <button style={{fontSize:11,padding:'3px 8px',background:'#F0FDF4',color:'#15803D',border:'1px solid #BBF7D0',borderRadius:5,cursor:'pointer',fontWeight:600}} onClick={()=>downloadDoc(d.id,d.originalName)}>⬇ Save</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function AgentPanel({ agent, onClose, onUpdate }) {
  const [reason,setReason]=useState(''); const [suspending,setSuspending]=useState(false); const [msg,setMsg]=useState('');
  const suspend = async () => { setSuspending(true); try { await usersAPI.suspendUser(agent.id,reason); setMsg('Agent suspended.'); onUpdate(agent.id,null,true); } catch(e){setMsg('Failed: '+e.response?.data?.error);} finally{setSuspending(false);} };
  const unsuspend = async () => { setSuspending(true); try { await usersAPI.unsuspendUser(agent.id); setMsg('Agent reinstated.'); onUpdate(agent.id,null,false); } catch(e){setMsg('Failed: '+e.response?.data?.error);} finally{setSuspending(false);} };
  const county = typeof (agent.profile?.county||agent.region)==='object' ? '' : (agent.profile?.county||agent.region||'');

  const InfoRow = ({label, value}) => (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 0',borderBottom:'1px solid #F1F5F9'}}>
      <span style={{fontSize:11,color:'#94A3B8',fontWeight:600,textTransform:'uppercase',letterSpacing:.6}}>{label}</span>
      <span style={{fontSize:13,fontWeight:700,color:'#111827',maxWidth:'60%',textAlign:'right',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
        {value==null||value===''||value===undefined?'—':typeof value==='object'?'—':String(value)||'—'}
      </span>
    </div>
  );

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div style={{background:'white',width:'100%',maxWidth:500,maxHeight:'calc(100vh - 40px)',
        overflowY:'auto',borderRadius:16,boxShadow:'0 32px 80px rgba(0,0,0,.5)',
        display:'flex',flexDirection:'column',boxSizing:'border-box'}}
        onClick={e=>e.stopPropagation()}>

        {/* Dark header — same style as claims review */}
        <div style={{background:'linear-gradient(135deg,#050E1F 0%,#07312A 100%)',
          borderRadius:'16px 16px 0 0',padding:'20px 22px',flexShrink:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div>
              <div style={{fontSize:11,color:'rgba(255,255,255,.45)',fontWeight:600,textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Field Agent</div>
              <div style={{fontWeight:800,fontSize:18,color:'white',letterSpacing:'-0.3px',marginBottom:8}}>{agent.fullName}</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <span style={{background:'rgba(0,214,143,.18)',border:'1px solid rgba(0,214,143,.4)',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:700,color:'#00D68F'}}>
                  {agent.agentCode||agent.memberNumber}
                </span>
                <span style={{background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.15)',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:600,color:'rgba(255,255,255,.7)'}}>
                  📍 {county.toUpperCase()||'—'}
                </span>
                {agent.suspended && <span style={{background:'rgba(239,68,68,.2)',border:'1px solid rgba(239,68,68,.4)',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:700,color:'#FCA5A5'}}>SUSPENDED</span>}
                <span style={{background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.15)',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:600,color:'rgba(255,255,255,.7)'}}>
                  {agent.kycStatus==='approved'?'✅':'⏳'} KYC {agent.kycStatus||'pending'}
                </span>
              </div>
            </div>
            <button onClick={onClose} style={{background:'rgba(255,255,255,.12)',border:'none',borderRadius:8,width:32,height:32,cursor:'pointer',color:'white',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{padding:'18px 22px 24px',display:'flex',flexDirection:'column',gap:14}}>
          {msg && <div style={{background:'#F0FDF4',border:'1px solid #A7F3D0',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#065F46'}}>{msg}</div>}

          {/* Agent Details */}
          <div style={{background:'#F8FAFC',borderRadius:12,border:'1px solid #E5E7EB',padding:'14px 16px'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:1,marginBottom:2}}>Agent Details</div>
            <InfoRow label="Agent Code" value={agent.agentCode||agent.memberNumber}/>
            <InfoRow label="Phone" value={agent.phone}/>
            <InfoRow label="County / Region" value={county.toUpperCase()}/>
            <InfoRow label="Email" value={agent.email}/>
            <InfoRow label="National ID" value={agent.nationalId}/>
            <InfoRow label="Commission" value={(agent.commissionRate||5)+'%'}/>
            <InfoRow label="Joined" value={new Date(agent.createdAt).toLocaleDateString('en-KE')}/>
          </div>

          {/* Account Control */}
          <div style={{background:'#F8FAFC',borderRadius:12,border:'1px solid #E5E7EB',padding:'14px 16px'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>⚠️ Account Control</div>
            {!agent.suspended ? (
              <>
                <div className="form-group" style={{marginBottom:8}}>
                  <label className="form-label">Suspension reason</label>
                  <input className="form-input" placeholder="e.g. Policy violation..." value={reason} onChange={e=>setReason(e.target.value)}/>
                </div>
                <button className="btn btn-danger" style={{width:'100%',justifyContent:'center'}} onClick={suspend} disabled={suspending}>
                  {suspending?'Suspending…':'🔒 Suspend Agent'}
                </button>
              </>
            ) : (
              <>
                <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:8,padding:'10px 14px',marginBottom:10,fontSize:12,color:'#991B1B'}}>
                  <div style={{fontWeight:700,marginBottom:2}}>Account suspended</div>
                  <div>{agent.suspendReason||'No reason recorded'}</div>
                </div>
                <button className="btn btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={unsuspend} disabled={suspending}>
                  {suspending?'Reinstating…':'✅ Reinstate Agent'}
                </button>
              </>
            )}
          </div>

          {/* KYC Documents */}
          <div style={{background:'#F8FAFC',borderRadius:12,border:'1px solid #E5E7EB',padding:'14px 16px'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>📎 KYC Documents</div>
            <KycDocViewer userId={agent.id}/>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminAgentsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';
  const [reportData,setReportData]=useState({ agents:[], totals:{} }); const [allData,setAllData]=useState({ allUsers:[] });
  const [loading,setLoading]=useState(false); const [selected,setSelected]=useState(null);
  // Doc upload state for Create Agent
  const [agentTempId]=useState(()=>'AGT_'+Date.now());
  const [agentIdDoc,setAgentIdDoc]=useState(null); const [agentIdUploading,setAgentIdUploading]=useState(false);
  // Doc upload state for Create Admin
  const [adminTempId]=useState(()=>'ADM_'+Date.now());
  const [adminIdDoc,setAdminIdDoc]=useState(null); const [adminIdUploading,setAdminIdUploading]=useState(false);
  const [tab,setTab]=useState('list'); const [search,setSearch]=useState(''); const [countyFilter,setCountyFilter]=useState('all');
  const [showCreate,setShowCreate]=useState(false);
  const [agentModalKey,setAgentModalKey]=useState(0);
  const [form,setForm]=useState({fullName:'',phone:'',email:'',nationalId:'',region:'',password:'',commission:''});
  const [creating,setCreating]=useState(false); const [createErr,setCreateErr]=useState(''); const [createOk,setCreateOk]=useState('');
  const [showAdmin,setShowAdmin]=useState(false);
  const [adminModalKey,setAdminModalKey]=useState(0);
  const [adminForm,setAdminForm]=useState({fullName:'',phone:'',email:'',password:''});
  const [adminCreating,setAdminCreating]=useState(false); const [adminErr,setAdminErr]=useState(''); const [adminOk,setAdminOk]=useState('');

  const load=()=>{ Promise.all([usersAPI.getAgentReport().then(r=>setReportData(r.data)),usersAPI.getAdminDashboard().then(r=>setAllData(r.data))]).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); },[]);

  const uploadIdDoc=(file, tempId, setDoc, setUploading, role)=>{
    if(!file) return;
    const allowed=['image/jpeg','image/png','image/jpg','application/pdf'];
    if(!allowed.includes(file.type)) return alert('Please upload a JPG, PNG or PDF file');
    setUploading(true);
    const fd=new FormData(); fd.append('files',file); fd.append('docType','national_id'); fd.append('tempUploadId',tempId);
    fetch('/api/documents/upload-kyc',{method:'POST',headers:{'Authorization':'Bearer '+localStorage.getItem('token')},body:fd})
      .then(r=>r.json()).then(d=>{ if(d.documents?.[0]) setDoc(d.documents[0]); else alert('Upload failed: '+(d.error||'Unknown')); })
      .catch(()=>alert('Upload failed')).finally(()=>setUploading(false));
  };

  const handleCreate=async()=>{
    if(!form.fullName||!form.phone||!form.nationalId||!form.region||!form.password) return setCreateErr('Full name, phone, national ID, region and password are required');
    if(form.password.length<8) return setCreateErr('Password must be at least 8 characters');
    setCreating(true); setCreateErr(''); setCreateOk('');
    try { const res=await usersAPI.createAgent(form); const {agentCode,user}=res.data;
      // Attach uploaded ID doc to the new user if uploaded
      if(agentIdDoc && user?.id) {
        await fetch('/api/documents/attach-kyc',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('token')},body:JSON.stringify({tempUploadId:agentTempId,userId:user.id})}).catch(()=>{});
      }
      setCreateOk(`Agent: ${form.fullName}\nCode:  ${agentCode}\nPhone: ${form.phone}\nPass:  ${form.password}\nRegion: ${form.region}`); setForm({fullName:'',phone:'',email:'',nationalId:'',region:'',password:'',commission:''}); setAgentIdDoc(null); load(); }
    catch(e){ setCreateErr(e.response?.data?.error||'Failed to create agent'); } finally{ setCreating(false); }
  };

  const handleCreateAdmin=async()=>{
    if(!adminForm.fullName||!adminForm.phone||!adminForm.password) return setAdminErr('Full name, phone and password are required');
    if(adminForm.password.length<8) return setAdminErr('Password must be at least 8 characters');
    setAdminCreating(true); setAdminErr(''); setAdminOk('');
    try { const res=await usersAPI.createAdmin(adminForm); setAdminOk(`${res.data.message||'Admin created'}
Phone: ${adminForm.phone}
Pass:  ${adminForm.password}`); setAdminForm({fullName:'',phone:'',email:'',password:''}); load(); }
    catch(e){ setAdminErr(e.response?.data?.error||'Failed to create admin'); } finally{ setAdminCreating(false); }
  };

  const onUpdate=(userId,kycStatus,suspended)=>{
    if(allData) setAllData(prev=>({...prev,allUsers:(prev.allUsers||[]).map(u=>u.id!==userId?u:{...u,...(kycStatus?{kycStatus}:{}),...(suspended!==undefined?{suspended}:{})})}));
    if(selected?.id===userId) setSelected(prev=>({...prev,...(kycStatus?{kycStatus}:{}),...(suspended!==undefined?{suspended}:{})}));
  };



  const agents=reportData?.agents||[];
  const allAgents=(allData?.allUsers||[]).filter(u=>u.role==='agent');
  const allCounties=[...new Set(allAgents.map(u=>(u.profile?.county||u.region||'').toUpperCase()).filter(Boolean))].sort();
  let filtered=allAgents;
  if(countyFilter!=='all') filtered=filtered.filter(u=>(u.profile?.county||u.region||'').toUpperCase()===countyFilter);
  if(search){ const q=search.toLowerCase(); filtered=filtered.filter(u=>u.fullName?.toLowerCase().includes(q)||u.phone?.includes(q)||u.agentCode?.toLowerCase().includes(q)||u.memberNumber?.toLowerCase().includes(q)||(u.profile?.county||u.region||'').toLowerCase().includes(q)); }

  const totals={
    total:     Number(reportData?.totals?.total||reportData?.totals?.enrolled||0) || agents.reduce((s,a)=>s+(Number(a.totalOnboarded)||0),0),
    policies:  Number(reportData?.totals?.policies||0) || agents.reduce((s,a)=>s+(Number(a.activePolicies)||0),0),
    pendingKYC:Number(reportData?.totals?.pendingKYC||0) || agents.reduce((s,a)=>s+(Number(a.pendingKYC)||0),0),
    claims:    Number(reportData?.totals?.claims||0) || agents.reduce((s,a)=>s+(Number(a.claimsCount)||0),0),
  };
  const chartData=agents.map(a=>({name:(a.name||a.fullName||'').split(' ')[0],riders:a.ridersCount,members:a.membersCount,policies:a.activePolicies}));

  return (
    <div>
      {/* Create Agent Modal */}
      {showCreate&&(
        <div key={agentModalKey} className="admin-modal-backdrop" onClick={()=>{setShowCreate(false);setCreateErr('');setCreateOk('');}}>
          <div style={{width:'100%',maxWidth:520,background:'white',borderRadius:16,boxShadow:'0 32px 80px rgba(0,0,0,.45)',overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:'linear-gradient(135deg,#050E1F,#07312A)',padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',borderRadius:'16px 16px 0 0'}}>
              <div style={{display:'flex',alignItems:'center',gap:9}}>
                <div style={{width:32,height:32,borderRadius:7,background:'rgba(0,214,143,.2)',border:'1px solid rgba(0,214,143,.4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>🤝</div>
                <div><div style={{fontWeight:800,fontSize:13,color:'white'}}>Create Field Agent</div><div style={{fontSize:10,color:'rgba(255,255,255,.4)'}}>Agent logs in at the same login page</div></div>
              </div>
              <button onClick={()=>{setShowCreate(false);setCreateErr('');setCreateOk('');}} style={{background:'rgba(255,255,255,.1)',border:'none',borderRadius:7,width:28,height:28,color:'white',cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>
            <div style={{padding:'14px 16px 16px',maxHeight:'calc(90vh - 62px)',overflowY:'auto'}}>
              {createErr&&<div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:7,padding:'8px 11px',fontSize:12,color:'#991B1B',marginBottom:10}}>❌ {createErr}</div>}
              {createOk?(
                <div>
                  <div style={{background:'#F0FDF4',border:'2px solid #A7F3D0',borderRadius:10,padding:'13px',marginBottom:10}}>
                    <div style={{fontWeight:700,fontSize:13,color:'#065F46',marginBottom:7}}>✅ Agent Created Successfully!</div>
                    <div style={{fontSize:12,color:'#047857',fontFamily:'monospace',background:'#ECFDF5',borderRadius:5,padding:'9px',whiteSpace:'pre',lineHeight:1.9}}>{createOk}</div>
                    <div style={{fontSize:11,color:'#6B7280',marginTop:7,padding:'6px 9px',background:'#F9FAFB',borderRadius:5,lineHeight:1.5}}>📱 <strong>Agent login:</strong> Main login page → phone + password above.</div>
                  </div>
                  <div style={{display:'flex',gap:7}}>
                    <button style={{flex:1,padding:'9px',background:'linear-gradient(135deg,#059669,#00D68F)',color:'white',border:'none',borderRadius:7,fontWeight:700,fontSize:12,cursor:'pointer'}} onClick={()=>{setCreateOk('');setForm({fullName:'',phone:'',email:'',nationalId:'',region:'',password:'',commission:''});}}>➕ Create Another</button>
                    <button style={{flex:1,padding:'9px',background:'#F3F4F6',color:'#374151',border:'none',borderRadius:7,fontWeight:700,fontSize:12,cursor:'pointer'}} onClick={()=>{setShowCreate(false);setCreateOk('');}}>✓ Done</button>
                  </div>
                </div>
              ):(
                <div>
                  <input type="text" style={{display:"none"}} /><input type="password" style={{display:"none"}} /><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>
                    {[
                      {key:'fullName',label:'Full Name',placeholder:'e.g. John Kamau',type:'text',req:true,col:2},
                      {key:'phone',label:'Phone Number',placeholder:'+254700000000',type:'tel',req:true},
                      {key:'email',label:'Email (optional)',placeholder:'john@email.com',type:'email',req:false},
                      {key:'nationalId',label:'National ID',placeholder:'12345678',type:'text',req:true},
                      {key:'region',label:'Region / Territory',placeholder:'e.g. Nairobi CBD',type:'text',req:true},
                      {key:'commission',label:'Commission %',placeholder:'e.g. 5',type:'number',req:false},
                      {key:'password',label:'Initial Password',placeholder:'Min 8 characters',type:'text',req:true,col:2},
                    ].map(f=>(
                      <div key={f.key} style={{gridColumn:f.col===2?'1 / -1':undefined}}>
                        <label style={{fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>{f.label}{f.req&&<span style={{color:'#EF4444',marginLeft:2}}>*</span>}</label>
                        <input type={f.type} placeholder={f.placeholder} style={{width:'100%',border:'1.5px solid #E5E7EB',borderRadius:6,padding:'6px 9px',fontSize:12,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}
                          autoComplete={f.key==='password'?'new-password':'off'} value={form[f.key]||''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                          onFocus={e=>e.target.style.borderColor='#00D68F'} onBlur={e=>e.target.style.borderColor='#E5E7EB'}/>
                      </div>
                    ))}
                  </div>
                  <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:6,padding:'8px 10px',marginTop:10,fontSize:11,color:'#1E40AF',lineHeight:1.5}}>
                    ℹ️ Agent code like <strong>AGT-NAI-0001</strong> is auto-generated.
                  </div>
                  {/* ID Document Upload */}
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>📎 Copy of National ID <span style={{fontSize:10,color:'#9CA3AF'}}>(photo or scan · optional but recommended)</span></label>
                    <div style={{border:`2px dashed ${agentIdDoc?'#059669':'#D1D5DB'}`,borderRadius:8,padding:'10px 12px',textAlign:'center',background:agentIdDoc?'#F0FDF4':'#FAFAFA',transition:'all .2s'}}>
                      {agentIdDoc ? (
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                          <span style={{fontSize:11,color:'#059669',fontWeight:700}}>✅ {agentIdDoc.originalName} · {agentIdDoc.size?(agentIdDoc.size/1024).toFixed(0)+'KB':''}</span>
                          <button type="button" onClick={()=>setAgentIdDoc(null)} style={{fontSize:10,color:'#EF4444',background:'none',border:'none',cursor:'pointer',fontWeight:700}}>✕ Remove</button>
                        </div>
                      ) : (
                        <div>
                          <div style={{fontSize:11,color:'#6B7280',marginBottom:6}}>{agentIdUploading?'⏳ Uploading…':'📷 Take a photo or browse to upload ID'}</div>
                          <input type="file" accept="image/*,application/pdf" style={{display:'none'}} id="agentIdFile"
                            onChange={e=>uploadIdDoc(e.target.files[0],agentTempId,setAgentIdDoc,setAgentIdUploading,'agent')}/>
                          <div style={{display:'flex',gap:6,justifyContent:'center'}}>
                            <button type="button" disabled={agentIdUploading}
                              onClick={()=>document.getElementById('agentIdFile')?.click()}
                              style={{fontSize:11,padding:'5px 12px',background:'white',border:'1.5px solid #D1D5DB',borderRadius:6,cursor:'pointer',fontWeight:600}}>
                              📁 Browse File
                            </button>
                            <CameraCapture disabled={agentIdUploading} color="#059669"
                              onCapture={f=>uploadIdDoc(f,agentTempId,setAgentIdDoc,setAgentIdUploading,'agent')}/>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <button style={{width:'100%',marginTop:10,padding:'10px',background:'linear-gradient(135deg,#059669,#00D68F)',color:'white',border:'none',borderRadius:8,fontWeight:800,fontSize:13,cursor:'pointer'}} onClick={handleCreate} disabled={creating}>
                    {creating?'⏳ Creating…':'🤝 Create Agent Account'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      {showAdmin&&(
        <div key={adminModalKey} className="admin-modal-backdrop" onClick={()=>{setShowAdmin(false);setAdminErr('');setAdminOk('');}}>
          <div style={{width:'100%',maxWidth:380,background:'white',borderRadius:16,boxShadow:'0 32px 80px rgba(0,0,0,.45)',overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
            <div style={{background:'linear-gradient(135deg,#1E1B4B,#312E81)',padding:'14px 18px',display:'flex',justifyContent:'space-between',alignItems:'center',borderRadius:'16px 16px 0 0'}}>
              <div style={{display:'flex',alignItems:'center',gap:9}}>
                <div style={{width:32,height:32,borderRadius:7,background:'rgba(165,180,252,.2)',border:'1px solid rgba(165,180,252,.4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>🏢</div>
                <div><div style={{fontWeight:800,fontSize:13,color:'white'}}>Create Admin Account</div><div style={{fontSize:10,color:'rgba(255,255,255,.4)'}}>Full system access — use carefully</div></div>
              </div>
              <button onClick={()=>{setShowAdmin(false);setAdminErr('');setAdminOk('');}} style={{background:'rgba(255,255,255,.1)',border:'none',borderRadius:7,width:28,height:28,color:'white',cursor:'pointer',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
            </div>
            <div style={{padding:'14px 16px 16px'}}>
              {adminErr&&<div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:7,padding:'8px 11px',fontSize:12,color:'#991B1B',marginBottom:10}}>❌ {adminErr}</div>}
              {adminOk?(
                <div>
                  <div style={{background:'#F0FDF4',border:'2px solid #A7F3D0',borderRadius:10,padding:'13px',marginBottom:10}}>
                    <div style={{fontWeight:700,fontSize:13,color:'#065F46',marginBottom:7}}>✅ Admin Account Created!</div>
                    <div style={{fontSize:12,color:'#047857',fontFamily:'monospace',background:'#ECFDF5',borderRadius:5,padding:'9px',whiteSpace:'pre',lineHeight:1.9}}>{adminOk}</div>
                    <div style={{fontSize:11,color:'#6B7280',marginTop:7,lineHeight:1.5}}>🔐 Share these credentials securely. Admin logs in from the main login page.</div>
                  </div>
                  <div style={{display:'flex',gap:7}}>
                    <button style={{flex:1,padding:'9px',background:'linear-gradient(135deg,#4F46E5,#7C3AED)',color:'white',border:'none',borderRadius:7,fontWeight:700,fontSize:12,cursor:'pointer'}} onClick={()=>{setAdminOk('');setAdminForm({fullName:'',phone:'',email:'',password:''});}}>➕ Create Another</button>
                    <button style={{flex:1,padding:'9px',background:'#F3F4F6',color:'#374151',border:'none',borderRadius:7,fontWeight:700,fontSize:12,cursor:'pointer'}} onClick={()=>{setShowAdmin(false);setAdminOk('');}}>✓ Done</button>
                  </div>
                </div>
              ):(
                <div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {[{key:'fullName',label:'Full Name',placeholder:'e.g. Jane Wanjiku',type:'text',req:true},{key:'phone',label:'Phone Number',placeholder:'+254700000000',type:'tel',req:true},{key:'email',label:'Email (optional)',placeholder:'admin@email.com',type:'email',req:false},{key:'password',label:'Password',placeholder:'Min 8 characters',type:'password',req:true}].map(f=>(
                      <div key={f.key}>
                        <label style={{fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:2}}>{f.label}{f.req&&<span style={{color:'#EF4444',marginLeft:2}}>*</span>}</label>
                        <input type={f.type} placeholder={f.placeholder} style={{width:'100%',border:'1.5px solid #E5E7EB',borderRadius:6,padding:'6px 9px',fontSize:12,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}
                          value={adminForm[f.key]||''} onChange={e=>setAdminForm(p=>({...p,[f.key]:e.target.value}))} autoComplete={f.key==='password'?'new-password':f.key==='email'?'off':'on'}
                          onFocus={e=>e.target.style.borderColor='#7C3AED'} onBlur={e=>e.target.style.borderColor='#E5E7EB'}/>
                      </div>
                    ))}
                  </div>
                  <div style={{background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:6,padding:'8px 10px',marginTop:10,fontSize:11,color:'#92400E',lineHeight:1.5}}>
                    ⚠️ Admin accounts have <strong>full system access</strong>. Only create for trusted team members.
                  </div>
                  {/* Admin ID Document Upload */}
                  <div>
                    <label style={{fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>📎 Copy of National ID <span style={{fontSize:10,color:'#9CA3AF'}}>(photo or scan · optional but recommended)</span></label>
                    <div style={{border:`2px dashed ${adminIdDoc?'#4F46E5':'#D1D5DB'}`,borderRadius:8,padding:'10px 12px',textAlign:'center',background:adminIdDoc?'#EEF2FF':'#FAFAFA',transition:'all .2s'}}>
                      {adminIdDoc ? (
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8}}>
                          <span style={{fontSize:11,color:'#4F46E5',fontWeight:700}}>✅ {adminIdDoc.originalName} · {adminIdDoc.size?(adminIdDoc.size/1024).toFixed(0)+'KB':''}</span>
                          <button type="button" onClick={()=>setAdminIdDoc(null)} style={{fontSize:10,color:'#EF4444',background:'none',border:'none',cursor:'pointer',fontWeight:700}}>✕ Remove</button>
                        </div>
                      ) : (
                        <div>
                          <div style={{fontSize:11,color:'#6B7280',marginBottom:6}}>{adminIdUploading?'⏳ Uploading…':'📷 Take a photo or browse to upload ID'}</div>
                          <input type="file" accept="image/*,application/pdf" style={{display:'none'}} id="adminIdFile"
                            onChange={e=>uploadIdDoc(e.target.files[0],adminTempId,setAdminIdDoc,setAdminIdUploading,'admin')}/>
                          <div style={{display:'flex',gap:6,justifyContent:'center'}}>
                            <button type="button" disabled={adminIdUploading}
                              onClick={()=>document.getElementById('adminIdFile')?.click()}
                              style={{fontSize:11,padding:'5px 12px',background:'white',border:'1.5px solid #D1D5DB',borderRadius:6,cursor:'pointer',fontWeight:600}}>
                              📁 Browse File
                            </button>
                            <CameraCapture disabled={adminIdUploading} color="#4F46E5"
                              onCapture={f=>uploadIdDoc(f,adminTempId,setAdminIdDoc,setAdminIdUploading,'admin')}/>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <button style={{width:'100%',marginTop:10,padding:'10px',background:'linear-gradient(135deg,#4F46E5,#7C3AED)',color:'white',border:'none',borderRadius:8,fontWeight:800,fontSize:13,cursor:'pointer'}} onClick={handleCreateAdmin} disabled={adminCreating}>
                    {adminCreating?'⏳ Creating…':'🏢 Create Admin Account'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selected&&<AgentPanel agent={selected} onClose={()=>setSelected(null)} onUpdate={onUpdate}/>}

      <div className="page-header">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <h1 className="page-title">Field Agents</h1>
            <p className="page-subtitle">{allAgents.length} agents · {allCounties.length} counties covered</p>
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {['list','report'].map(t=>(
              <button key={t} className={`btn btn-sm ${tab===t?'btn-primary':'btn-secondary'}`} onClick={()=>setTab(t)}>
                {t==='list'?'📋 Agent List':'📊 Performance'}
              </button>
            ))}
            <button className="btn btn-sm btn-primary" onClick={()=>{setAgentModalKey(k=>k+1);setShowCreate(true);}}>
              🤝 New Agent
            </button>
            {isSuperAdmin && (
              <button className="btn btn-sm" onClick={()=>{setAdminModalKey(k=>k+1);setShowAdmin(true);}}
                style={{background:'linear-gradient(135deg,#4F46E5,#7C3AED)',color:'white',border:'none'}}>
                🏢 New Admin
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="page-body">
        <input type="text" style={{display:"none"}} /><input type="password" style={{display:"none"}} /><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10,marginBottom:16,minHeight:'100px'}}>
          {[
            {icon:'🤝',value:allAgents.length,label:'Total Agents',color:'#00D68F',bg:'#E6FBF3'},
            {icon:'👥',value:Number(totals.total)||0,label:'Members Onboarded',color:'#3B82F6',bg:'#EFF6FF'},
            {icon:'🛡️',value:Number(totals.policies)||0,label:'Active Policies',color:'#4F46E5',bg:'#EEF2FF'},
            {icon:'⏳',value:Number(totals.pendingKYC)||0,label:'Pending KYC',color:'#F59E0B',bg:'#FFFBEB'},
          ].map(s=>(
            <div key={s.label} style={{background:'var(--surface)',borderRadius:10,padding:'11px 13px',border:'1px solid var(--border)',position:'relative',overflow:'hidden'}}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:s.color,borderRadius:'10px 10px 0 0'}}/>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:30,height:30,borderRadius:7,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{s.icon}</div>
                <div><div style={{fontWeight:800,fontSize:18,color:s.color,lineHeight:1}}>{s.value}</div><div style={{fontSize:10,color:'var(--muted)',marginTop:1}}>{s.label}</div></div>
              </div>
            </div>
          ))}
        </div>

        {tab==='list'&&(
          <div className="card">
            <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
              <input className="form-input" placeholder="🔍 Search name, code, county…" value={search} onChange={e=>setSearch(e.target.value)} style={{flex:'1 1 160px',maxWidth:240}}/>
              <select className="form-input" value={countyFilter} onChange={e=>setCountyFilter(e.target.value)} style={{width:155}}>
                <option value="all">All Counties</option>
                {allCounties.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <span style={{fontSize:11,color:'var(--muted)',marginLeft:'auto'}}>{filtered.length} agent{filtered.length!==1?'s':''}</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Code</th>
                    <th>Phone</th>
                    <th>County</th>
                    <th>Comm.</th>
                    <th>Onboarded</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length===0 && (
                    <tr><td colSpan={9} style={{textAlign:'center',color:'var(--muted)',padding:32,fontSize:13}}>
                      {allAgents.length===0 ? 'No agents yet — click 🤝 New Agent' : 'No agents match your search'}
                    </td></tr>
                  )}
                  {filtered.map(u => {
                    const agentData = agents.find(a=>String(a._id||a.id)===String(u._id||u.id));
                    const county = (typeof (u.profile?.county||u.region)==='object' ? '' : u.profile?.county||u.region||'').toUpperCase() || '—';
                    return (
                      <tr key={u.id} style={{opacity: u.suspended ? 0.65 : 1}}>
                        <td>
                          <div style={{fontWeight:700,fontSize:13}}>{s(u.fullName)}
                            {u.suspended && <span style={{fontSize:9,background:'#EF4444',color:'white',borderRadius:10,padding:'1px 5px',marginLeft:6,fontWeight:700}}>SUSP</span>}
                          </div>
                        </td>
                        <td>
                          <span style={{background:'#DCFCE7',color:'#15803D',padding:'2px 9px',borderRadius:20,fontSize:11,fontWeight:700,fontFamily:'monospace'}}>
                            {sd(u.agentCode||u.memberNumber)}
                          </span>
                        </td>
                        <td style={{fontSize:12}}>{s(u.phone)}</td>
                        <td style={{fontSize:12}}>{county}</td>
                        <td style={{fontSize:12,textAlign:'center',fontWeight:600}}>{s(u.commissionRate)||'5'}%</td>
                        <td>
                          {agentData ? (
                            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                              <span style={{background:'#DCFCE7',color:'#15803D',padding:'1px 7px',borderRadius:10,fontSize:10,fontWeight:700}}>{agentData.ridersCount||0} riders</span>
                              <span style={{background:'#F5F3FF',color:'#6D28D9',padding:'1px 7px',borderRadius:10,fontSize:10,fontWeight:700}}>{agentData.membersCount||0} mbr</span>
                            </div>
                          ) : <span style={{color:'var(--muted)',fontSize:11}}>—</span>}
                        </td>
                        <td><span className={`status-badge ${u.suspended?'status-rejected':'status-approved'}`}>{u.suspended?'Suspended':'Active'}</span></td>
                        <td style={{fontSize:11,color:'var(--muted)'}}>{new Date(u.createdAt).toLocaleDateString('en-KE')}</td>
                        <td><button className="btn btn-secondary btn-sm" onClick={()=>setSelected(u)}>View</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab==='report'&&(
          <>
            {agents.length>0&&(
              <div className="card" style={{marginBottom:14}}>
                <h3 style={{fontSize:13,fontWeight:700,marginBottom:10}}>Onboarding Performance by Agent</h3>
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={chartData} barSize={16}>
                    <XAxis dataKey="name" tick={{fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:10}} axisLine={false} tickLine={false}/>
                    <Tooltip/>
                    <Bar dataKey="riders" name="Riders" fill="#22C55E" radius={[3,3,0,0]}/>
                    <Bar dataKey="members" name="Members" fill="#8B5CF6" radius={[3,3,0,0]}/>
                    <Bar dataKey="policies" name="Policies" fill="#3B82F6" radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:9}}>
              {agents.length===0&&<div className="card"><div className="empty-state"><div className="emoji">🤝</div><p>No agents registered yet.</p></div></div>}
              {agents.map(a=>(
                <div key={a.id} className="card" style={{padding:'11px 14px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:32,height:32,borderRadius:7,background:'linear-gradient(135deg,#00D68F22,#00D68F44)',border:'1px solid #00D68F44',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>🤝</div>
                      <div>
                        <div style={{fontWeight:800,fontSize:13}}>{a.name||a.fullName||''}</div>
                        <div style={{fontSize:10,color:'var(--muted)',marginTop:1,display:'flex',alignItems:'center',gap:4}}>
                          <span style={{background:'#DCFCE7',color:'#15803D',padding:'1px 5px',borderRadius:20,fontSize:9,fontWeight:700}}>{a.agentCode}</span>
                          <span>{a.region||''}</span><span style={{color:'var(--border)'}}>·</span><span>{a.phone||''}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}><div style={{fontSize:9,color:'var(--muted)'}}>KYC Rate</div><div style={{fontWeight:800,fontSize:17,color:a.kycApprovalRate>70?'#00D68F':a.kycApprovalRate>40?'#F59E0B':'#EF4444',lineHeight:1}}>{a.kycApprovalRate}%</div></div>
                  </div>
                  <input type="text" style={{display:"none"}} /><input type="password" style={{display:"none"}} /><div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:4}}>
                    {[{label:'Riders',value:a.ridersCount,color:'#00D68F',bg:'#E6FBF3'},{label:'Members',value:a.membersCount,color:'#8B5CF6',bg:'#F5F3FF'},{label:'Total',value:a.totalOnboarded,color:'#3B82F6',bg:'#EFF6FF'},{label:'Policies',value:a.activePolicies,color:'#4F46E5',bg:'#EEF2FF'},{label:'Pending',value:a.pendingKYC,color:'#F59E0B',bg:'#FFFBEB'},{label:'Claims',value:a.claimsCount,color:'#6B7280',bg:'#F9FAFB'}].map(s=>(
                      <div key={s.label} style={{background:s.bg,borderRadius:5,padding:'4px 2px',textAlign:'center',border:`1px solid ${s.color}22`}}>
                        <div style={{fontSize:13,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
                        <div style={{fontSize:8.5,color:'var(--muted)',marginTop:1}}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
