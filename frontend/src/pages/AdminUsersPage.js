import React, { useState, useEffect } from 'react';
import { usersAPI, documentsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
const s=(v,fb='')=>v==null?fb:typeof v==='object'?fb:String(v)||fb; const sd=(v)=>s(v,'—');


async function downloadDoc(id, name) {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/documents/${id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) { alert('Download failed'); return; }
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = name || 'document';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function previewDoc(id) {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/documents/${id}/preview`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) { alert('Preview failed'); return; }
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), '_blank');
}

function KycDocViewer({ userId }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    documentsAPI.getForUser(userId)
      .then(r=>setDocs(r.data||[]))
      .catch(()=>setDocs([]))
      .finally(()=>setLoading(false));
  }, [userId]);

  
  if (!docs.length) return (
    <div style={{background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#92400E'}}>
      ⚠️ No KYC documents uploaded yet.
    </div>
  );
  return (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {docs.map(d=>(
        <div key={d.id} style={{background:d.verified?'#F0FDF4':'white',border:`1px solid ${d.verified?'#A7F3D0':'var(--border)'}`,borderRadius:8,padding:'9px 12px',display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:18,flexShrink:0}}>{d.mimeType?.startsWith('image/')?'🖼️':'📄'}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.originalName}</div>
            <div style={{fontSize:11,color:'var(--muted)',marginTop:1}}>{d.docLabel} · {((d.size||0)/1024).toFixed(0)}KB</div>
            {d.verified && <div style={{fontSize:10,color:'var(--green)',fontWeight:700}}>✓ Verified by {d.verifiedBy}</div>}
          </div>
          <div style={{display:'flex',gap:4,flexShrink:0}}>
            <button onClick={()=>previewDoc(d.id)} style={{background:'#EEF6FF',border:'none',borderRadius:6,padding:'4px 8px',fontSize:12,cursor:'pointer'}}>👁️</button>
            <button onClick={()=>downloadDoc(d.id,d.originalName)} style={{background:'#F0FDF4',border:'none',borderRadius:6,padding:'4px 8px',fontSize:12,cursor:'pointer'}}>⬇️</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function UserPanel({ user, onClose, onUpdate }) {
  const [approving, setApproving]   = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [reason, setReason]         = useState('');
  const [msg, setMsg]               = useState('');

  const approve = async () => {
    setApproving(true);
    try { await usersAPI.approveKyc(String(user._id||user.id)); setMsg('✅ KYC approved'); onUpdate(String(user._id||user.id),'approved'); }
    catch { setMsg('❌ Failed'); }
    finally { setApproving(false); }
  };
  const reject = async () => {
    setApproving(true);
    try { await usersAPI.rejectKyc(String(user._id||user.id), reason||'Documents incomplete'); setMsg('✅ KYC rejected'); onUpdate(String(user._id||user.id),'rejected'); }
    catch { setMsg('❌ Failed'); }
    finally { setApproving(false); }
  };
  const suspend = async () => {
    setSuspending(true);
    try { await usersAPI.suspendUser(String(user._id||user.id), reason||'Suspected fraud'); setMsg('⚠️ Account suspended'); onUpdate(String(user._id||user.id), null, true); }
    catch { setMsg('❌ Failed'); }
    finally { setSuspending(false); }
  };
  const unsuspend = async () => {
    setSuspending(true);
    try { await usersAPI.unsuspendUser(String(user._id||user.id)); setMsg('✅ Account reinstated'); onUpdate(String(user._id||user.id), null, false); }
    catch { setMsg('❌ Failed'); }
    finally { setSuspending(false); }
  };

  // Compact field: label + value inline row
  const f = (label, value) => (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
      padding:'6px 0',borderBottom:'1px solid #F1F5F9'}}>
      <span style={{fontSize:11,color:'#94A3B8',fontWeight:500,textTransform:'uppercase',
        letterSpacing:.5,flexShrink:0,marginRight:8}}>{label}</span>
      <span style={{fontSize:12.5,fontWeight:700,color:'#111827',textAlign:'right',
        maxWidth:'60%',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
        {value==null||value===''?'—':typeof value==='object'?'—':String(value)||'—'}
      </span>
    </div>
  );

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div style={{
          background:'white', width:'100%', maxWidth:520,
          maxHeight:'calc(100vh - 40px)',
          overflowY:'auto', borderRadius:16,
          boxShadow:'0 32px 80px rgba(0,0,0,.5)',
          display:'flex', flexDirection:'column', boxSizing:'border-box'
        }}
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{padding:'16px 20px',display:'flex',justifyContent:'space-between',
          alignItems:'center',background:'var(--navy)',color:'white',
          borderRadius:'16px 16px 0 0',flexShrink:0}}>
          <div>
            <div style={{fontWeight:800,fontSize:15}}>{user.fullName}</div>
            <div style={{fontSize:11,opacity:.5,marginTop:1}}>{user.memberNumber} · {user.role}</div>
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center'}}>
            {user.suspended && <span style={{background:'#EF4444',color:'white',fontSize:9,
              fontWeight:700,padding:'2px 7px',borderRadius:20}}>SUSPENDED</span>}
            <button onClick={onClose} style={{background:'rgba(255,255,255,.15)',border:'none',
              borderRadius:7,width:28,height:28,cursor:'pointer',color:'white',fontSize:15}}>✕</button>
          </div>
        </div>

        <div style={{padding:'14px 18px',paddingBottom:20,overflowY:'auto'}}>
          {msg && <div style={{background:'#F0FDF4',border:'1px solid #A7F3D0',borderRadius:7,
            padding:'8px 12px',fontSize:12,color:'#065F46',marginBottom:12}}>{msg}</div>}

          {/* Personal info — 2 column grid */}
          <div style={{background:'#F8FAFC',borderRadius:10,padding:'12px 14px',
            border:'1px solid #E5E7EB',marginBottom:10}}>
            <div style={{fontSize:9,fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',
              letterSpacing:1,marginBottom:8}}>Personal Info</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
              {f('Phone', user.phone)}
              {f('Email', user.email)}
              {f('National ID', user.nationalId)}
              {f('County', user.profile?.county || user.region)}
              {f('KYC Status', user.kycStatus)}
              {f('Risk Tier', user.riskTier)}
              {f('Joined', new Date(user.createdAt).toLocaleDateString('en-KE'))}
              {f('Tokens', user.shieldTokens)}
            </div>
          </div>

          {user.role === 'rider' && (
            <div style={{background:'#F8FAFC',borderRadius:10,padding:'12px 14px',
              border:'1px solid #E5E7EB',marginBottom:10}}>
              <div style={{fontSize:9,fontWeight:700,color:'#9CA3AF',textTransform:'uppercase',
                letterSpacing:1,marginBottom:8}}>Bike Info</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
                {f("Rider's License", user.profile?.licenseNumber)}
                {f('Bike Reg', user.profile?.bikeReg)}
                {f('Bike Type', user.profile?.bikeType)}
                {f('Bike Owner', user.profile?.isOwner===false?`No — ${user.profile?.ownerName||''}`: 'Yes')}
              </div>
            </div>
          )}

          {/* KYC Actions */}
          {user.kycStatus === 'pending' && (
            <div style={{marginBottom:10,background:'white',borderRadius:10,padding:'10px 14px',border:'1px solid #E5E7EB'}}>
              <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:8}}>📋 KYC Review</div>
              <label style={{fontSize:11,fontWeight:600,color:'#6B7280',display:'block',marginBottom:4}}>Note / Rejection reason</label>
              <input style={{width:'100%',border:'1.5px solid #E5E7EB',borderRadius:8,padding:'8px 11px',fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit',marginBottom:10}}
                placeholder="Documents incomplete…" value={reason} onChange={e=>setReason(e.target.value)}/>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-primary" onClick={approve} disabled={approving}>✅ Approve KYC</button>
                <button className="btn btn-danger" onClick={reject} disabled={approving}>❌ Reject</button>
              </div>
            </div>
          )}

          {/* Suspend / Reinstate */}
          <div style={{background:'white',borderRadius:10,padding:'10px 14px',border:'1px solid #E5E7EB',marginBottom:10}}>
            <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:10}}>⚠️ Account Control</div>
            {!user.suspended ? (
              <>
                <label style={{fontSize:11,fontWeight:600,color:'#6B7280',display:'block',marginBottom:4}}>Suspension reason</label>
                <input style={{width:'100%',border:'1.5px solid #E5E7EB',borderRadius:8,padding:'8px 11px',fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit',marginBottom:10}}
                  placeholder="e.g. Suspected fraud, fake documents..." value={reason} onChange={e=>setReason(e.target.value)}/>
                <button className="btn btn-danger" onClick={suspend} disabled={suspending}>🔒 Suspend Account</button>
              </>
            ) : (
              <div>
                <div style={{background:'#FEF2F2',borderRadius:8,padding:'10px 14px',marginBottom:10,fontSize:12}}>
                  <div style={{fontWeight:700,color:'#991B1B'}}>Account suspended</div>
                  <div style={{color:'#B91C1C',marginTop:3}}>{user.suspendReason}</div>
                  <div style={{color:'#94A3B8',fontSize:11,marginTop:2}}>By {user.suspendedBy} · {user.suspendedAt ? new Date(user.suspendedAt).toLocaleDateString('en-KE') : ''}</div>
                </div>
                <button className="btn btn-primary" onClick={unsuspend} disabled={suspending}>✅ Reinstate Account</button>
              </div>
            )}
          </div>

          {/* KYC documents */}
          <div style={{background:'white',borderRadius:10,padding:'10px 14px',border:'1px solid #E5E7EB',marginBottom:10}}>
            <div style={{fontSize:12,fontWeight:700,color:'#374151',marginBottom:10}}>📎 KYC Documents</div>
            <KycDocViewer userId={String(user._id||user.id)}/>
          </div>

          {/* Agent login info */}
          {user.role === 'agent' && (
            <div style={{marginTop:16,background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:10,padding:'12px 14px',fontSize:12,color:'#1E40AF',lineHeight:1.7}}>
              <div style={{fontWeight:700,marginBottom:4}}>🤝 Agent Login Details</div>
              <div>Phone: <strong>{user.phone}</strong></div>
              <div>Login URL: <strong>your site's login page</strong></div>
              <div style={{marginTop:4,color:'#6B7280',fontSize:11}}>Agent uses phone + their password to log in. They'll see their own Agent Dashboard.</div>
            </div>
          )}
          {user.role === 'admin' && (
            <div style={{marginTop:16,background:'#F5F3FF',border:'1px solid #DDD6FE',borderRadius:10,padding:'12px 14px',fontSize:12,color:'#5B21B6',lineHeight:1.7}}>
              <div style={{fontWeight:700,marginBottom:4}}>🏢 Admin Login Details</div>
              <div>Phone: <strong>{user.phone}</strong></div>
              <div style={{marginTop:4,color:'#6B7280',fontSize:11}}>Admin logs in from the main login page using phone + password.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { user: authUser } = useAuth();
  const isSuperAdmin = authUser?.role === 'superadmin';
  const [data, setData]     = useState({allUsers:[],users:[],agents:[],admins:[]});
  const [suspendingAdmin, setSuspendingAdmin] = useState(null);
  const [deletingAdmin, setDeletingAdmin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [kycFilter, setKycFilter]   = useState('all');
  const [countyFilter, setCountyFilter] = useState('all');
  const [tab, setTab] = useState('users');
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [agentModalKey, setAgentModalKey] = useState(0);
  const [agentForm, setAgentForm] = useState({ fullName:'', phone:'', email:'', nationalId:'', region:'', password:'', commission:'' });
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError]   = useState('');
  const [agentSuccess, setAgentSuccess] = useState('');

  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [adminModalKey, setAdminModalKey] = useState(0);
  const [adminForm, setAdminForm] = useState({ fullName:'', phone:'', email:'', password:'' });
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError]   = useState('');
  const [adminSuccess, setAdminSuccess] = useState('');

  const load = () => {
    setLoading(true);
    usersAPI.getAdminDashboard()
      .then(r => setData(r.data))
      .catch(err => { console.error('Dashboard Load Error:', err); })
      .finally(() => setLoading(false));
  };
  useEffect(()=>{ load(); },[]);

  const handleCreateAgent = async () => {
    if (!agentForm.fullName||!agentForm.phone||!agentForm.nationalId||!agentForm.region||!agentForm.password)
      return setAgentError('Full name, phone, national ID, region and password are all required');
    if (agentForm.password.length < 8) return setAgentError('Password must be at least 8 characters');
    setAgentLoading(true); setAgentError(''); setAgentSuccess('');
    try {
      const res = await usersAPI.createAgent(agentForm);
      const { agentCode } = res.data;
      setAgentSuccess(`Agent: ${agentForm.fullName}\nCode:  ${agentCode}\nPhone: ${agentForm.phone}\nPass:  ${agentForm.password}\nRegion: ${agentForm.region}`);
      setAgentForm({ fullName:'', phone:'', email:'', nationalId:'', region:'', password:'', commission:'' });
      load();
    } catch(err) { setAgentError(err.response?.data?.error || 'Failed to create agent'); }
    finally { setAgentLoading(false); }
  };

  const handleCreateAdmin = async () => {
    if (!adminForm.fullName||!adminForm.phone||!adminForm.password)
      return setAdminError('Full name, phone and password are required');
    if (adminForm.password.length < 8) return setAdminError('Password must be at least 8 characters');
    setAdminLoading(true); setAdminError(''); setAdminSuccess('');
    try {
      const res = await usersAPI.createAdmin(adminForm);
      setAdminSuccess(`${res.data.message}\nPhone: ${adminForm.phone}\nPass:  ${adminForm.password}`);
      setAdminForm({ fullName:'', phone:'', email:'', password:'' });
      load();
    } catch(err) { setAdminError(err.response?.data?.error || 'Failed to create admin'); }
    finally { setAdminLoading(false); }
  };

  const handleSuspendAdmin = async (admin) => {
    if (!window.confirm(`${admin.suspended ? 'Reinstate' : 'Suspend'} ${admin.fullName}?`)) return;
    setSuspendingAdmin(admin._id || admin.id);
    try {
      if (admin.suspended) await usersAPI.unsuspendUser(admin._id || admin.id);
      else await usersAPI.suspendUser(admin._id || admin.id, 'Suspended by Super Admin');
      load();
    } catch(e) { alert('Failed: ' + (e.response?.data?.error || e.message)); }
    finally { setSuspendingAdmin(null); }
  };

  const handleDeleteAdmin = async (admin) => {
    if (!window.confirm(`PERMANENTLY delete admin account for ${admin.fullName}? This cannot be undone.`)) return;
    setDeletingAdmin(admin._id || admin.id);
    try {
      await usersAPI.suspendUser(admin._id || admin.id, 'Deleted by Super Admin');
      load();
    } catch(e) { alert('Failed: ' + (e.response?.data?.error || e.message)); }
    finally { setDeletingAdmin(null); }
  };

  const onUpdate = (userId, kycStatus, suspended) => {
    setData(prev => ({
      ...prev,
      allUsers: (prev.allUsers||[]).map(u => {
        if (String(u._id||u.id) !== String(userId)) return u;
        return {
          ...u,
          ...(kycStatus ? { kycStatus } : {}),
          ...(suspended !== undefined ? { suspended } : {}),
        };
      })
    }));
    if (String(selected?._id||selected?.id) === String(userId)) {
      setSelected(prev => ({
        ...prev,
        ...(kycStatus ? { kycStatus } : {}),
        ...(suspended !== undefined ? { suspended } : {}),
      }));
    }
  };

  

  const allUsers = (data?.allUsers || []).filter(u => u.role !== 'nok' && u.role !== 'agent' && u.role !== 'admin' && u.role !== 'superadmin');
  const pending  = allUsers.filter(u=>u.kycStatus==='pending' && u.role !== 'nok');

  let filtered = allUsers;
  if (roleFilter !== 'all') filtered = filtered.filter(u=>u.role===roleFilter);
  if (kycFilter  !== 'all') filtered = filtered.filter(u=>u.kycStatus===kycFilter);
  if (countyFilter !== 'all') filtered = filtered.filter(u=>{
    const c = (u.profile?.county||u.region||'').toLowerCase();
    return c.includes(countyFilter.toLowerCase());
  });
  // Build county list from all users for filter dropdown
  const allCounties = [...new Set(allUsers.map(u=>(u.profile?.county||u.region||'').toUpperCase()).filter(Boolean))].sort();
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(u =>
      u.fullName?.toLowerCase().includes(q) ||
      u.phone?.includes(q) ||
      u.memberNumber?.toLowerCase().includes(q) ||
      u.agentCode?.toLowerCase().includes(q) ||
      u.nationalId?.includes(q) ||
      (u.profile?.county||u.region||'').toLowerCase().includes(q)
    );
  }

  return (
    <div>
      {/* ── Create Agent Modal ── */}
      {showCreateAgent && (
        <div key={agentModalKey} className="admin-modal-backdrop"
          onClick={()=>{ setShowCreateAgent(false); setAgentError(''); setAgentSuccess(''); }}>
          <div style={{width:'100%',maxWidth:540,background:'white',borderRadius:18,display:'flex',flexDirection:'column',boxShadow:'0 32px 80px rgba(0,0,0,.45)',maxHeight:'92vh',overflow:'hidden'}}
            onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div style={{background:'linear-gradient(135deg,#050E1F,#07312A)',padding:'18px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0,borderRadius:'18px 18px 0 0'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:38,height:38,borderRadius:9,background:'rgba(0,214,143,.2)',border:'1px solid rgba(0,214,143,.4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🤝</div>
                <div>
                  <div style={{fontWeight:800,fontSize:15,color:'white'}}>Create Field Agent</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,.45)'}}>Agent logs in at the same login page</div>
                </div>
              </div>
              <button onClick={()=>{ setShowCreateAgent(false); setAgentError(''); setAgentSuccess(''); }}
                style={{background:'rgba(255,255,255,.1)',border:'none',borderRadius:8,width:32,height:32,color:'white',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✕</button>
            </div>
            {/* Body */}
            <div style={{padding:'18px 20px 20px'}}>
              {agentError && <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#991B1B',marginBottom:14}}>❌ {agentError}</div>}
              {agentSuccess ? (
                <div>
                  <div style={{background:'#F0FDF4',border:'2px solid #A7F3D0',borderRadius:12,padding:'16px',marginBottom:14}}>
                    <div style={{fontWeight:700,fontSize:14,color:'#065F46',marginBottom:10}}>✅ Agent Created Successfully!</div>
                    <div style={{fontSize:12,color:'#047857',fontFamily:'monospace',background:'#ECFDF5',borderRadius:6,padding:'12px',whiteSpace:'pre',lineHeight:2}}>{agentSuccess}</div>
                    <div style={{fontSize:11,color:'#6B7280',marginTop:10,padding:'8px 10px',background:'#F9FAFB',borderRadius:6,lineHeight:1.6}}>
                      📱 <strong>Agent login:</strong> Main login page → phone number + password above.
                    </div>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button style={{flex:1,padding:'10px',background:'linear-gradient(135deg,#059669,#00D68F)',color:'white',border:'none',borderRadius:9,fontWeight:700,fontSize:13,cursor:'pointer'}}
                      onClick={()=>{ setAgentSuccess(''); setAgentForm({fullName:'',phone:'',email:'',nationalId:'',region:'',password:'',commission:''}); }}>
                      ➕ Create Another Agent
                    </button>
                    <button style={{flex:1,padding:'10px',background:'#F3F4F6',color:'#374151',border:'none',borderRadius:9,fontWeight:700,fontSize:13,cursor:'pointer'}}
                      onClick={()=>{ setShowCreateAgent(false); setAgentSuccess(''); }}>
                      ✓ Done
                    </button>
                  </div>
                </div>
              ) : (
              <div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {[
                    {key:'fullName',    label:'Full Name',          placeholder:'e.g. John Kamau',  type:'text',   req:true,  col:2},
                    {key:'phone',       label:'Phone Number',       placeholder:'+254700000000',     type:'tel',    req:true},
                    {key:'email',       label:'Email (optional)',   placeholder:'john@email.com',    type:'email',  req:false},
                    {key:'nationalId',  label:'National ID',        placeholder:'12345678',          type:'text',   req:true},
                    {key:'region',      label:'Region / Territory', placeholder:'e.g. Nairobi CBD',  type:'text',   req:true},
                    {key:'commission',  label:'Commission %',       placeholder:'e.g. 5',            type:'number', req:false},
                    {key:'password',    label:'Initial Password',   placeholder:'Min 8 characters',  type:'text',   req:true,  col:2},
                  ].map(f=>(
                    <div key={f.key} style={{gridColumn:f.col===2?'1 / -1':undefined}}>
                      <label style={{fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>
                        {f.label}{f.req&&<span style={{color:'#EF4444',marginLeft:2}}>*</span>}
                      </label>
                      <input type={f.type} placeholder={f.placeholder}
                        autoComplete={f.key==='password'?'new-password':'off'}
                        style={{width:'100%',border:'1.5px solid #E5E7EB',borderRadius:8,padding:'7px 10px',fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}
                        value={agentForm[f.key]||''} onChange={e=>setAgentForm(p=>({...p,[f.key]:e.target.value}))}
                        onFocus={e=>e.target.style.borderColor='#00D68F'} onBlur={e=>e.target.style.borderColor='#E5E7EB'}/>
                    </div>
                  ))}
                </div>
                <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:8,padding:'10px 12px',marginTop:14,fontSize:12,color:'#1E40AF',lineHeight:1.6}}>
                  ℹ️ Agent code like <strong>AGT-NAI-0001</strong> is auto-generated. Agent logs in from the <strong>main login page</strong> using their phone number and this password.
                </div>
                <button style={{width:'100%',marginTop:14,padding:'11px',background:'linear-gradient(135deg,#059669,#00D68F)',color:'white',border:'none',borderRadius:10,fontWeight:800,fontSize:14,cursor:'pointer'}}
                  onClick={handleCreateAgent} disabled={agentLoading}>
                  {agentLoading ? '⏳ Creating…' : '🤝 Create Agent Account'}
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* ── Create Admin Modal ── */}
      {showCreateAdmin && (
        <div key={adminModalKey} className="admin-modal-backdrop"
          onClick={()=>{ setShowCreateAdmin(false); setAdminError(''); setAdminSuccess(''); }}>
          <div style={{width:'100%',maxWidth:460,background:'white',borderRadius:18,display:'flex',flexDirection:'column',boxShadow:'0 32px 80px rgba(0,0,0,.45)',maxHeight:'92vh',overflow:'hidden'}}
            onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div style={{background:'linear-gradient(135deg,#1E1B4B,#312E81)',padding:'18px 22px',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0,borderRadius:'18px 18px 0 0'}}>
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{width:38,height:38,borderRadius:9,background:'rgba(165,180,252,.2)',border:'1px solid rgba(165,180,252,.4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>🏢</div>
                <div>
                  <div style={{fontWeight:800,fontSize:15,color:'white'}}>Create Admin Account</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,.45)'}}>Full system access — use carefully</div>
                </div>
              </div>
              <button onClick={()=>{ setShowCreateAdmin(false); setAdminError(''); setAdminSuccess(''); }}
                style={{background:'rgba(255,255,255,.1)',border:'none',borderRadius:8,width:32,height:32,color:'white',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✕</button>
            </div>
            {/* Body */}
            <div style={{padding:'18px 20px 20px'}}>
              {adminError && <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#991B1B',marginBottom:14}}>❌ {adminError}</div>}
              {adminSuccess ? (
                <div>
                  <div style={{background:'#F0FDF4',border:'2px solid #A7F3D0',borderRadius:12,padding:'16px',marginBottom:14}}>
                    <div style={{fontWeight:700,fontSize:14,color:'#065F46',marginBottom:10}}>✅ Admin Account Created!</div>
                    <div style={{fontSize:12,color:'#047857',fontFamily:'monospace',background:'#ECFDF5',borderRadius:6,padding:'12px',whiteSpace:'pre',lineHeight:2}}>{adminSuccess}</div>
                    <div style={{fontSize:11,color:'#6B7280',marginTop:10,padding:'8px 10px',background:'#F9FAFB',borderRadius:6,lineHeight:1.6}}>
                      🔐 Share these credentials securely. Admin logs in from the <strong>main login page</strong> using phone + password.
                    </div>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button style={{flex:1,padding:'10px',background:'linear-gradient(135deg,#4F46E5,#7C3AED)',color:'white',border:'none',borderRadius:9,fontWeight:700,fontSize:13,cursor:'pointer'}}
                      onClick={()=>{ setAdminSuccess(''); setAdminForm({fullName:'',phone:'',email:'',password:''}); }}>
                      ➕ Create Another Admin
                    </button>
                    <button style={{flex:1,padding:'10px',background:'#F3F4F6',color:'#374151',border:'none',borderRadius:9,fontWeight:700,fontSize:13,cursor:'pointer'}}
                      onClick={()=>{ setShowCreateAdmin(false); setAdminSuccess(''); }}>
                      ✓ Done
                    </button>
                  </div>
                </div>
              ) : (
              <div>
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {[
                    {key:'fullName', label:'Full Name',          placeholder:'e.g. Jane Wanjiku', type:'text',     req:true},
                    {key:'phone',    label:'Phone Number',        placeholder:'+254700000000',     type:'tel',      req:true},
                    {key:'email',    label:'Email (optional)',    placeholder:'admin@email.com',   type:'email',    req:false},
                    {key:'password', label:'Password',            placeholder:'Min 8 characters',  type:'password', req:true},
                  ].map(f=>(
                    <div key={f.key}>
                      <label style={{fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>
                        {f.label}{f.req&&<span style={{color:'#EF4444',marginLeft:2}}>*</span>}
                      </label>
                      <input type={f.type} placeholder={f.placeholder}
                        style={{width:'100%',border:'1.5px solid #E5E7EB',borderRadius:8,padding:'8px 11px',fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'inherit'}}
                        autoComplete={f.key==='password'?'new-password':'off'} value={adminForm[f.key]||''} onChange={e=>setAdminForm(p=>({...p,[f.key]:e.target.value}))}
                        onFocus={e=>e.target.style.borderColor='#7C3AED'} onBlur={e=>e.target.style.borderColor='#E5E7EB'}/>
                    </div>
                  ))}
                </div>
                <div style={{background:'#FEF3C7',border:'1px solid #FCD34D',borderRadius:8,padding:'10px 12px',marginTop:14,fontSize:12,color:'#92400E',lineHeight:1.6}}>
                  ⚠️ Admin accounts have <strong>full unrestricted access</strong> — approve claims, manage all users and data. Only create for trusted team members.
                </div>
                <button style={{width:'100%',marginTop:14,padding:'11px',background:'linear-gradient(135deg,#4F46E5,#7C3AED)',color:'white',border:'none',borderRadius:10,fontWeight:800,fontSize:14,cursor:'pointer'}}
                  onClick={handleCreateAdmin} disabled={adminLoading}>
                  {adminLoading ? '⏳ Creating…' : '🏢 Create Admin Account'}
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <h1 className="page-title">{isSuperAdmin ? 'Admin Accounts' : 'Members'}</h1>
            <p className="page-subtitle">
              {isSuperAdmin
                ? `${(data?.admins||[]).length} admin accounts · manage system access`
                : `${allUsers.length} members · ${pending.length} pending KYC`}
            </p>
          </div>
          <div style={{display:'flex',gap:8}}>
            {isSuperAdmin ? (
              <button className="btn btn-primary btn-sm" onClick={()=>{ setShowCreateAdmin(true); setAdminModalKey(k=>k+1); }}>
                ➕ New Admin
              </button>
            ) : (
              ['users','pending'].map(t=>(
                <button key={t} className={`btn btn-sm ${tab===t?'btn-primary':'btn-secondary'}`} onClick={()=>setTab(t)}>
                  {t==='users'?'👥 All Members':'⏳ Pending KYC'}
                  {t==='pending'&&pending.length>0&&<span style={{background:'var(--orange)',color:'white',borderRadius:10,padding:'1px 6px',fontSize:10,marginLeft:4}}>{pending.length}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="page-body">
        {selected && !isSuperAdmin && <UserPanel user={selected} onClose={()=>setSelected(null)} onUpdate={onUpdate}/>}

        {/* ── SUPERADMIN: Admin accounts list ── */}
        {isSuperAdmin && (
          <div className="card">
            {/* KYC Summary for superadmin */}
            <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
              {[
                {label:'Total Members', value: allUsers.length, color:'#0EA5E9', bg:'#EFF6FF', icon:'👥'},
                {label:'Pending KYC', value: pending.length, color:'#F59E0B', bg:'#FFFBEB', icon:'⏳'},
                {label:'Approved KYC', value: allUsers.filter(u=>u.kycStatus==='approved').length, color:'#00C896', bg:'#E6FAF3', icon:'✅'},
                {label:'Rejected KYC', value: allUsers.filter(u=>u.kycStatus==='rejected').length, color:'#EF4444', bg:'#FEF2F2', icon:'❌'},
              ].map(s=>(
                <div key={s.label} style={{flex:'1 1 120px',background:s.bg,borderRadius:10,padding:'10px 14px',border:`1px solid ${s.color}22`}}>
                  <div style={{fontSize:18}}>{s.icon}</div>
                  <div style={{fontSize:20,fontWeight:800,color:s.color,lineHeight:1.2,marginTop:4}}>{s.value}</div>
                  <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{s.label}</div>
                </div>
              ))}
            </div>

            <h3 style={{fontSize:14,fontWeight:700,marginBottom:14}}>🔑 Admin Accounts</h3>
            {(data?.admins||[]).length === 0 ? (
              <div className="empty-state"><div className="emoji">🏢</div><p>No admin accounts yet</p></div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {(data?.admins||[]).map(a=>(
                  <div key={a.id||a._id} style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px',border:'1.5px solid var(--border)',borderRadius:10,background:a.suspended?'#FEF2F2':'white',opacity:a.suspended?0.8:1}}>
                    <div style={{width:38,height:38,borderRadius:9,background:'linear-gradient(135deg,#4F46E5,#7C3AED)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,color:'white',fontWeight:800,flexShrink:0}}>
                      {(a.fullName||'A')[0].toUpperCase()}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:14,display:'flex',alignItems:'center',gap:8}}>
                        {a.fullName}
                        <span style={{fontSize:10,background:a.role==='superadmin'?'#FEF3C7':'#EEF2FF',color:a.role==='superadmin'?'#92400E':'#4F46E5',padding:'2px 8px',borderRadius:10,fontWeight:700,textTransform:'uppercase'}}>
                          {a.role}
                        </span>
                        {a.suspended && <span style={{fontSize:10,background:'#FEF2F2',color:'#EF4444',padding:'2px 8px',borderRadius:10,fontWeight:700}}>SUSPENDED</span>}
                      </div>
                      <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{a.phone} {a.email ? '· '+a.email : ''}</div>
                      <div style={{fontSize:10,color:'var(--muted)',marginTop:1}}>Joined {new Date(a.createdAt).toLocaleDateString('en-KE')}</div>
                    </div>
                    {/* Only allow actions on non-superadmin accounts */}
                    {a.role !== 'superadmin' && (
                      <div style={{display:'flex',gap:8,flexShrink:0}}>
                        <button
                          onClick={()=>handleSuspendAdmin(a)}
                          disabled={suspendingAdmin === (a._id||a.id)}
                          style={{padding:'6px 12px',borderRadius:7,border:`1px solid ${a.suspended?'#00C896':'#F59E0B'}`,background:a.suspended?'#E6FAF3':'#FFFBEB',color:a.suspended?'#00C896':'#92400E',fontSize:12,fontWeight:700,cursor:'pointer'}}
                        >
                          {suspendingAdmin===(a._id||a.id) ? '⏳' : a.suspended ? '✅ Reinstate' : '🔒 Suspend'}
                        </button>
                        <button
                          onClick={()=>handleDeleteAdmin(a)}
                          disabled={deletingAdmin === (a._id||a.id)}
                          style={{padding:'6px 12px',borderRadius:7,border:'1px solid #FECACA',background:'#FEF2F2',color:'#EF4444',fontSize:12,fontWeight:700,cursor:'pointer'}}
                        >
                          {deletingAdmin===(a._id||a.id) ? '⏳' : '🗑️ Remove'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Pending KYC review (admin only) ── */}
        {!isSuperAdmin && tab==='pending' && (
          <div className="card">
            <h3 style={{fontSize:14,fontWeight:700,marginBottom:16}}>⏳ Awaiting KYC Approval ({pending.length})</h3>
            {pending.length===0 ? (
              <div className="empty-state"><div className="emoji">✅</div><p>No pending KYC reviews</p></div>
            ) : (
              <div className="table-wrap">
                <table style={{tableLayout:'fixed',width:'100%'}}>
                  <thead><tr>
                    <th style={{width:'18%'}}>Name</th>
                    <th style={{width:'12%'}}>Member No</th>
                    <th style={{width:'8%'}}>Role</th>
                    <th style={{width:'16%'}}>Phone</th>
                    <th style={{width:'13%'}}>County</th>
                    <th style={{width:'6%'}}>Docs</th>
                    <th style={{width:'13%'}}>Registered</th>
                    <th style={{width:'14%'}}>Action</th>
                  </tr></thead>
                  <tbody>
                    {pending.map(u=>(
                      <tr key={u.id}>
                        <td style={{fontWeight:700}}>{s(u.fullName)}</td>
                        <td style={{fontSize:11,fontFamily:'monospace',color:'var(--muted)'}}>{sd(u.memberNumber)}</td>
                        <td><span className="status-badge status-approved">{s(u.role)}</span></td>
                        <td style={{fontSize:12,maxWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s(u.phone)}</td>
                        <td style={{fontSize:12,maxWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingLeft:8}}>{typeof (u.profile?.county||u.region)==='object'?'—':(u.profile?.county||u.region||'—')}</td>
                        <td><span style={{fontSize:12,color:u.docs?.length>0?'var(--green)':'var(--orange)',fontWeight:600}}>📎{u.docs?.length||0}</span></td>
                        <td style={{fontSize:11,color:'var(--muted)'}}>{new Date(u.createdAt).toLocaleDateString('en-KE')}</td>
                        <td>
                          <button className="btn btn-primary btn-sm" onClick={()=>setSelected(u)}>⚖️ Review</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── All users (admin only) ── */}
        {!isSuperAdmin && tab==='users' && (
          <div className="card">
            {/* Filters */}
            <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
              <input className="form-input" placeholder="🔍 Search name, phone, member no..." value={search}
                onChange={e=>setSearch(e.target.value)} style={{flex:'1 1 200px',maxWidth:280}}/>
              <select className="form-input" value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} style={{width:120}}>
                <option value="all">All Members</option>
                <option value="rider">Riders</option>
                <option value="member">Funeral Members</option>
              </select>
              <select className="form-input" value={kycFilter} onChange={e=>setKycFilter(e.target.value)} style={{width:140}}>
                <option value="all">All KYC Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <select className="form-input" value={countyFilter} onChange={e=>setCountyFilter(e.target.value)} style={{width:140}}>
                <option value="all">All Counties</option>
                {allCounties.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="table-wrap">
              <table>
                <thead><tr><th>Name</th><th>Member No</th><th>Role</th><th>Phone</th><th>County</th><th>KYC</th><th>Risk</th><th>Status</th><th>Joined</th><th>Action</th></tr></thead>
                <tbody>
                  {filtered.length===0 && <tr><td colSpan={10} style={{textAlign:'center',color:'var(--muted)',padding:32}}>No users found</td></tr>}
                  {filtered.map(u=>(
                    <tr key={u.id} style={{opacity:u.suspended ? 0.7 : 1}}>
                      <td style={{fontWeight:700}}>{s(u.fullName)}{u.suspended&&<span style={{fontSize:10,background:'#EF4444',color:'white',borderRadius:10,padding:'1px 6px',marginLeft:6,fontWeight:700}}>SUSP</span>}</td>
                      <td style={{fontSize:11,fontFamily:'monospace',color:'var(--muted)'}}>{sd(u.memberNumber)}</td>
                      <td><span className="status-badge status-approved">{s(u.role)}</span></td>
                      <td style={{fontSize:12,maxWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s(u.phone)}</td>
                      <td style={{fontSize:12,maxWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',paddingLeft:8}}>{typeof (u.profile?.county||u.region)==='object'?'—':(u.profile?.county||u.region||'—')}</td>
                      <td><span className={`status-badge status-${u.kycStatus==='approved'?'approved':u.kycStatus==='rejected'?'rejected':'pending'}`}>{s(u.kycStatus)}</span></td>
                      <td><span className={`tier-badge tier-${s(u.riskTier)}`}>{s(u.riskTier)}</span></td>
                      <td><span className={`status-badge ${u.suspended?'status-rejected':'status-approved'}`}>{u.suspended?'Suspended':'Active'}</span></td>
                      <td style={{fontSize:11,color:'var(--muted)'}}>{new Date(u.createdAt).toLocaleDateString('en-KE')}</td>
                      <td><button className="btn btn-secondary btn-sm" onClick={()=>setSelected(u)}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
