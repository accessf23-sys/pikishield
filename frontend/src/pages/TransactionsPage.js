import React, { useState, useEffect } from 'react';
import { usersAPI } from '../utils/api';
const s=(v,fb='')=>v==null?fb:typeof v==='object'?fb:String(v)||fb; const sd=(v)=>s(v,'—');


const TYPE_META = {
  claim_payout:   { label:'Claim Payout',   icon:'💰', color:'var(--green)',  sign:'+' },
  token_earned:   { label:'Token Balance',  icon:'🪙', color:'#9333EA',       sign:'+' },
  token_redeemed: { label:'Reward Redeemed',icon:'🎁', color:'var(--orange)', sign:'-' },
};

export default function TransactionsPage() {
  const [txns, setTxns]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    usersAPI.getTransactions().then(r => setTxns(r.data)).catch(console.error).finally(()=>setLoading(false));
  }, []);

  // Exclude contributions entirely
  const visible = txns.filter(t => t.type !== 'contribution');
  const filtered = filter === 'all' ? visible : visible.filter(t => t.type === filter);
  const totalPayouts = visible.filter(t=>t.type==='claim_payout').reduce((s,t)=>s+t.amount, 0);
  const totalTokensEarned  = visible.filter(t=>t.type==='token_earned').reduce((s,t)=>s+t.amount, 0);
  const totalTokensSpent   = visible.filter(t=>t.type==='token_redeemed').reduce((s,t)=>s+t.amount, 0);
  const totalTokens = totalTokensEarned - totalTokensSpent;

  

  if (loading) return (
    <div className="page-body" style={{textAlign:'center',padding:'40px',color:'var(--muted)',fontSize:14}}>
      ⌛ Fetching your history…
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Transactions</h1>
        <p className="page-subtitle">Payouts and token history</p>
      </div>
      <div className="page-body">
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
          {[
            {icon:'💰',label:'Total Payouts',   value:`KES ${totalPayouts.toLocaleString()}`,color:'#00D68F',bg:'#E6FBF3'},
            {icon:'🪙',label:'Token Balance',   value:totalTokens,                           color:'#9333EA',bg:'#F5F3FF'},
            {icon:'📋',label:'Total Transactions',value:visible.length,                      color:'#4F46E5',bg:'#EEF2FF'},
          ].map(s=>(
            <div key={s.label} style={{
              background:'var(--surface)',borderRadius:12,padding:'14px 16px',
              border:'1px solid var(--border)',position:'relative',overflow:'hidden',
              boxShadow:'0 1px 4px rgba(0,0,0,.04)',
            }}>
              <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:s.color,borderRadius:'12px 12px 0 0'}}/>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:34,height:34,borderRadius:9,background:s.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>{s.icon}</div>
                <div>
                  <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:800,fontSize:18,color:s.color,lineHeight:1}}>{s.value}</div>
                  <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{s.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
            {[['all','All'],['claim_payout','Payouts'],['token_earned','Tokens Earned'],['token_redeemed','Redeemed']].map(([f,l])=>(
              <button key={f} className={`btn btn-sm ${filter===f?'btn-primary':'btn-secondary'}`} onClick={()=>setFilter(f)}>{l}</button>
            ))}
          </div>
          {filtered.length===0 ? (
            <div className="empty-state"><div className="emoji">💳</div><p>No transactions found</p></div>
          ) : (
            <div className="table-wrap">
              <table style={{tableLayout:'fixed',width:'100%'}}>
                <thead><tr><th>Type</th><th>Description</th><th>Date</th><th>Method</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {filtered.map(t=>{
                    const meta = TYPE_META[t.type] || { icon:'📋', sign:'', color:'var(--text)' };
                    return (
                      <tr key={t.id}>
                        <td><span style={{fontSize:16}}>{meta.icon||''}</span></td>
                        <td style={{maxWidth:260,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s(t.description)}</td>
                        <td style={{fontSize:11,color:'var(--muted)',whiteSpace:'nowrap'}}>
                          {new Date(t.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}
                        </td>
                        <td><span style={{background:'#EEF2FF',color:'#4F46E5',padding:'2px 8px',borderRadius:8,fontSize:11,fontWeight:600}}>{s(t.method).toUpperCase()}</span></td>
                        <td><span style={{fontWeight:700,color:meta.color||''}}>{meta.sign||''}{t.type.includes('token')?`${t.amount||''} 🪙`:`KES ${(t.amount||0).toLocaleString()}`}</span></td>
                        <td><span className="status-badge status-approved">Completed</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
