import React, { useState, useEffect } from 'react';
import { claimsAPI, policiesAPI, documentsAPI } from '../utils/api';
import CameraCapture from '../components/CameraCapture';
import { useAuth } from '../context/AuthContext';
import DocumentUploader from '../components/DocumentUploader';

const s = (v, fb = '') => v == null ? fb : typeof v === 'object' ? fb : String(v) || fb;
const sd = (v) => s(v, '—');

async function dlDoc(id, name) {
  try {
    const token = localStorage.getItem('token');
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

const REQUIRED_DOCS = {
  bail: ['police_abstract', 'national_id'],
  income: ['medical_report', 'national_id'],
  funeral: ['death_certificate', 'burial_permit', 'deceased_id', 'national_id'],
};

// eslint-disable-next-line no-unused-vars
const REQUIRED_DOC_LABELS = {
  bail: ['Police Abstract or Court Charge Sheet (required)', 'National ID Copy (required)'],
  income: ["Doctor's Note with Doctor Name & Hospital (required)", 'X-Ray or Supporting Medical Document (optional)', 'National ID Copy (required)'],
  funeral: ['Death Certificate (required)', 'Burial Permit (required)', "Deceased's National ID (required)", "NOK's National ID (required)"],
};

const NOK_DOC_SLOTS = [
  { docType: 'death_certificate', label: 'Death Certificate (Official)', required: true },
  { docType: 'burial_permit', label: 'Burial Permit', required: true },
  { docType: 'deceased_id', label: "Deceased's National ID Copy", required: true },
  { docType: 'national_id', label: "NOK's National ID Copy", required: true },
];

function NokDocUploader({ slot, onUploaded, uploaded, tempId }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const ref = React.useRef();

  const upload = async (f) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      setError('File too large — max 10MB');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('files', f);
      fd.append('docType', slot.docType);
      fd.append('tempUploadId', tempId);
      const res = await documentsAPI.upload(fd);
      onUploaded(slot.docType, res.data.documents[0]);
    } catch (e) {
      setError(e.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const done = !!uploaded;

  return (
    <div
      style={{
        border: `1.5px ${done ? 'solid' : 'dashed'} ${done ? 'var(--green)' : drag ? 'var(--green)' : 'var(--border)'}`,
        borderRadius: 8,
        padding: '10px 14px',
        background: done ? 'var(--green-light)' : '#FAFAFA',
        transition: 'all .2s',
      }}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files[0]); }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 3 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{slot.label}</span>
            {slot.required && !done && (
              <span style={{ fontSize: 10, background: '#FEF2F2', color: 'var(--red)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                REQUIRED
              </span>
            )}
            {done && (
              <span style={{ fontSize: 10, background: 'var(--green-light)', color: 'var(--green)', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                ✓ DONE
              </span>
            )}
          </div>
          {done ? (
            <div style={{ fontSize: 11, color: 'var(--green)' }}>📄 {uploaded.originalName}</div>
          ) : (
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>JPG, PNG or PDF · drag, browse or take photo</div>
          )}
          {error && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>⚠️ {error}</div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
          <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png,image/*" style={{ display: 'none' }} onChange={e => upload(e.target.files[0])} />
          {done ? (
            <button
              type="button"
              onClick={() => ref.current?.click()}
              disabled={uploading}
              style={{ padding: '5px 10px', borderRadius: 6, border: '1.5px solid var(--border)', background: 'white', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >
              ↺ Replace
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => ref.current?.click()}
                disabled={uploading}
                style={{ padding: '5px 10px', borderRadius: 6, border: '1.5px solid var(--border)', background: 'white', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {uploading ? '⏳' : '📁 Browse'}
              </button>
              <CameraCapture disabled={uploading} color="var(--green)" onCapture={f => upload(f)} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ClaimRow({ claim }) {
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const toggle = async () => {
    if (!open && docs.length === 0) {
      setLoadingDocs(true);
      try {
        const r = await documentsAPI.getForClaim(claim.id);
        setDocs(r.data);
      } catch {}
      setLoadingDocs(false);
    }
    setOpen(o => !o);
  };

  return (
    <>
      <tr style={{ cursor: 'pointer' }} onClick={toggle}>
        <td style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', fontFamily: 'monospace', background: '#F8FAFC', borderRadius: 5, padding: '3px 7px', whiteSpace: 'nowrap', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {s(claim.referenceNumber) || (claim._id || claim.id || '').slice(-8).toUpperCase()}
        </td>
        <td>
          <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>
            {claim.type === 'income' ? 'Stipend' : claim.type === 'bail' ? 'Bail' : 'Funeral'}
          </span>
        </td>
        <td style={{ fontWeight: 700 }}>KES {(claim.amountRequested || claim.amountApproved || claim.amount || 0).toLocaleString()}</td>
        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{s(claim.description)}</td>
        <td style={{ fontSize: 11, color: 'var(--muted)' }}>
          {(() => {
            const d = new Date(claim.submittedAt || claim.createdAt);
            return isNaN(d) ? '—' : d.toLocaleDateString('en-KE');
          })()}
        </td>
        <td>
          {claim.fraudScore != null && claim.fraudScore !== '' && !isNaN(Number(claim.fraudScore)) ? (
            <span
              style={{
                background: Number(claim.fraudScore) < 25 ? '#E6FAF3' : Number(claim.fraudScore) < 50 ? '#FFF8E1' : '#FFF0F0',
                color: Number(claim.fraudScore) < 25 ? '#009A5E' : Number(claim.fraudScore) < 50 ? '#B45309' : '#CC0000',
                padding: '2px 8px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700
              }}
            >
              {Number(claim.fraudScore)}/100
            </span>
          ) : (
            <span style={{ background: '#F1F5F9', color: '#94A3B8', padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
              N/A
            </span>
          )}
        </td>
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className={`status-badge status-${claim.status || ''}`}>{claim.status || ''}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>📎{claim.documents?.length || 0}</span>
          </div>
        </td>
        <td style={{ fontSize: 14, color: 'var(--muted)' }}>{open ? '▲' : '▼'}</td>
      </tr>

      {open && (
        <tr>
          <td colSpan={8} style={{ background: '#F8FAFC', padding: '16px 20px', borderBottom: '2px solid var(--green)' }}>
            {claim.status === 'rejected' && (
              <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 8, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>❌</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#991B1B', marginBottom: 3 }}>
                    Claim Rejected
                    {claim.reviewedAt && (
                      <span style={{ fontWeight: 400, fontSize: 11, color: '#B91C1C', marginLeft: 8 }}>
                        · {new Date(claim.reviewedAt).toLocaleDateString('en-KE')}
                        {claim.reviewedBy ? ` by ${claim.reviewedBy || ''}` : ''}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: '#991B1B', lineHeight: 1.5 }}>
                    <strong>Reason: </strong>
                    {claim.adminNote || 'No reason provided. Contact support@pikishield.co.ke for details.'}
                  </div>
                  <div style={{ fontSize: 11, color: '#B91C1C', marginTop: 6 }}>
                    💡 You may re-submit a new claim with corrected documents if the issue has been resolved.
                  </div>
                </div>
              </div>
            )}

            {claim.status === 'approved' && claim.adminNote && (
              <div style={{ background: 'var(--green-light)', border: '1px solid var(--green-border)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#15803D' }}>
                ✅ <strong>Admin note:</strong> {claim.adminNote || ''}
              </div>
            )}

            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: .5 }}>
              📎 Attached Documents
            </div>

            {loadingDocs && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Loading…</div>}
            {!loadingDocs && docs.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--muted)', background: '#FFFBEB', border: '1px solid #FFE0A0', borderRadius: 6, padding: '8px 12px' }}>
                ⚠️ No documents attached
              </div>
            )}

            {docs.map(d => (
              <div key={d.id || ''} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '7px 10px', background: 'white', border: '1px solid var(--border)', borderRadius: 7, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{d.mimeType?.startsWith('image/') ? '🖼️' : '📄'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{d.originalName || ''}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{d.docLabel || ''}</div>
                </div>
                <button
                  onClick={() => dlDoc(d.id, d.originalName)}
                  style={{ fontSize: 12, background: 'var(--green-light)', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: 'var(--green)', fontWeight: 600 }}
                >
                  ⬇️
                </button>
              </div>
            ))}
          </td>
        </tr>
      )}
    </>
  );
}

export default function ClaimsPage() {
  const { user } = useAuth();
  const isNok = user?.role === 'nok';
  const isMember = user?.role === 'member';
  const isNokOrMember = isNok || isMember;
  const kycApproved = user?.kycStatus === 'approved';
  const canClaim = (user?.role === 'rider' || isNok || isMember) && kycApproved;

  const [claims, setClaims] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState({});
  const [nokDocs, setNokDocs] = useState({});

  const tempIdRef = React.useRef(`claim-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  if (showForm && !tempIdRef.current) tempIdRef.current = `claim-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  if (!showForm) tempIdRef.current = '';
  const tempUploadId = tempIdRef.current;

  const [form, setForm] = useState({
    policyId: '',
    type: 'funeral',
    amount: '',
    description: '',
    doctorName: '',
    hospitalName: '',
    incidentDate: '',
    deceasedMemberName: '',
    relationship: '',
    principalMemberNumber: ''
  });

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const claimsRes = await claimsAPI.getMyClaims();
      setClaims(claimsRes.data || []);

      if (isNokOrMember) {
        setPolicies([]);
        setForm(f => ({ ...f, policyId: '', type: 'funeral' }));
      } else {
        try {
          const policiesRes = await policiesAPI.getMyPolicies();
          const activePolicies = (policiesRes.data || []).filter(x => x.status === 'active');
          setPolicies(activePolicies);
        } catch (err) {
          console.error('Failed to load policies:', err);
          setPolicies([]);
        }
      }
    } catch (err) {
      console.error('Failed to load claims:', err);
      setError(err.response?.data?.error || 'Failed to load claims');
      setClaims([]);
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [isNok, isMember]);

  const selectedPolicy = policies.find(p => p.id === form.policyId);
  // eslint-disable-next-line no-unused-vars
  const claimTypes = selectedPolicy ? Object.keys(selectedPolicy.coverages) : (isNok ? ['funeral'] : []);
  // eslint-disable-next-line no-unused-vars
  const requiredKeys = REQUIRED_DOCS[form.type] || [];
  const totalDocs = Object.values(uploadedDocs).flat().length;

  const nokMissing = NOK_DOC_SLOTS.filter(s => s.required && !nokDocs[s.docType]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isNokOrMember && nokMissing.length > 0) {
      return setError(`Please upload: ${nokMissing.map(s => s.label).join(', ')}`);
    }

    if (form.type === 'income' && !isNok) {
      if (!form.doctorName.trim()) return setError("Please enter the attending doctor's name");
      if (!form.hospitalName.trim()) return setError('Please enter the hospital or clinic name');
    }

    const derivedPolicyId = form.policyId || policies.find(p => p.coverages?.[form.type])?.id;

    if (!isNokOrMember && !derivedPolicyId) {
      return setError('No active policy found for this claim type.');
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await claimsAPI.submit({
        ...form,
        policyId: isNokOrMember ? undefined : derivedPolicyId,
        amount: Number(form.amount),
        doctorName: form.doctorName || undefined,
        hospitalName: form.hospitalName || undefined,
        incidentDate: form.incidentDate || undefined,
        principalMemberNumber: isNok ? form.principalMemberNumber || undefined : undefined,
        deceasedMemberName: isMember ? form.deceasedMemberName || undefined : undefined,
        relationship: form.relationship || undefined,
        documents: Object.values(uploadedDocs).flat().map(d => ({
          id: d.id,
          docType: d.docType,
          originalName: d.originalName
        }))
      });

      const newClaimId = res.data.claim.id;
      if (totalDocs > 0) {
        try {
          await documentsAPI.attach(newClaimId, tempUploadId);
        } catch {}
      }

      setSuccess(res.data.message);
      setShowForm(false);
      setForm({
        policyId: '',
        type: 'funeral',
        amount: '',
        description: '',
        doctorName: '',
        hospitalName: '',
        incidentDate: '',
        deceasedMemberName: '',
        relationship: '',
        principalMemberNumber: ''
      });
      setUploadedDocs({});
      setNokDocs({});
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit claim');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">{isNok ? 'Funeral Claim' : isMember ? 'Household Funeral Claim' : 'Claims'}</h1>
            <p className="page-subtitle">
              {isNok
                ? 'Submit a funeral claim on behalf of the deceased principal rider'
                : isMember
                ? "Claim funeral cover for a deceased household member under the principal rider's policy"
                : 'Submit and track your protection claims'}
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (!kycApproved) return;
              setShowForm(s => !s);
              setError('');
              setSuccess('');
              setUploadedDocs({});
              setNokDocs({});
            }}
            disabled={!kycApproved && !showForm}
            title={!kycApproved ? 'KYC verification required before submitting claims' : ''}
          >
            {showForm ? '✕ Cancel' : '+ Submit Claim'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {success && <div className="alert alert-success">✅ {success}</div>}
        {error && !showForm && <div className="alert alert-error">❌ {error}</div>}

        {showForm && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, marginBottom: 4 }}>New {isNok ? 'Funeral ' : isMember ? 'Household Funeral ' : ''}Claim</h3>
            <p className="text-muted" style={{ fontSize: 12, marginBottom: 20 }}>
              {isNok
                ? 'All 4 documents below are required. This claim is for the deceased principal rider.'
                : isMember
                ? "Claim funeral cover for a deceased household member covered under the principal rider's policy. All 4 documents are required."
                : 'All claims are AI pre-screened. Fraudulent submissions result in permanent suspension.'}
            </p>

            {error && <div className="alert alert-error">❌ {error}</div>}

            <form onSubmit={handleSubmit}>
              {!isNok && (
                <div style={{ marginBottom: 18 }}>
                  <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>What are you claiming for?</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                    {[
                      { type: 'bail', icon: '⚖️', label: 'Bail', sub: 'Traffic arrest bail', max: 20000, color: '#0066FF' },
                      { type: 'income', icon: '🩺', label: 'Stipend', sub: 'Income stipend (injury)', max: 15000, color: '#00C896' },
                      { type: 'funeral', icon: '🕊️', label: 'Funeral', sub: 'Funeral cover', max: 200000, color: '#FF6B35' },
                    ].filter(opt => {
                      if (isMember) return opt.type === 'funeral';
                      return policies.some(p => p.coverages && p.coverages[opt.type] !== undefined) || opt.type === 'funeral';
                    }).map(opt => (
                      <div
                        key={opt.type}
                        onClick={() => setForm(f => ({
                          ...f,
                          type: opt.type,
                          amount: '',
                          policyId: policies.find(p => p.coverages?.[opt.type])?.id || ''
                        }))}
                        style={{
                          border: `2px solid ${form.type === opt.type ? opt.color : 'var(--border)'}`,
                          borderRadius: 10,
                          padding: '12px 14px',
                          cursor: 'pointer',
                          background: form.type === opt.type ? `${opt.color}0D` : 'white',
                          transition: 'all .15s',
                        }}
                      >
                        <div style={{ fontSize: 22, marginBottom: 4 }}>{opt.icon}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: form.type === opt.type ? opt.color : 'var(--text)' }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{opt.sub}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: opt.color, marginTop: 4 }}>Max KES {opt.max.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                  {!isNokOrMember && policies.length === 0 && (
                    <div className="alert alert-warning" style={{ marginTop: 10 }}>⚠️ You need an active policy before submitting a claim.</div>
                  )}
                </div>
              )}

              {!isNok && (
                <div className="form-group">
                  <label className="form-label">
                    Amount Requested (KES)
                    {form.type === 'bail' && ' — Max KES 20,000'}
                    {form.type === 'income' && ' — Max KES 15,000'}
                    {form.type === 'funeral' && ' — Max KES 200,000 (no minimum)'}
                  </label>
                  <input
                    className="form-input"
                    type="number"
                    placeholder="Enter amount"
                    value={form.amount}
                    onChange={e => {
                      const v = Number(e.target.value);
                      const maxes = { bail: 20000, income: 15000, funeral: 200000 };
                      const cap = maxes[form.type] || 200000;
                      if (v > cap) {
                        setError(`Maximum for ${form.type === 'income' ? 'Stipend' : form.type} claim is KES ${cap.toLocaleString()}`);
                        return;
                      }
                      setError('');
                      setForm(f => ({ ...f, amount: e.target.value }));
                    }}
                    required
                    min={0}
                    max={form.type === 'bail' ? 20000 : form.type === 'income' ? 15000 : 200000}
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Description / Statement</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder={
                    isNok
                      ? "Provide deceased's full name, date of death, hospital/mortuary, your relationship to deceased..."
                      : form.type === 'bail'
                      ? 'Incident details, OB number, police station, date of arrest, reason for arrest...'
                      : form.type === 'income'
                      ? 'Describe the injury, how it prevents you from riding...'
                      : 'Deceased name, date of death, hospital/mortuary...'
                  }
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  required
                  minLength={30}
                />
                <p className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>{form.description.length} / 30 characters minimum</p>
              </div>

              {form.type === 'income' && !isNok && (
                <div style={{ background: '#F0FDF4', border: '1px solid var(--green-border)', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 10 }}>🏥 Medical Details (Required for Stipend)</div>
                  <div className="two-col">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Doctor's Full Name *</label>
                      <input className="form-input" placeholder="Dr. John Kamau" value={form.doctorName} onChange={e => setForm(f => ({ ...f, doctorName: e.target.value }))} required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Hospital / Clinic Name *</label>
                      <input className="form-input" placeholder="Kenyatta National Hospital" value={form.hospitalName} onChange={e => setForm(f => ({ ...f, hospitalName: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: 10, marginBottom: 0 }}>
                    <label className="form-label">Date of Incident / Admission</label>
                    <input className="form-input" type="date" value={form.incidentDate} onChange={e => setForm(f => ({ ...f, incidentDate: e.target.value }))} />
                  </div>
                </div>
              )}

              {form.type === 'bail' && !isNok && (
                <div style={{ background: '#EBF2FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 12px', marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1D4ED8', marginBottom: 4 }}>🚔 Required for Bail Claims</div>
                  <div style={{ fontSize: 12, color: '#1E40AF', lineHeight: 1.5 }}>
                    You must attach: <strong>Police Abstract</strong> or <strong>Court Charge Sheet</strong> + your <strong>National ID</strong>.
                    Without these documents your claim cannot be processed.
                  </div>
                </div>
              )}

              {form.type === 'funeral' && !isNok && !isMember && (
                <div style={{ background: '#FDF4FF', border: '1px solid #E9D5FF', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED', marginBottom: 10 }}>🕊️ Deceased Details (Required for Funeral Cover)</div>
                  <div className="two-col">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Full Name of Deceased *</label>
                      <input className="form-input" placeholder="e.g. John Otieno" value={form.deceasedMemberName} onChange={e => setForm(f => ({ ...f, deceasedMemberName: e.target.value }))} required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Your Relationship to Deceased *</label>
                      <select className="form-input" value={form.relationship} onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))} required>
                        <option value="">Select relationship…</option>
                        <option value="spouse">Spouse</option>
                        <option value="child">Child</option>
                        <option value="parent">Parent</option>
                        <option value="sibling">Sibling</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {isNok && (
                <div style={{ background: '#FFF7ED', border: '1.5px solid #F97316', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#C2410C', marginBottom: 10 }}>🔐 Principal Rider Verification (Required)</div>
                  <div className="form-group" style={{ marginBottom: 8 }}>
                    <label className="form-label">Principal Rider's Member Number *</label>
                    <input
                      className="form-input"
                      placeholder="e.g. PS-000001"
                      value={form.principalMemberNumber}
                      onChange={e => setForm(f => ({ ...f, principalMemberNumber: e.target.value.toUpperCase() }))}
                      required
                    />
                    <p style={{ fontSize: 11, color: '#92400E', marginTop: 4, lineHeight: 1.5 }}>
                      Enter the member number of the deceased principal rider exactly as shown on their policy document.
                      This must match your registered principal to proceed.
                    </p>
                  </div>
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#991B1B', lineHeight: 1.6 }}>
                    ⚠️ <strong>Important:</strong> By submitting this claim you confirm the principal rider is deceased.
                    Their account will be <strong>frozen immediately</strong> pending verification and payout.
                    Upon payment the account will be <strong>suspended and scheduled for removal</strong> to prevent fraud.
                    False claims carry legal consequences.
                  </div>
                </div>
              )}

              {isMember && form.type === 'funeral' && (
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1D4ED8', marginBottom: 10 }}>👨‍👩‍👧 Deceased Household Member Details</div>
                  <div className="two-col" style={{ marginBottom: 10 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Full Name of Deceased *</label>
                      <input className="form-input" placeholder="e.g. Mary Otieno" value={form.deceasedMemberName} onChange={e => setForm(f => ({ ...f, deceasedMemberName: e.target.value }))} required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Your Relationship to Deceased *</label>
                      <select className="form-input" value={form.relationship} onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))} required>
                        <option value="">Select relationship…</option>
                        <option value="spouse">Spouse</option>
                        <option value="child">Child</option>
                        <option value="parent">Parent</option>
                        <option value="sibling">Sibling</option>
                        <option value="other">Other household member</option>
                      </select>
                    </div>
                  </div>
                  <p style={{ fontSize: 11, color: '#1E40AF', margin: 0, lineHeight: 1.5 }}>
                    ℹ️ The deceased must be a named dependent on the principal rider&apos;s active policy.
                    If the <strong>rider themselves</strong> has passed, the Next of Kin (NOK) account handles that claim.
                  </p>
                </div>
              )}

              {isNokOrMember ? (
                <div style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--r)', padding: '16px 18px', marginBottom: 18, background: '#FAFBFD' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>📋 Required Documents — all 4 mandatory</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {NOK_DOC_SLOTS.map(slot => (
                      <NokDocUploader
                        key={slot.docType}
                        slot={slot}
                        tempId={tempUploadId}
                        uploaded={nokDocs[slot.docType]}
                        onUploaded={(t, d) => setNokDocs(p => ({ ...p, [t]: d }))}
                      />
                    ))}
                  </div>
                  {nokMissing.length > 0 && (
                    <div className="alert alert-warning" style={{ marginTop: 12, fontSize: 12 }}>
                      ⚠️ Missing: {nokMissing.map(s => s.label).join(', ')}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ border: '1.5px solid var(--border)', borderRadius: 'var(--r)', padding: '16px 18px', marginBottom: 18, background: '#FAFBFD' }}>
                  {form.type ? (
                    <DocumentUploader claimType={form.type} tempUploadId={tempUploadId} onChange={setUploadedDocs} />
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)' }}>
                      <div style={{ fontSize: 26, marginBottom: 6 }}>📎</div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>Select a claim type above to see required documents</div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-lg" disabled={submitting || !canClaim}>
                  {submitting ? '⏳ Submitting...' : `📋 Submit Claim${!isNok && totalDocs > 0 ? ` · ${totalDocs} doc${totalDocs !== 1 ? 's' : ''}` : ''}`}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card">
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 15, marginBottom: 2 }}>Claims History</h3>
            <p className="text-muted" style={{ fontSize: 12 }}>Click any row to view attached documents</p>
          </div>

          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>Loading claims…</div>
          ) : claims.length === 0 ? (
            <div className="empty-state">
              <div className="emoji">📋</div>
              <p>No claims submitted yet</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowForm(true)}>Submit your first claim</button>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Claim ID</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Description</th>
                    <th>Date</th>
                    <th>Fraud</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>{claims.map(c => <ClaimRow key={c.id} claim={c} />)}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}