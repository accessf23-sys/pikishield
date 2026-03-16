import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { claimsAPI, usersAPI, documentsAPI } from '../utils/api';
const s=(v,fb='')=>v==null?fb:typeof v==='object'?fb:String(v)||fb; const sd=(v)=>s(v,'—');


// Authenticated download — avoids React Router interception
async function dlDoc(id, name) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/documents/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error();
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
  } catch { alert('Download failed — please try again.'); }
}

async function pvDoc(id) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/documents/${id}/preview`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    window.open(URL.createObjectURL(blob), '_blank');
  } catch { alert('Preview failed — please try again.'); }
}

const TYPE_META = {
  bail:    { label:'Bail',     icon:'🚔', color:'#6366F1', maxAmount:20000 },
  funeral: { label:'Funeral',  icon:'🕊️', color:'#0EA5E9', maxAmount:200000 },
  income:  { label:'Stipend',  icon:'💊', color:'#10B981', maxAmount:15000 },
};

function FraudBadge({ score }) {
  const n = (score !== null && score !== undefined && score !== '') ? Number(score) : null;
  if (n === null || isNaN(n)) return (
    <span style={{ background:'#F1F5F9', color:'#94A3B8', padding:'2px 8px', borderRadius:8, fontSize:11, fontWeight:700 }}>N/A</span>
  );
  const col = n < 25 ? { bg:'#E6FAF3', text:'#009A5E', label:'Low' }
             : n < 55 ? { bg:'#FFF8E1', text:'#B45309', label:'Med' }
             : { bg:'#FFF0F0', text:'#CC0000', label:'High' };
  return (
    <span style={{ background:col.bg, color:col.text, padding:'2px 8px', borderRadius:8, fontSize:11, fontWeight:700 }}>
      {String(n)}/100 {col.label}
    </span>
  );
}

function ClaimDetailModal({ claim, onClose, onAction }) {
  const [docs, setDocs]       = useState([]);
  const [note, setNote]       = useState('');
  const [acting, setActing]   = useState(false);
  const [reason, setReason]   = useState('');
  const [showSuspend, setShowSuspend] = useState(false);

  useEffect(() => {
    if (claim) documentsAPI.getForClaim(claim.id).then(r => setDocs(r.data)).catch(()=>{});
  }, [claim]);

  if (!claim) return null;

  const meta = TYPE_META[claim.type] || TYPE_META.bail;

  const act = async (status) => {
    setActing(true);
    try { await onAction(claim.id, status, note); onClose(); }
    catch {}
    finally { setActing(false); }
  };

  return (
    <div className="admin-modal-backdrop"
      onClick={onClose}>
      <div style={{ background:'white',borderRadius:14,width:'100%',maxWidth:680,maxHeight:'92vh',overflow:'hidden',display:'flex',flexDirection:'column' }}
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'16px 20px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0 }}>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <span style={{ fontSize:24 }}>{meta.icon}</span>
            <div>
              <div style={{ fontWeight:800,fontSize:16 }}>{meta.label} Claim Review</div>
              <div style={{ fontSize:12,color:'var(--muted)' }}>{claim.userName} · {claim.userPhone} {claim.memberNumber && `· ${claim.memberNumber}`}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'#F1F5F9',border:'none',borderRadius:8,padding:'6px 12px',cursor:'pointer',fontWeight:600,fontSize:13 }}>✕ Close</button>
        </div>

        <div style={{ overflow:'auto',flex:1,padding:'16px 20px' }}>
          {/* Key details */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16 }}>
            {[
              ['Amount',  `KES ${(claim.amountRequested||claim.amountApproved||claim.amount||0).toLocaleString()}`],
              ['Status',  claim.status],
              ['Fraud Score', <FraudBadge key="f" score={claim.fraudScore}/>],
              ['Submitted', new Date(claim.submittedAt).toLocaleDateString('en-KE')],
              ['Policy', typeof claim.policyId==='object' ? (claim.policyId?.name || claim.policyId?.type || '—') : '—'],
              ['Ref No.', claim.referenceNumber || (String(claim._id||claim.id||'').slice(-6).toUpperCase())],
              ...(claim.principalMemberNumber ? [['Principal No.', claim.principalMemberNumber]] : []),
              ...(claim.deceasedMemberName    ? [['Deceased',      claim.deceasedMemberName]]    : []),
              ...(claim.relationship          ? [['Relationship',  claim.relationship]]           : []),
            ].map(([k,v])=>(
              <div key={k} style={{ background:'var(--bg)',borderRadius:8,padding:'10px 12px' }}>
                <div style={{ fontSize:10,color:'var(--muted)',fontWeight:600,textTransform:'uppercase',marginBottom:3 }}>{k}</div>
                <div style={{ fontSize:13,fontWeight:700 }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          <div style={{ background:'#F8FAFC',borderRadius:8,padding:'12px 14px',marginBottom:16,border:'1px solid var(--border)' }}>
            <div style={{ fontSize:11,fontWeight:700,color:'var(--muted)',marginBottom:6 }}>INCIDENT DESCRIPTION</div>
            <p style={{ fontSize:13,lineHeight:1.6 }}>{claim.description}</p>
          </div>

          {/* Documents */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:13,fontWeight:700,marginBottom:8 }}>📎 Supporting Documents ({docs.length})</div>
            {docs.length === 0 ? (
              <div style={{ background:'#FFF8E1',border:'1px solid #FDE68A',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#92400E' }}>
                ⚠️ No documents attached to this claim.
              </div>
            ) : (
              <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                {docs.map(d=>(
                  <div key={d.id} style={{ display:'flex',alignItems:'center',gap:10,background:'white',border:'1px solid var(--border)',borderRadius:8,padding:'9px 12px' }}>
                    <span style={{ fontSize:18 }}>{d.mimeType?.startsWith('image/')?'🖼️':'📄'}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12,fontWeight:600 }}>{d.originalName}</div>
                      <div style={{ fontSize:11,color:'var(--muted)' }}>{d.docLabel}</div>
                    </div>
                    {d.verified && <span style={{ fontSize:10,background:'var(--green-light)',color:'var(--green)',padding:'2px 8px',borderRadius:4,fontWeight:700 }}>✓ Verified</span>}
                    <button onClick={()=>pvDoc(d.id)}
                      style={{ fontSize:12,background:'#EEF6FF',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer',fontWeight:600 }}>👁️</button>
                    <button onClick={()=>dlDoc(d.id, d.originalName)}
                      style={{ fontSize:12,background:'var(--green-light)',border:'none',borderRadius:6,padding:'4px 10px',cursor:'pointer',color:'var(--green)',fontWeight:600 }}>⬇️ Download</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Review action */}
          {claim.status === 'pending' && (
            <div style={{ borderTop:'1px solid var(--border)',paddingTop:16 }}>
              <div style={{ fontSize:13,fontWeight:700,marginBottom:8 }}>Admin Review Note</div>
              <textarea className="form-input" rows={2} placeholder="Add a note (optional for approval, recommended for rejection)..."
                value={note} onChange={e=>setNote(e.target.value)} style={{ marginBottom:10 }}/>
              <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
                <button className="btn btn-primary" disabled={acting} onClick={()=>act('approved')}>✅ Approve · Pay via M-Pesa</button>
                <button className="btn btn-danger"  disabled={acting} onClick={()=>act('rejected')}>❌ Reject Claim</button>
                <button className="btn btn-secondary" onClick={()=>setShowSuspend(s=>!s)}>⚠️ Flag / Suspend Account</button>
              </div>
              {showSuspend && (
                <div style={{ background:'#FFF8E1',border:'1px solid #FDE68A',borderRadius:8,padding:'12px',marginTop:10 }}>
                  <div style={{ fontSize:12,fontWeight:600,marginBottom:6 }}>Suspension Reason</div>
                  <input className="form-input" placeholder="e.g. Suspected document fraud..." value={reason} onChange={e=>setReason(e.target.value)} style={{ marginBottom:8 }}/>
                  <button className="btn btn-danger btn-sm" onClick={async()=>{
                    try { await usersAPI.suspendUser(claim.userId, reason||'Suspected fraud on claim'); onClose(); }
                    catch {}
                  }}>🚫 Suspend Account</button>
                </div>
              )}
            </div>
          )}
          {claim.status !== 'pending' && claim.adminNote && (
            <div style={{ background:'var(--bg)',borderRadius:8,padding:'10px 12px',marginTop:8,border:'1px solid var(--border)' }}>
              <div style={{ fontSize:11,fontWeight:600,color:'var(--muted)',marginBottom:4 }}>ADMIN NOTE · {claim.reviewedBy}</div>
              <div style={{ fontSize:12 }}>{claim.adminNote}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminClaimsPage() {
  const [claims, setClaims]     = useState([]);
  const [loading, setLoading]   = useState(false);
  const [tab, setTab]           = useState('all');
  const [selected, setSelected] = useState(null);
  const [filter, setFilter]     = useState('all'); // all | pending | approved | rejected

  const load = () => {
    claimsAPI.getAll().then(r => {
      setClaims(r.data);
      setLoading(false);
    }).catch(()=>setLoading(false));
  };
  useEffect(()=>{ load(); }, []);

  const handleAction = async (id, status, note) => {
    await claimsAPI.updateStatus(id, { status, note });
    load();
  };

  

  const byType = {
    all:     claims,
    bail:    claims.filter(c=>c.type==='bail'),
    funeral: claims.filter(c=>c.type==='funeral'),
    income:  claims.filter(c=>c.type==='income'),
  };

  const activeClaims = byType[tab] || [];
  const filtered = filter==='all' ? activeClaims : activeClaims.filter(c=>c.status===filter);

  // Chart data
  const statusData = ['pending','approved','rejected'].map(s=>({
    name:s.charAt(0).toUpperCase()+s.slice(1),
    value: activeClaims.filter(c=>c.status===s).length,
    color: s==='approved'?'#22C55E':s==='pending'?'#EAB308':'#EF4444'
  })).filter(d=>d.value>0);

  const amtData = ['bail','funeral','income'].map(t=>({
    type: TYPE_META[t].label,
    total: claims.filter(c=>c.type===t && c.status==='approved').reduce((s,c)=>s+(c.amountRequested||c.amountApproved||c.amount||0),0),
    count: claims.filter(c=>c.type===t).length,
    color: TYPE_META[t].color
  }));

  const pending = claims.filter(c=>c.status==='pending').length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Claims Review</h1>
        <p className="page-subtitle">
          {claims.length} total · {pending > 0 ? <strong style={{color:'var(--red)'}}>{pending} pending</strong> : '0 pending'}
        </p>
      </div>

      <div className="page-body">
        {/* Summary charts */}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14,marginBottom:20 }}>
          {/* Approved payouts bar */}
          <div className="card" style={{ gridColumn:'1/3' }}>
            <div style={{ fontSize:13,fontWeight:700,marginBottom:12 }}>Approved Payouts by Type (KES)</div>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={amtData} barSize={32}>
                <XAxis dataKey="type" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}K`} axisLine={false} tickLine={false}/>
                <Tooltip formatter={(v)=>`KES ${v.toLocaleString()}`}/>
                <Bar dataKey="total" radius={[6,6,0,0]}>
                  {amtData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status pie */}
          <div className="card">
            <div style={{ fontSize:13,fontWeight:700,marginBottom:8 }}>Active Tab Status</div>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={32} outerRadius={52} dataKey="value">
                    {statusData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                  </Pie>
                  <Tooltip/>
                  <Legend iconSize={10} iconType="circle" wrapperStyle={{fontSize:11}}/>
                </PieChart>
              </ResponsiveContainer>
            ) : <div style={{height:130,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--muted)',fontSize:12}}>No data</div>}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display:'flex',gap:6,marginBottom:16 }}>
          {[['bail','🚔 Bail'],['funeral','🕊️ Funeral'],['income','💊 Stipend']].map(([k,l])=>{
            const cnt = byType[k]?.filter(c=>c.status==='pending').length||0;
            return (
              <button key={k} onClick={()=>setTab(k)}
                className={`btn btn-sm ${tab===k?'btn-primary':'btn-secondary'}`}>
                {l}
                {cnt>0 && <span style={{background:tab===k?'rgba(255,255,255,.3)':'var(--red)',color:'white',borderRadius:10,padding:'0 5px',fontSize:10,fontWeight:700,marginLeft:4}}>{cnt}</span>}
              </button>
            );
          })}
          <div style={{ marginLeft:'auto',display:'flex',gap:6 }}>
            {['all','pending','approved','rejected'].map(f=>(
              <button key={f} onClick={()=>setFilter(f)}
                className={`btn btn-sm ${filter===f?'btn-primary':'btn-secondary'}`}
                style={{ textTransform:'capitalize' }}>{f}</button>
            ))}
          </div>
        </div>

        {/* Claims table */}
        <div className="card">
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
            <div>
              <div style={{ fontWeight:700,fontSize:14 }}>{TYPE_META[tab]?.icon} {tab==='all'?'All':TYPE_META[tab]?.label} Claims</div>
              <div style={{ fontSize:12,color:'var(--muted)' }}>
                Max payout: KES {TYPE_META[tab]?.maxAmount?.toLocaleString()} ·
                Approved total: KES {activeClaims.filter(c=>c.status==='approved').reduce((s,c)=>s+(c.amountRequested||c.amountApproved||c.amount||0),0).toLocaleString()}
              </div>
            </div>
            <div style={{ fontSize:12,color:'var(--muted)' }}>{filtered.length} claims</div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state"><div className="emoji">{TYPE_META[tab]?.icon}</div><p>No {filter==='all'?'':filter} {tab==='all'?'':tab} claims</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Claimant</th><th>Member No.</th><th>Amount</th><th>Docs</th><th>Fraud</th><th>Submitted</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {filtered.map(c=>(
                    <tr key={c.id}>
                      <td style={{ fontWeight:600 }}>{sd(c.userId?.fullName||c.userName)}<div style={{ fontSize:11,color:'var(--muted)' }}>{s(c.userId?.phone||c.userPhone)}</div></td>
                      <td style={{ fontSize:11,fontFamily:'monospace',color:'var(--muted)' }}>{sd(c.userId?.memberNumber||c.memberNumber)}</td>
                      <td style={{ fontWeight:700 }}>KES {(c.amountRequested||c.amountApproved||c.amount||0).toLocaleString()}</td>
                      <td style={{ fontSize:12 }}>📎 {c.documents?.length||0}</td>
                      <td><FraudBadge score={c.fraudScore||''}/></td>
                      <td style={{ fontSize:11,color:'var(--muted)' }}>{new Date(c.submittedAt).toLocaleDateString('en-KE')}</td>
                      <td><span className={`status-badge status-${s(c.status)}`}>{s(c.status)}</span></td>
                      <td>
                        <button className="btn btn-sm btn-secondary" onClick={()=>setSelected(c)}>🔍 Review</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ClaimDetailModal claim={selected} onClose={()=>setSelected(null)} onAction={handleAction}/>
    </div>
  );
}
