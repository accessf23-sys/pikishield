// v9-FINAL
import React, { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { usersAPI, documentsAPI } from '../utils/api';
import CameraCapture from '../components/CameraCapture';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const s = (v, fb = '') => v == null ? fb : typeof v === 'object' ? fb : String(v) || fb;
const sd = (v) => s(v, '—');

async function dlDoc(id, name) {
  try {
    const token = localStorage.getItem('piki_token');
    const res = await fetch(`/api/documents/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name || 'document';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch {
    alert('Download failed — please try again.');
  }
}

function SuspendModal({ user, onClose, onSuspend }) {
  const [reason, setReason] = useState('');
  if (!user) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <div
        style={{ background: 'white', borderRadius: 14, padding: 24, width: 420, maxWidth: '95vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 16, marginBottom: 4 }}>
          ⚠️ {user.suspended ? 'Reinstate' : 'Suspend'} Account
        </h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
          {user.fullName} · {user.memberNumber || user.phone}
        </p>

        {!user.suspended && (
          <div className="form-group">
            <label className="form-label">Reason for suspension</label>
            <input
              className="form-input"
              placeholder="e.g. Suspected document fraud..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className={'btn ' + (user.suspended ? 'btn-primary' : 'btn-danger')}
            onClick={() => onSuspend(user, reason)}
          >
            {user.suspended ? '✅ Reinstate Account' : '🚫 Suspend Account'}
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
    if (person) {
      documentsAPI.getForUser(String(person._id||person.id)).then(r => setDocs(r.data)).catch(() => {});
    }
  }, [person]);

  if (!person) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.55)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 14,
          width: '100%',
          maxWidth: 640,
          maxHeight: '92vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>
              {person.role === 'member' ? '👥' : '🏍️'} Review: {person.fullName}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {person.memberNumber || 'No member no.'} · {String(person.phone || '')} · KYC:{' '}
              <strong style={{ color: 'var(--yellow)' }}>{String(person.kycStatus || 'pending')}</strong>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: 8,
              padding: '6px 12px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ overflow: 'auto', flex: 1, padding: '16px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {[
              ['Role', person.role],
              ['National ID', person.nationalId],
              ['County', person.profile?.county],
              ['Registered', new Date(person.createdAt).toLocaleDateString('en-KE')],
              person.agentName && ['Agent', person.agentName + ' (' + person.agentCode + ')'],
              person.profile?.bikeReg && ['Bike Reg', person.profile.bikeReg],
              person.profile?.licenseNumber && ['License', person.profile.licenseNumber],
              person.profile?.bikeType && ['Bike Type', person.profile.bikeType],
              person.profile?.isBikeOwner === false && [
                'Bike Owner',
                (person.profile.ownerName || '?') + ' · ' + (person.profile.ownerPhone || '?')
              ],
            ]
              .filter(Boolean)
              .map(([k, v]) => (
                <div key={k} style={{ background: 'var(--bg)', borderRadius: 7, padding: '8px 12px' }}>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--muted)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      marginBottom: 2
                    }}
                  >
                    {k}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{v || '—'}</div>
                </div>
              ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              📎 KYC Documents ({docs.length})
            </div>

            {docs.length === 0 ? (
              <div
                style={{
                  background: '#FFF8E1',
                  border: '1px solid #FDE68A',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 12,
                  color: '#92400E'
                }}
              >
                ⚠️ No KYC documents uploaded. Reject until documents are provided.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {docs.map(d => (
                  <div
                    key={d.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: 'white',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: '8px 12px'
                    }}
                  >
                    <span style={{ fontSize: 16 }}>
                      {d.mimeType?.startsWith('image/') ? '🖼️' : '📄'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{d.originalName}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.docLabel || d.docType}</div>
                    </div>
                    {d.verified && (
                      <span
                        style={{
                          fontSize: 10,
                          background: 'var(--green-light)',
                          color: 'var(--green)',
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontWeight: 700
                        }}
                      >
                        ✓ Verified
                      </span>
                    )}
                    <button
                      onClick={() => dlDoc(d.id, d.originalName)}
                      style={{
                        fontSize: 12,
                        background: 'var(--green-light)',
                        border: 'none',
                        borderRadius: 6,
                        padding: '4px 10px',
                        cursor: 'pointer',
                        color: 'var(--green)',
                        fontWeight: 600
                      }}
                    >
                      ⬇️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {person.kycStatus === 'pending' && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <div className="form-group">
                <label className="form-label">Rejection reason (if rejecting)</label>
                <input
                  className="form-input"
                  placeholder="e.g. Documents incomplete, ID not clear..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                <button className="btn btn-primary" onClick={() => onApprove(String(person._id||person.id))}>
                  ✅ Approve KYC
                </button>
                <button className="btn btn-danger" onClick={() => onReject(String(person._id||person.id), reason)}>
                  ❌ Reject KYC
                </button>
                <button className="btn btn-secondary" onClick={() => onSuspend(person)}>
                  ⚠️ Suspend Account
                </button>
              </div>
            </div>
          )}

          {person.kycStatus !== 'pending' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={() => onSuspend(person)}>
                {person.suspended ? '✅ Reinstate Account' : '⚠️ Suspend Account'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickCreateAgent({ onClose, onDone }) {
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    nationalId: '',
    region: '',
    password: '',
    commission: ''
  });
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [tempId] = useState(() => 'AGT_' + Date.now());
  const [idDoc, setIdDoc] = useState(null);
  const [idUploading, setIdUploading] = useState(false);

  const COUNTIES = [
    'Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Thika','Nyeri','Meru','Kitale','Kakamega',
    'Bungoma','Machakos','Embu','Kericho','Kilifi','Kwale',"Murang'a",'Kiambu','Migori','Kisii',
    'Homa Bay','Siaya','Busia','Trans Nzoia','Uasin Gishu','Nandi','Baringo','West Pokot',
    'Samburu','Turkana','Marsabit','Isiolo','Mwingi','Tana River','Lamu','Taita Taveta',
    'Garissa','Wajir','Mandera','Narok','Kajiado','Laikipia','Nyahururu','Nyandarua',
    'Kirinyaga','Tharaka Nithi','Vihiga','Butere'
  ];

  const uploadId = (file) => {
    if (!file) return;
    setIdUploading(true);
    const fd = new FormData();
    fd.append('files', file);
    fd.append('docType', 'national_id');
    fd.append('tempUploadId', tempId);

    fetch('/api/documents/upload-kyc', { method: 'POST', body: fd })
      .then(r => r.json())
      .then(d => { if (d.documents?.[0]) setIdDoc(d.documents[0]); })
      .catch(() => {})
      .finally(() => setIdUploading(false));
  };

  const submit = async () => {
    if (!form.fullName || !form.phone || !form.nationalId || !form.region || !form.password) {
      return setErr('Full name, phone, national ID, region and password are required');
    }
    if (form.password.length < 8) return setErr('Password must be at least 8 characters');

    setCreating(true);
    setErr('');

    try {
      const res = await usersAPI.createAgent(form);
      const { agentCode, user } = res.data;

      if (idDoc && user?.id) {
        await fetch('/api/documents/attach-kyc', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + localStorage.getItem('piki_token')
          },
          body: JSON.stringify({ tempUploadId: tempId, userId: user.id })
        }).catch(() => {});
      }

      setOk('✅ Agent created!\nCode: ' + agentCode + '\nPhone: ' + form.phone + '\nPass: ' + form.password);
      if (onDone) if (onDone) onDone();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5,14,31,.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'white',
          borderRadius: 16,
          boxShadow: '0 32px 80px rgba(0,0,0,.4)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            background: 'linear-gradient(135deg,#059669,#047857)',
            padding: '13px 17px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 7,
                background: 'rgba(255,255,255,.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15
              }}
            >
              🤝
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: 'white' }}>Create Field Agent</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)' }}>
                New agent account with unique code
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,.1)',
              border: 'none',
              borderRadius: 7,
              width: 28,
              height: 28,
              color: 'white',
              cursor: 'pointer',
              fontSize: 15
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '13px 16px 16px', maxHeight: '70vh', overflowY: 'auto' }}>
          {err && (
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 7,
                padding: '8px 11px',
                fontSize: 12,
                color: '#991B1B',
                marginBottom: 9
              }}
            >
              ❌ {err}
            </div>
          )}

          {ok ? (
            <div>
              <div
                style={{
                  background: '#F0FDF4',
                  border: '2px solid #A7F3D0',
                  borderRadius: 10,
                  padding: '12px',
                  marginBottom: 9
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: '#047857',
                    fontFamily: 'monospace',
                    background: '#ECFDF5',
                    borderRadius: 5,
                    padding: '8px',
                    whiteSpace: 'pre',
                    lineHeight: 1.9
                  }}
                >
                  {ok}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                <button
                  style={{
                    flex: 1,
                    padding: '9px',
                    background: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: 7,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setOk('');
                    setForm({
                      fullName: '',
                      phone: '',
                      email: '',
                      nationalId: '',
                      region: '',
                      password: '',
                      commission: ''
                    });
                    setIdDoc(null);
                  }}
                >
                  ➕ Create Another
                </button>
                <button
                  style={{
                    flex: 1,
                    padding: '9px',
                    background: '#F3F4F6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: 7,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                  onClick={onClose}
                >
                  ✓ Done
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { key: 'fullName', label: 'Full Name', ph: 'e.g. John Kamau', type: 'text', req: true },
                { key: 'phone', label: 'Phone', ph: '+254700000000', type: 'tel', req: true },
                { key: 'nationalId', label: 'National ID', ph: 'e.g. 12345678', type: 'text', req: true },
                { key: 'email', label: 'Email (optional)', ph: 'agent@email.com', type: 'email', req: false },
                { key: 'password', label: 'Password', ph: 'Min 8 chars', type: 'password', req: true },
                { key: 'commission', label: 'Commission %', ph: 'Default 5%', type: 'number', req: false }
              ].map(f => (
                <div key={f.key}>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#374151',
                      display: 'block',
                      marginBottom: 2
                    }}
                  >
                    {f.label}
                    {f.req && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
                  </label>
                  <input
                    type={f.type}
                    placeholder={f.ph}
                    style={{
                      width: '100%',
                      border: '1.5px solid #E5E7EB',
                      borderRadius: 6,
                      padding: '6px 9px',
                      fontSize: 12,
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                    value={form[f.key] || ''}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    onFocus={e => { e.target.style.borderColor = '#059669'; }}
                    onBlur={e => { e.target.style.borderColor = '#E5E7EB'; }}
                  />
                </div>
              ))}

              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#374151',
                    display: 'block',
                    marginBottom: 2
                  }}
                >
                  Region / County<span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>
                </label>
                <select
                  style={{
                    width: '100%',
                    border: '1.5px solid #E5E7EB',
                    borderRadius: 6,
                    padding: '6px 9px',
                    fontSize: 12,
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit'
                  }}
                  value={form.region || ''}
                  onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
                  onFocus={e => { e.target.style.borderColor = '#059669'; }}
                  onBlur={e => { e.target.style.borderColor = '#E5E7EB'; }}
                >
                  <option value="">Select county…</option>
                  {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#374151',
                    display: 'block',
                    marginBottom: 4
                  }}
                >
                  📎 Copy of National ID <span style={{ fontSize: 10, color: '#9CA3AF' }}>(optional but recommended)</span>
                </label>
                <div
                  style={{
                    border: '2px dashed ' + (idDoc ? '#059669' : '#D1D5DB'),
                    borderRadius: 8,
                    padding: '9px 12px',
                    textAlign: 'center',
                    background: idDoc ? '#F0FDF4' : '#FAFAFA'
                  }}
                >
                  {idDoc ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>
                        ✅ {idDoc.originalName}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIdDoc(null)}
                        style={{
                          fontSize: 10,
                          color: '#EF4444',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 5 }}>
                        {idUploading ? '⏳ Uploading…' : '📷 Photo or file of ID'}
                      </div>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        style={{ display: 'none' }}
                        id="qdAgentIdFile"
                        onChange={e => uploadId(e.target.files[0])}
                      />
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          type="button"
                          disabled={idUploading}
                          onClick={() => document.getElementById('qdAgentIdFile')?.click()}
                          style={{
                            fontSize: 11,
                            padding: '4px 10px',
                            background: 'white',
                            border: '1.5px solid #D1D5DB',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          📁 Browse
                        </button>
                        <CameraCapture disabled={idUploading} color="#059669" onCapture={f => uploadId(f)} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                style={{
                  width: '100%',
                  marginTop: 4,
                  padding: '10px',
                  background: 'linear-gradient(135deg,#059669,#00D68F)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
                onClick={submit}
                disabled={creating}
              >
                {creating ? '⏳ Creating…' : '🤝 Create Agent'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickCreateAdmin({ onClose, onDone }) {
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [tempId] = useState(() => 'ADM_' + Date.now());
  const [idDoc, setIdDoc] = useState(null);
  const [idUploading, setIdUploading] = useState(false);

  const uploadId = (file) => {
    if (!file) return;
    setIdUploading(true);
    const fd = new FormData();
    fd.append('files', file);
    fd.append('docType', 'national_id');
    fd.append('tempUploadId', tempId);

    fetch('/api/documents/upload-kyc', { method: 'POST', body: fd })
      .then(r => r.json())
      .then(d => { if (d.documents?.[0]) setIdDoc(d.documents[0]); })
      .catch(() => {})
      .finally(() => setIdUploading(false));
  };

  const submit = async () => {
    if (!form.fullName || !form.phone || !form.password) {
      return setErr('Full name, phone and password are required');
    }
    if (form.password.length < 8) return setErr('Password must be at least 8 characters');

    setCreating(true);
    setErr('');

    try {
      const res = await usersAPI.createAdmin(form);
      const adminUser = res.data.user || res.data;

      if (idDoc && adminUser?.id) {
        await fetch('/api/documents/attach-kyc', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + localStorage.getItem('piki_token')
          },
          body: JSON.stringify({ tempUploadId: tempId, userId: adminUser.id })
        }).catch(() => {});
      }

      setOk('✅ Admin created!\nPhone: ' + form.phone + '\nPass: ' + form.password);
      if (onDone) if (onDone) onDone();
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5,14,31,.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'white',
          borderRadius: 16,
          boxShadow: '0 32px 80px rgba(0,0,0,.4)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            background: 'linear-gradient(135deg,#1E1B4B,#312E81)',
            padding: '13px 17px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 7,
                background: 'rgba(165,180,252,.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15
              }}
            >
              🏢
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: 'white' }}>Create Admin Account</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>
                Full system access — use carefully
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,.1)',
              border: 'none',
              borderRadius: 7,
              width: 28,
              height: 28,
              color: 'white',
              cursor: 'pointer',
              fontSize: 15
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '13px 16px 16px', maxHeight: '70vh', overflowY: 'auto' }}>
          {err && (
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 7,
                padding: '8px 11px',
                fontSize: 12,
                color: '#991B1B',
                marginBottom: 9
              }}
            >
              ❌ {err}
            </div>
          )}

          {ok ? (
            <div>
              <div
                style={{
                  background: '#F0FDF4',
                  border: '2px solid #A7F3D0',
                  borderRadius: 10,
                  padding: '12px',
                  marginBottom: 9
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: '#047857',
                    fontFamily: 'monospace',
                    background: '#ECFDF5',
                    borderRadius: 5,
                    padding: '8px',
                    whiteSpace: 'pre',
                    lineHeight: 1.9
                  }}
                >
                  {ok}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 7 }}>
                <button
                  style={{
                    flex: 1,
                    padding: '9px',
                    background: 'linear-gradient(135deg,#4F46E5,#7C3AED)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 7,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setOk('');
                    setForm({ fullName: '', phone: '', email: '', password: '' });
                    setIdDoc(null);
                  }}
                >
                  ➕ Create Another
                </button>
                <button
                  style={{
                    flex: 1,
                    padding: '9px',
                    background: '#F3F4F6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: 7,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                  onClick={onClose}
                >
                  ✓ Done
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { key: 'fullName', label: 'Full Name', ph: 'e.g. Jane Wanjiku', type: 'text', req: true },
                { key: 'phone', label: 'Phone', ph: '+254700000000', type: 'tel', req: true },
                { key: 'email', label: 'Email (optional)', ph: 'admin@email.com', type: 'email', req: false },
                { key: 'password', label: 'Password', ph: 'Min 8 chars', type: 'password', req: true }
              ].map(f => (
                <div key={f.key}>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#374151',
                      display: 'block',
                      marginBottom: 2
                    }}
                  >
                    {f.label}
                    {f.req && <span style={{ color: '#EF4444', marginLeft: 2 }}>*</span>}
                  </label>
                  <input
                    type={f.type}
                    placeholder={f.ph}
                    style={{
                      width: '100%',
                      border: '1.5px solid #E5E7EB',
                      borderRadius: 6,
                      padding: '6px 9px',
                      fontSize: 12,
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'inherit'
                    }}
                    value={form[f.key] || ''}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    onFocus={e => { e.target.style.borderColor = '#4F46E5'; }}
                    onBlur={e => { e.target.style.borderColor = '#E5E7EB'; }}
                  />
                </div>
              ))}

              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#374151',
                    display: 'block',
                    marginBottom: 4
                  }}
                >
                  📎 Copy of National ID <span style={{ fontSize: 10, color: '#9CA3AF' }}>(optional but recommended)</span>
                </label>
                <div
                  style={{
                    border: '2px dashed ' + (idDoc ? '#4F46E5' : '#D1D5DB'),
                    borderRadius: 8,
                    padding: '9px 12px',
                    textAlign: 'center',
                    background: idDoc ? '#EEF2FF' : '#FAFAFA'
                  }}
                >
                  {idDoc ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#4F46E5', fontWeight: 700 }}>
                        ✅ {idDoc.originalName}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIdDoc(null)}
                        style={{
                          fontSize: 10,
                          color: '#EF4444',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 5 }}>
                        {idUploading ? '⏳ Uploading…' : '📷 Photo or file of ID'}
                      </div>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        style={{ display: 'none' }}
                        id="qdAdminIdFile"
                        onChange={e => uploadId(e.target.files[0])}
                      />
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          type="button"
                          disabled={idUploading}
                          onClick={() => document.getElementById('qdAdminIdFile')?.click()}
                          style={{
                            fontSize: 11,
                            padding: '4px 10px',
                            background: 'white',
                            border: '1.5px solid #D1D5DB',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontWeight: 600
                          }}
                        >
                          📁 Browse
                        </button>
                        <CameraCapture disabled={idUploading} color="#4F46E5" onCapture={f => uploadId(f)} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  background: '#FEF3C7',
                  border: '1px solid #FCD34D',
                  borderRadius: 6,
                  padding: '8px 10px',
                  fontSize: 11,
                  color: '#92400E',
                  lineHeight: 1.5
                }}
              >
                ⚠️ Admin accounts have <strong>full system access</strong>. Only create for trusted team members.
              </div>

              <button
                style={{
                  width: '100%',
                  marginTop: 4,
                  padding: '10px',
                  background: 'linear-gradient(135deg,#4F46E5,#7C3AED)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
                onClick={submit}
                disabled={creating}
              >
                {creating ? '⏳ Creating…' : '🏢 Create Admin Account'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user: authUser } = useAuth();
  const isSuperAdmin = authUser?.role === 'superadmin';

  const [data, setData] = useState({
    totalUsers: 0,
    totalMembers: 0,
    totalNOKs: 0,
    totalAgents: 0,
    activePolicies: 0,
    pendingClaims: 0,
    pendingOnboards: 0,
    totalClaims: 0,
    totalPayouts: 0,
    totalRevenue: 0,
    netPosition: 0,
    riskDistribution: { green: 0, yellow: 0, red: 0 },
    recentClaims: [],
    monthlyFinancials: [],
    claimBreakdown: [],
    userGrowth: [],
    suspended: 0,
    allUsers: [],
    admins: []
  });

  const [agents, setAgents] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [reviewPerson, setReviewPerson] = useState(null);
  const [suspendPerson, setSuspendPerson] = useState(null);
  const navigate = useNavigate();
  const [showNewAgent, setShowNewAgent] = useState(false);
  const [showNewAdmin, setShowNewAdmin] = useState(false);

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

  const handleApprove = async (id) => {
    try {
      await usersAPI.approveKyc(id);
      setReviewPerson(null);
      load();
    } catch (e) {
      alert('Approve failed: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleReject = async (id, reason) => {
    try {
      await usersAPI.rejectKyc(id, reason || 'Documents incomplete or not legible');
      setReviewPerson(null);
      load();
    } catch (e) {
      alert('Reject failed: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleSuspend = async (user, reason) => {
    if (user.suspended) await usersAPI.unsuspendUser(user.id);
    else await usersAPI.suspendUser(user.id, reason || 'Admin action');

    setSuspendPerson(null);
    setReviewPerson(null);
    load();
  };

  const riskData = [
    { name: 'Green', value: data?.riskDistribution?.green || 0, color: '#00D68F' },
    { name: 'Yellow', value: data?.riskDistribution?.yellow || 0, color: '#F59E0B' },
    { name: 'Red', value: data?.riskDistribution?.red || 0, color: '#F43F5E' },
  ];

  const pendingCount = pending.length;

  return (
    <div>
      <div className="page-body" style={{ paddingTop: 28 }}>

        <div
          style={{
            background: 'linear-gradient(135deg,#050E1F 0%,#0D1F40 40%,#071A2E 70%,#06201A 100%)',
            borderRadius: 20,
            padding: '28px 32px',
            marginBottom: 24,
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,.06)'
          }}
        >
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: .04,
              pointerEvents: 'none'
            }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="ag" width="36" height="36" patternUnits="userSpaceOnUse">
                <path d="M 36 0 L 0 0 0 36" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#ag)" />
          </svg>

          <div
            style={{
              position: 'absolute',
              top: -60,
              left: 200,
              width: 240,
              height: 240,
              borderRadius: '50%',
              background: 'radial-gradient(circle,rgba(0,214,143,.1) 0%,transparent 70%)',
              pointerEvents: 'none'
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -80,
              right: 100,
              width: 300,
              height: 300,
              borderRadius: '50%',
              background: 'radial-gradient(circle,rgba(79,70,229,.1) 0%,transparent 70%)',
              pointerEvents: 'none'
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,.5)',
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    marginBottom: 6
                  }}
                >
                  {isSuperAdmin ? '⭐ Super Admin' : '🛡️ Admin'} Dashboard
                </div>
                <h1 style={{ fontSize: 26, fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.2 }}>
                  {authUser?.fullName || 'Admin'}
                </h1>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', marginTop: 6 }}>
                  {new Date().toLocaleDateString('en-KE', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  className="btn"
                  style={{
                    background: 'rgba(255,255,255,.08)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,.15)',
                    backdropFilter: 'blur(8px)',
                    fontSize: 12,
                    padding: '8px 16px'
                  }}
                  onClick={() => navigate('/admin/claims')}
                >
                  📋 Claims{' '}
                  {data.pendingClaims > 0 && (
                    <span
                      style={{
                        background: '#EF4444',
                        borderRadius: 10,
                        padding: '1px 6px',
                        fontSize: 10,
                        marginLeft: 4
                      }}
                    >
                      {data.pendingClaims}
                    </span>
                  )}
                </button>

                {isSuperAdmin && (
                  <button
                    className="btn"
                    style={{
                      background: 'rgba(79,70,229,.18)',
                      color: '#C7D2FE',
                      border: '1px solid rgba(99,102,241,.3)',
                      fontSize: 12,
                      padding: '8px 16px'
                    }}
                    onClick={() => setShowNewAdmin(true)}
                  >
                    ➕ New Admin
                  </button>
                )}

                <button
                  className="btn"
                  style={{
                    background: 'rgba(0,214,143,.15)',
                    color: '#00D68F',
                    border: '1px solid rgba(0,214,143,.3)',
                    fontSize: 12,
                    padding: '8px 16px'
                  }}
                  onClick={load}
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginTop: 24 }}>
              {[
                { label: 'Agents', value: data.totalAgents, icon: '🤝', color: '#3B82F6' },
                { label: 'Active Policies', value: data.activePolicies, icon: '🛡️', color: '#F59E0B' },
                { label: 'Claims', value: data.totalClaims, icon: '📋', color: '#EC4899' },
                ...(isSuperAdmin ? [{ label: 'Admin Accounts', value: (data.admins || []).length, icon: '🏢', color: '#8B5CF6' }] : []),
                ...(isSuperAdmin ? [{ label: 'Financial Health', value: 'KES ' + (data.netPosition || 0).toLocaleString(), icon: '💰', color: '#00D68F' }] : []),
              ].map(k => (
                <div
                  key={k.label}
                  style={{
                    background: 'rgba(255,255,255,.06)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    border: '1px solid rgba(255,255,255,.08)'
                  }}
                >
                  <div style={{ fontSize: 18 }}>{k.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: k.color, lineHeight: 1, marginTop: 4 }}>
                    {k.value ?? 0}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.5)', marginTop: 2 }}>{k.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { id: 'overview', label: '📊 Overview' },
            { id: 'agents', label: '🤝 Agents' },
            ...(isSuperAdmin ? [
              { id: 'financial', label: '💰 Financial Health' },
              { id: 'admins', label: '🏢 Admin Accounts' },
            ] : []),
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                background: tab === t.id ? 'var(--green)' : 'var(--surface)',
                color: tab === t.id ? 'white' : 'var(--text)',
                boxShadow: tab === t.id ? '0 2px 8px rgba(0,214,143,.3)' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
            Loading…
          </div>
        )}

        {!loading && tab === 'overview' && (
          <>
            <div className="stats-grid" style={{ marginBottom: 16, gridTemplateColumns: "repeat(2, 1fr)" }}>
              {[
                { label: 'Agents', value: data.totalAgents, icon: '🤝', color: '#3B82F6', bg: '#EFF6FF' },
                { label: 'Active Policies', value: data.activePolicies, icon: '🛡️', color: '#F59E0B', bg: '#FFFBEB' },
                { label: 'Total Claims', value: data.totalClaims, icon: '📋', color: '#EC4899', bg: '#FDF2F8' },
                ...(isSuperAdmin ? [
                  { label: 'Admin Accounts', value: (data.admins || []).length, icon: '🏢', color: '#8B5CF6', bg: '#F5F3FF' },
                  {
                    label: 'Net Position',
                    value: 'KES ' + (data.netPosition || 0).toLocaleString(),
                    icon: '💰',
                    color: (data.netPosition || 0) >= 0 ? 'var(--green)' : 'var(--red)',
                    bg: (data.netPosition || 0) >= 0 ? 'var(--green-light)' : 'var(--red-light)'
                  },
                ] : []),
                { label: 'Claims Pending', value: data.pendingClaims, icon: '⏳', color: 'var(--red)', bg: 'var(--red-light)' },
              ].map(stat => (
                <div key={stat.label} className="stat-card" style={{padding:"12px 10px"}}>
                  <div className="stat-icon" style={{ background: stat.bg, color: stat.color }}>{stat.icon}</div>
                  <div className="stat-value" style={{ color: stat.color }}>{stat.value ?? 0}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="two-col" style={{ marginBottom: 16 }}>
              <div className="card" style={{ padding: '14px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: 'var(--emerald-light)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12
                    }}
                  >
                    📊
                  </span>
                  Risk Distribution
                </div>

                {riskData.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <ResponsiveContainer width={110} height={110}>
                      <PieChart>
                        <Pie
                          data={riskData}
                          cx="50%"
                          cy="50%"
                          innerRadius={28}
                          outerRadius={50}
                          dataKey="value"
                          paddingAngle={4}
                        >
                          {riskData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <Tooltip formatter={(v, n) => [v, n]} />
                      </PieChart>
                    </ResponsiveContainer>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {riskData.map(d => (
                        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 2,
                              background: d.color,
                              flexShrink: 0
                            }}
                          />
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{d.name}</span>
                          <span style={{ fontWeight: 700, fontSize: 12, marginLeft: 'auto', color: d.color }}>
                            {d.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      height: 110,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--muted)',
                      fontSize: 12
                    }}
                  >
                    No risk data yet
                  </div>
                )}
              </div>

              <div className="card" style={{ padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        background: 'var(--amber-light)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12
                      }}
                    >
                      📋
                    </span>
                    Recent Claims
                  </div>
                  <button
                    className="btn btn-sm btn-secondary"
                    style={{ fontSize: 11, padding: '4px 10px' }}
                    onClick={() => navigate('/admin/claims')}
                  >
                    All →
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {(data.recentClaims || []).slice(0, 4).map(c => (
                    <div
                      key={c.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '7px 10px',
                        background: 'var(--bg)',
                        borderRadius: 8
                      }}
                    >
                      <span style={{ fontSize: 14 }}>{TYPE_META[c.type]?.icon || '📋'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {c.userId?.fullName || c.userName || 'Unknown'}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                            {c.type === 'income' ? 'Stipend' : c.type}
                          </span>
                          {' · '}
                          {c.referenceNumber || '—'}
                          {(c.amountRequested || c.amountApproved)
                            ? ' · KES ' + (c.amountRequested || c.amountApproved).toLocaleString()
                            : ''}
                        </div>
                      </div>
                      <span className={'status-badge status-' + c.status} style={{ fontSize: 9, padding: '2px 7px' }}>
                        {c.status}
                      </span>
                    </div>
                  ))}

                  {(data.recentClaims || []).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--muted)', fontSize: 12 }}>
                      No claims yet
                    </div>
                  )}
                </div>
              </div>
            </div>

            {pending.length > 0 && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>Pending KYC Reviews</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Review documents before approving accounts</div>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      background: '#FFF8E1',
                      color: '#92400E',
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontWeight: 600
                    }}
                  >
                    {pendingCount} pending
                  </span>
                </div>

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: '30%' }}>Name</th>
                        <th style={{ width: '15%' }}>Member No.</th>
                        <th style={{ width: '10%' }}>Role</th>
                        <th style={{ width: '15%' }}>County</th>
                        <th style={{ width: '15%' }}>Joined</th>
                        <th style={{ width: '15%' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pending.slice(0, 8).map(p => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600, fontSize: 13 }}>
                            {s(p.fullName)}
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s(p.phone)}</div>
                          </td>
                          <td style={{ fontSize: 11, fontWeight: 700 }}>{sd(p.memberNumber || p.nokNumber)}</td>
                          <td>
                            <span
                              className={'tier-badge ' + (p.role === 'rider' ? 'tier-green' : p.role === 'member' ? 'tier-yellow' : 'tier-red')}
                              style={{ fontSize: 10 }}
                            >
                              {s(p.role)}
                            </span>
                          </td>
                          <td style={{ fontSize: 12 }}>
                            {typeof p.profile?.county === 'object' ? '—' : (p.profile?.county || '—')}
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {new Date(p.createdAt).toLocaleDateString('en-KE')}
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-primary"
                              style={{ fontSize: 11, padding: '5px 12px' }}
                              onClick={() => setReviewPerson({...p, id: String(p._id||p.id)})}
                            >
                              🔍 Review
                            </button>
                          </td>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Field Agents</div>
              <button
                className="btn btn-sm"
                onClick={() => setShowNewAgent(true)}
                style={{ background: 'linear-gradient(135deg,#059669,#00D68F)', color: 'white', border: 'none' }}
              >
                ➕ New Agent
              </button>
            </div>

            {agents.length > 0 && (
              <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Agent Onboarding Performance</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart
                    data={agents.map(a => ({
                      name: (a.name || a.fullName || '').split(' ')[0],
                      riders: a.ridersCount,
                      members: a.membersCount,
                      kyc: a.approvedKYC
                    }))}
                    barSize={18}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="riders" name="Riders" fill="#22C55E" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="members" name="Members" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="kyc" name="KYC Approved" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="card">
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Agent Performance Details</div>
              {agents.length === 0 ? (
                <div className="empty-state">
                  <div className="emoji">🤝</div>
                  <p>No agents registered yet</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Agent</th>
                        <th>Code</th>
                        <th>Region</th>
                        <th>Riders</th>
                        <th>Members</th>
                        <th>KYC Approved</th>
                        <th>KYC Pending</th>
                        <th>Claims</th>
                        <th>Approval Rate</th>
                        <th>Last Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agents.map(a => (
                        <tr key={a.id}>
                          <td style={{ fontWeight: 600 }}>
                            {s(a.name || a.fullName)}
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{s(a.phone)}</div>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>
                            {s(a.agentCode)}
                          </td>
                          <td style={{ fontSize: 12 }}>{typeof a.region === 'object' ? '' : (a.region || '')}</td>
                          <td style={{ fontWeight: 600, textAlign: 'center' }}>{a.ridersCount ?? 0}</td>
                          <td style={{ fontWeight: 600, textAlign: 'center' }}>{a.membersCount ?? 0}</td>
                          <td style={{ fontWeight: 600, textAlign: 'center', color: 'var(--green)' }}>{a.approvedKYC ?? 0}</td>
                          <td style={{ fontWeight: 600, textAlign: 'center', color: 'var(--yellow)' }}>{a.pendingKYC ?? 0}</td>
                          <td style={{ textAlign: 'center' }}>{a.claimsCount ?? 0}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div
                                style={{
                                  flex: 1,
                                  height: 5,
                                  background: 'var(--border)',
                                  borderRadius: 3,
                                  overflow: 'hidden'
                                }}
                              >
                                <div
                                  style={{
                                    width: (a.kycApprovalRate || 0) + '%',
                                    height: '100%',
                                    borderRadius: 3,
                                    background:
                                      (a.kycApprovalRate || 0) >= 80
                                        ? 'var(--green)'
                                        : (a.kycApprovalRate || 0) >= 50
                                        ? '#EAB308'
                                        : 'var(--red)'
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 600, width: 32 }}>{a.kycApprovalRate ?? 0}%</span>
                            </div>
                          </td>
                          <td style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {a.lastActivity ? new Date(a.lastActivity).toLocaleDateString('en-KE') : '—'}
                          </td>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total Revenue', value: 'KES ' + (data.totalRevenue || 0).toLocaleString(), color: '#00D68F', bg: '#E6FBF3', icon: '💰' },
                { label: 'Total Payouts', value: 'KES ' + (data.totalPayouts || 0).toLocaleString(), color: '#EF4444', bg: '#FEF2F2', icon: '📤' },
                { label: 'Net Position', value: 'KES ' + (data.netPosition || 0).toLocaleString(), color: (data.netPosition || 0) >= 0 ? '#00D68F' : '#EF4444', bg: (data.netPosition || 0) >= 0 ? '#E6FBF3' : '#FEF2F2', icon: '⚖️' },
                { label: 'Active Policies', value: (data.activePolicies || 0).toLocaleString(), color: '#4F46E5', bg: '#EEF2FF', icon: '🛡️' },
                { label: 'Total Claims', value: (data.totalClaims || 0).toLocaleString(), color: '#F59E0B', bg: '#FFFBEB', icon: '📋' },
                { label: 'Paid Claims', value: (data.claimBreakdown || []).reduce((acc, cl) => acc + (cl.paid || 0), 0).toLocaleString(), color: '#059669', bg: '#ECFDF5', icon: '✅' },
              ].map(k => (
                <div
                  key={k.label}
                  style={{
                    background: 'var(--surface)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    border: '1px solid var(--border)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: k.color,
                      borderRadius: '12px 12px 0 0'
                    }}
                  />
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: k.bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      marginBottom: 8
                    }}
                  >
                    {k.icon}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 17, color: k.color, lineHeight: 1, marginBottom: 3 }}>
                    {k.value}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500 }}>{k.label}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>📈 Revenue vs Payouts — Last 12 Months</div>
              {(data.monthlyFinancials || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 13 }}>
                  No payment data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.monthlyFinancials || []} barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => (v / 1000).toFixed(0) + 'k'} />
                    <Tooltip formatter={v => 'KES ' + v.toLocaleString()} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#00D68F" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="payouts" name="Payouts" fill="#EF4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>📊 Net Financial Position — 12 Months</div>
              {(data.monthlyFinancials || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 13 }}>
                  No data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={data.monthlyFinancials || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => (v / 1000).toFixed(0) + 'k'} />
                    <Tooltip formatter={v => 'KES ' + v.toLocaleString()} />
                    <Line
                      type="monotone"
                      dataKey="net"
                      name="Net Position"
                      stroke="#4F46E5"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
              <div className="card">
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>📋 Claims by Type</div>
                {(data.claimBreakdown || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 12 }}>No claims yet</div>
                ) : (
                  (data.claimBreakdown || []).map(c => (
                    <div key={c.type} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>
                          {c.type === 'bail' ? '🚔 Bail' : c.type === 'income' ? '💊 Income' : '🕊️ Funeral'} ({c.total})
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                          KES {(c.amount || 0).toLocaleString()} paid
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: 3,
                          height: 6,
                          borderRadius: 3,
                          overflow: 'hidden',
                          background: '#F1F5F9'
                        }}
                      >
                        <div style={{ width: (c.total ? ((c.paid / c.total) * 100) : 0) + '%', background: '#00D68F' }} />
                        <div style={{ width: (c.total ? ((c.pending / c.total) * 100) : 0) + '%', background: '#F59E0B' }} />
                        <div style={{ width: (c.total ? ((c.rejected / c.total) * 100) : 0) + '%', background: '#EF4444' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 10, color: 'var(--muted)' }}>
                        <span>✅ {c.paid} paid</span>
                        <span>⏳ {c.pending} pending</span>
                        <span>❌ {c.rejected} rejected</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="card">
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>📈 Member Growth — 6 Months</div>
                {(data.userGrowth || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, color: 'var(--muted)', fontSize: 12 }}>No growth data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={data.userGrowth || []} barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="riders" name="Riders" fill="#22C55E" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="members" name="Members" fill="#8B5CF6" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        )}

        {!loading && tab === 'admins' && isSuperAdmin && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>🏢 Admin Accounts ({(data.admins || []).length})</div>
              <button
                className="btn btn-sm"
                onClick={() => setShowNewAdmin(true)}
                style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: 'white', border: 'none' }}
              >
                ➕ New Admin
              </button>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    {['Name','Phone','Role','Joined','Status'].map(h => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '8px 12px',
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--muted)',
                          textTransform: 'uppercase',
                          letterSpacing: .6
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data.admins || []).length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>
                        No admin accounts yet
                      </td>
                    </tr>
                  )}

                  {(data.admins || []).map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>{a.fullName}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--muted)' }}>{a.phone}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            background: a.role === 'superadmin' ? 'linear-gradient(135deg,#4F46E5,#7C3AED)' : 'var(--green-light)',
                            color: a.role === 'superadmin' ? 'white' : 'var(--green)',
                            borderRadius: 20,
                            padding: '2px 10px',
                            fontSize: 11,
                            fontWeight: 700
                          }}
                        >
                          {a.role === 'superadmin' ? '⭐ Super Admin' : 'Admin'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: 12 }}>
                        {new Date(a.createdAt).toLocaleDateString('en-KE')}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span className={'status-badge ' + (a.suspended ? 'status-rejected' : 'status-approved')}>
                          {a.suspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      <OnboardReviewModal
        person={reviewPerson}
        onClose={() => setReviewPerson(null)}
        onApprove={handleApprove}
        onReject={handleReject}
        onSuspend={setSuspendPerson}
      />

      <SuspendModal
        user={suspendPerson}
        onClose={() => setSuspendPerson(null)}
        onSuspend={handleSuspend}
      />

      {showNewAgent && (
        <QuickCreateAgent
          onClose={() => setShowNewAgent(false)}
          onDone={() => {
            setShowNewAgent(false);
            load();
          }}
        />
      )}

      {showNewAdmin && (
        <QuickCreateAdmin
          onClose={() => setShowNewAdmin(false)}
          onDone={() => {
            setShowNewAdmin(false);
            load();
          }}
        />
      )}
    </div>
  );
}

const TYPE_META = {
  bail: { icon: '🚔' },
  funeral: { icon: '🕊️' },
  income: { icon: '💊' },
};
