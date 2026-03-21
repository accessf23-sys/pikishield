import React, { useState, useRef, useCallback } from 'react';
import { documentsAPI } from '../utils/api';

async function downloadDoc(doc) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/documents/${doc.id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error('Download failed');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = doc.originalName || 'document';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (e) { alert('Download failed — please try again.'); }
}

async function previewDoc(doc) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/documents/${doc.id}/preview`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error('Preview failed');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } catch (e) { alert('Preview failed — please try again.'); }
}

const MIME_ICONS = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/webp': '🖼️',
};

const SIZE_LABELS = ['B', 'KB', 'MB'];
function fmtSize(bytes) {
  let b = bytes, i = 0;
  while (b >= 1024 && i < 2) { b /= 1024; i++; }
  return `${b.toFixed(1)} ${SIZE_LABELS[i]}`;
}

function DocSlot({ docKey, docMeta, uploaded, uploading, onUpload, onDelete, onPreview, claimId }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleFiles = useCallback(async (files) => {
    if (!files.length) return;
    await onUpload(docKey, Array.from(files));
  }, [docKey, onUpload]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const isImage = (mime) => mime?.startsWith('image/');

  return (
    <div style={{
      border: `2px dashed ${uploaded?.length ? 'var(--green)' : dragging ? 'var(--green)' : 'var(--border)'}`,
      borderRadius: 'var(--r-sm)',
      background: dragging ? 'var(--green-light)' : uploaded?.length ? '#F6FEF9' : 'var(--bg)',
      transition: 'all 0.2s',
      padding: '14px 16px',
    }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{docMeta.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{docMeta.label}</span>
            {docMeta.required && (
              <span style={{ fontSize: 10, background: '#FFF0F0', color: '#CC0000', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>REQUIRED</span>
            )}
            {uploaded?.some(u => u.verified) && (
              <span style={{ fontSize: 10, background: '#E6FAF3', color: '#009A5E', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>✓ VERIFIED</span>
            )}
          </div>

          {uploaded?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              {uploaded.map(doc => (
                <div key={doc.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: 'white', borderRadius: 8, padding: '7px 10px',
                  border: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: 18 }}>{MIME_ICONS[doc.mimeType] || '📎'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.originalName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtSize(doc.size)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {(isImage(doc.mimeType) || doc.mimeType === 'application/pdf') && (
                      <button onClick={() => previewDoc(doc)} title="Preview"
                        style={{ background: '#EEF6FF', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 13 }}>
                        👁️
                      </button>
                    )}
                    <button onClick={() => downloadDoc(doc)} title="Download"
                      style={{ background: '#F0FDF4', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 13 }}>
                      ⬇️
                    </button>
                    <button onClick={() => onDelete(doc.id)} title="Remove"
                      style={{ background: '#FFF0F0', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 13 }}>
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input ref={inputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp"
              style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading === docKey}
              style={{
                fontSize: 12, fontWeight: 600, padding: '5px 12px',
                borderRadius: 6, border: '1.5px solid var(--border)',
                background: 'white', cursor: 'pointer', color: 'var(--text)',
                opacity: uploading === docKey ? 0.5 : 1,
              }}>
              {uploading === docKey ? '⏳ Uploading...' : '📎 Browse files'}
            </button>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>or drag & drop · PDF, JPG, PNG · max 10MB</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ doc, onClose }) {
  const [blobUrl, setBlobUrl] = React.useState(null);
  const [err, setErr]         = React.useState('');

  React.useEffect(() => {
    if (!doc) { setBlobUrl(null); setErr(''); return; }
    const token = localStorage.getItem('token');
    fetch(`/api/documents/${doc.id}/preview`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(r => { if (!r.ok) throw new Error(); return r.blob(); })
      .then(b => setBlobUrl(URL.createObjectURL(b)))
      .catch(() => setErr('Could not load preview.'));
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
  }, [doc?.id]);

  if (!doc) return null;
  const isImage = doc.mimeType?.startsWith('image/');

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 'var(--r)', maxWidth: '90vw', maxHeight: '90vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{doc.originalName}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{((doc.size||0)/1024).toFixed(0)} KB</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {blobUrl && (
              <button onClick={() => downloadDoc(doc)}
                style={{ background: 'var(--bg)', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                ⬇️ Download
              </button>
            )}
            <button onClick={onClose}
              style={{ background: '#FFF0F0', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#CC0000' }}>
              ✕ Close
            </button>
          </div>
        </div>
        <div style={{ overflow: 'auto', flex: 1, maxHeight: 'calc(90vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 320, minHeight: 200 }}>
          {err     && <div style={{ padding: 32, color: 'var(--red)', fontSize: 13 }}>⚠️ {err}</div>}
          {!blobUrl && !err && <div style={{ padding: 32, color: 'var(--muted)', fontSize: 13 }}>Loading preview…</div>}
          {blobUrl && isImage  && <img src={blobUrl} alt={doc.originalName} style={{ maxWidth: '100%', display: 'block' }} />}
          {blobUrl && !isImage && <iframe src={blobUrl} title={doc.originalName} style={{ width: '80vw', height: '80vh', border: 'none', display: 'block' }} />}
        </div>
      </div>
    </div>
  );
}

export default function DocumentUploader({ claimType, claimId, tempUploadId, onChange }) {
  const [docTypes, setDocTypes] = useState(null);
  const [uploadedByType, setUploadedByType] = useState({});
  const [uploading, setUploading] = useState(null);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});

  const FALLBACK_DOC_TYPES = {
    bail: {
      police_abstract:  { label: 'Police Abstract or Court Charge Sheet', required: true,  icon: '📄', hint: 'Official police report or court charge sheet' },
      national_id:      { label: 'National ID Copy',                       required: true,  icon: '🪪', hint: 'Clear copy of your national ID' },
    },
    funeral: {
      death_certificate:{ label: 'Death Certificate (Official)',            required: true,  icon: '📜', hint: 'Official death certificate from hospital or government' },
      burial_permit:    { label: 'Burial Permit',                           required: true,  icon: '📋', hint: 'County government burial permit' },
      deceased_id:      { label: "Deceased's National ID Copy",             required: true,  icon: '🪪', hint: 'National ID of the deceased' },
      nok_id:           { label: "Your National ID Copy",                   required: true,  icon: '🪪', hint: 'Your own national ID as next of kin' },
    },
    income: {
      doctors_note:     { label: "Doctor's Note (with doctor name & hospital)", required: true,  icon: '🏥', hint: 'Official note from a registered doctor' },
      national_id:      { label: 'National ID Copy',                            required: true,  icon: '🪪', hint: 'Clear copy of your national ID' },
      xray_or_report:   { label: 'X-Ray or Medical Report',                     required: false, icon: '🩻', hint: 'Supporting medical documents (optional but recommended)' },
    },
  };

  React.useEffect(() => {
    if (!claimType) return;
    setDocTypes(FALLBACK_DOC_TYPES[claimType] || {});
  }, [claimType]);

  React.useEffect(() => {
    if (!claimId) return;
    documentsAPI.getForClaim(claimId).then(r => {
      const grouped = {};
      r.data.forEach(d => {
        if (!grouped[d.docType]) grouped[d.docType] = [];
        grouped[d.docType].push(d);
      });
      setUploadedByType(grouped);
      if (onChange) onChange(grouped);
    });
  }, [claimId]);

  const handleUpload = async (docKey, files) => {
    setUploading(docKey);
    setErrors(e => ({ ...e, [docKey]: null }));
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      formData.append('docType', docKey);
      if (claimId) formData.append('claimId', claimId);
      if (tempUploadId) formData.append('tempUploadId', tempUploadId);

      const res = await documentsAPI.upload(formData);
      const newDocs = res.data.documents;

      setUploadedByType(prev => {
        const updated = {
          ...prev,
          [docKey]: [...(prev[docKey] || []), ...newDocs],
        };
        if (onChange) onChange(updated);
        return updated;
      });
    } catch (err) {
      // 🔧 FIX: Don't show raw "Invalid or expired token" inside document card
      if (err.response?.status === 401) {
        setErrors(e => ({ ...e, [docKey]: 'Session expired — please refresh the page and log in again' }));
      } else {
        setErrors(e => ({ ...e, [docKey]: err.response?.data?.error || 'Upload failed' }));
      }
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (docId) => {
    try {
      await documentsAPI.delete(docId);
      setUploadedByType(prev => {
        const updated = {};
        Object.entries(prev).forEach(([k, docs]) => {
          updated[k] = docs.filter(d => d.id !== docId);
        });
        if (onChange) onChange(updated);
        return updated;
      });
    } catch (err) {
      alert('Failed to delete document');
    }
  };

  if (!claimType) return null;
  if (!docTypes) return <div style={{ fontSize: 13, color: 'var(--muted)', padding: '12px 0' }}>Loading document requirements...</div>;

  const requiredKeys = Object.entries(docTypes).filter(([, v]) => v.required).map(([k]) => k);
  const uploadedRequired = requiredKeys.filter(k => (uploadedByType[k] || []).length > 0).length;
  const allRequiredUploaded = uploadedRequired === requiredKeys.length;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Supporting Documents</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {uploadedRequired}/{requiredKeys.length} required documents uploaded
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 80, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3, background: allRequiredUploaded ? 'var(--green)' : 'var(--orange)',
              width: requiredKeys.length ? `${(uploadedRequired / requiredKeys.length) * 100}%` : '100%',
              transition: 'width 0.4s ease',
            }} />
          </div>
          {allRequiredUploaded && <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>✓ All required docs uploaded</span>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Object.entries(docTypes).filter(([, v]) => v.required).map(([key, meta]) => (
          <div key={key}>
            <DocSlot
              docKey={key} docMeta={meta}
              uploaded={uploadedByType[key] || []}
              uploading={uploading}
              onUpload={handleUpload} onDelete={handleDelete} onPreview={setPreview}
              claimId={claimId}
            />
            {errors[key] && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>⚠️ {errors[key]}</div>}
          </div>
        ))}
        <OptionalDocs
          docTypes={docTypes} uploadedByType={uploadedByType}
          uploading={uploading} errors={errors}
          onUpload={handleUpload} onDelete={handleDelete} onPreview={setPreview}
        />
      </div>

      {!allRequiredUploaded && (
        <div className="alert alert-warning" style={{ marginTop: 12, fontSize: 12 }}>
          ⚠️ Claims without required documents may be delayed or rejected during review.
        </div>
      )}

      <PreviewModal doc={preview} onClose={() => setPreview(null)} />
    </div>
  );
}

function OptionalDocs({ docTypes, uploadedByType, uploading, errors, onUpload, onDelete, onPreview }) {
  const [open, setOpen] = useState(false);
  const optionals = Object.entries(docTypes).filter(([, v]) => !v.required);
  if (!optionals.length) return null;

  return (
    <div>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', padding: '10px 14px',
          background: 'white', border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)',
          cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--slate)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
        <span>📎 Optional supporting documents ({optionals.length} types)</span>
        <span style={{ fontSize: 16, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
          {optionals.map(([key, meta]) => (
            <div key={key}>
              <DocSlot
                docKey={key} docMeta={meta}
                uploaded={uploadedByType[key] || []}
                uploading={uploading}
                onUpload={onUpload} onDelete={onDelete} onPreview={onPreview}
              />
              {errors[key] && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>⚠️ {errors[key]}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
