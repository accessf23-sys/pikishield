import React, { useState, useRef, useCallback } from 'react';
import { documentsAPI } from '../utils/api';
import Icon from './Icons';

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

const SIZE_LABELS = ['B', 'KB', 'MB'];
function fmtSize(bytes) {
  let b = bytes || 0, i = 0;
  while (b >= 1024 && i < 2) { b /= 1024; i++; }
  return `${b.toFixed(1)} ${SIZE_LABELS[i]}`;
}

// Icon shown for each document type (no emojis)
const DOC_ICON = {
  police_abstract: 'claim', national_id: 'idcard', death_certificate: 'claim', burial_permit: 'list',
  deceased_id: 'idcard', nok_id: 'idcard', doctors_note: 'claim', xray_or_report: 'chart',
};

const iconBtn = (bg, color) => ({
  background: bg, color, border: 'none', borderRadius: 10, width: 32, height: 32,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
});

function DocSlot({ docKey, docMeta, uploaded, uploading, onUpload, onDelete, onPreview, claimId }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();
  const has = uploaded?.length > 0;

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
  const busy = uploading === docKey;

  return (
    <div style={{
      border: `1.5px ${has ? 'solid' : 'dashed'} ${has || dragging ? '#0F7B5C' : '#C9D1E0'}`,
      borderRadius: 14,
      background: dragging ? '#EEF6F2' : has ? '#F4FAF7' : '#FFFFFF',
      transition: 'all 0.2s',
      padding: '12px 14px',
      boxSizing: 'border-box', maxWidth: '100%', minWidth: 0,
    }}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, minWidth: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          background: has ? '#DDEFE7' : '#EEF1F6', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name={has ? 'check' : (DOC_ICON[docKey] || 'claim')} size={20} color={has ? '#0F7B5C' : '#3B4B6B'} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{docMeta.label}</span>
            {docMeta.required && !has && (
              <span style={{ fontSize: 10, background: '#FDECEC', color: '#B42318', padding: '2px 7px', borderRadius: 999, fontWeight: 700 }}>REQUIRED</span>
            )}
            {uploaded?.some(u => u.verified) && (
              <span style={{ fontSize: 10, background: '#E3F3EC', color: '#0F7B5C', padding: '2px 7px', borderRadius: 999, fontWeight: 700 }}>VERIFIED</span>
            )}
          </div>
          {docMeta.hint && !has && (
            <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4, marginBottom: 8 }}>{docMeta.hint}</div>
          )}

          {has && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0' }}>
              {uploaded.map(doc => (
                <div key={doc.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, minWidth: 0,
                  background: '#fff', borderRadius: 10, padding: '6px 8px',
                  border: '1px solid #E3E8F0',
                }}>
                  <Icon name={isImage(doc.mimeType) ? 'image' : 'claim'} size={18} color="#3B4B6B" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.originalName}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{fmtSize(doc.size)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {(isImage(doc.mimeType) || doc.mimeType === 'application/pdf') && (
                      <button type="button" onClick={() => previewDoc(doc)} title="Preview" aria-label="Preview" style={iconBtn('#EEF1F6', '#3B4B6B')}>
                        <Icon name="eye" size={16} />
                      </button>
                    )}
                    <button type="button" onClick={() => downloadDoc(doc)} title="Download" aria-label="Download" style={iconBtn('#E3F3EC', '#0F7B5C')}>
                      <Icon name="download" size={16} />
                    </button>
                    <button type="button" onClick={() => onDelete(doc.id)} title="Remove" aria-label="Remove" style={iconBtn('#FDECEC', '#B42318')}>
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <input ref={inputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp"
              style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
            <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 12.5, fontWeight: 600, padding: '7px 12px',
                borderRadius: 10, border: '1.5px solid #C9D1E0',
                background: 'white', cursor: 'pointer', color: 'var(--text)',
                opacity: busy ? 0.5 : 1,
              }}>
              <Icon name="upload" size={16} />
              {busy ? 'Uploading…' : has ? 'Add another file' : 'Choose file'}
            </button>
            <span style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>PDF, JPG or PNG, max 10MB</span>
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
  }, [doc?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!doc) return null;
  const isImage = doc.mimeType?.startsWith('image/');

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12,
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 14, maxWidth: '94vw', maxHeight: '90vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60vw' }}>{doc.originalName}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{((doc.size||0)/1024).toFixed(0)} KB</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {blobUrl && (
              <button onClick={() => downloadDoc(doc)}
                style={{ background: '#E3F3EC', color: '#0F7B5C', border: 'none', borderRadius: 10, padding: '7px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                Download
              </button>
            )}
            <button onClick={onClose}
              style={{ background: '#FDECEC', border: 'none', borderRadius: 10, padding: '7px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#B42318' }}>
              Close
            </button>
          </div>
        </div>
        <div style={{ overflow: 'auto', flex: 1, maxHeight: 'calc(90vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          {err     && <div style={{ padding: 32, color: 'var(--red)', fontSize: 13 }}>{err}</div>}
          {!blobUrl && !err && <div style={{ padding: 32, color: 'var(--muted)', fontSize: 13 }}>Loading preview…</div>}
          {blobUrl && isImage  && <img src={blobUrl} alt={doc.originalName} style={{ maxWidth: '100%', display: 'block' }} />}
          {blobUrl && !isImage && <iframe src={blobUrl} title={doc.originalName} style={{ width: 'min(86vw, 900px)', height: '78vh', border: 'none', display: 'block' }} />}
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
      police_abstract:  { label: 'Police Abstract or Court Charge Sheet', required: true,  hint: 'Official police report or court charge sheet' },
      national_id:      { label: 'National ID Copy',                       required: true,  hint: 'Clear copy of your national ID' },
    },
    funeral: {
      death_certificate:{ label: 'Death Certificate (Official)',            required: true,  hint: 'Official death certificate from hospital or government' },
      burial_permit:    { label: 'Burial Permit',                           required: true,  hint: 'County government burial permit' },
      deceased_id:      { label: "Deceased's National ID Copy",             required: true,  hint: 'National ID of the deceased' },
      nok_id:           { label: "Your National ID Copy",                   required: true,  hint: 'Your own national ID as next of kin' },
    },
    income: {
      doctors_note:     { label: "Medical Report / Doctor's Note",              required: true,  hint: 'Required for an accident injury. Must show the doctor name and hospital' },
      national_id:      { label: 'National ID Copy',                            required: true,  hint: 'Clear copy of your national ID' },
      xray_or_report:   { label: 'X-Ray or Other Medical Document',             required: false, hint: 'Supporting medical documents (optional but recommended)' },
    },
  };

  React.useEffect(() => {
    if (!claimType) return;
    setDocTypes(FALLBACK_DOC_TYPES[claimType] || {});
  }, [claimType]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [claimId]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div style={{ minWidth: 0, maxWidth: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Supporting Documents</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            {uploadedRequired}/{requiredKeys.length} required documents uploaded
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 80, height: 6, background: '#E3E8F0', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3, background: allRequiredUploaded ? '#0F7B5C' : '#B08A3E',
              width: requiredKeys.length ? `${(uploadedRequired / requiredKeys.length) * 100}%` : '100%',
              transition: 'width 0.4s ease',
            }} />
          </div>
          {allRequiredUploaded && <span style={{ fontSize: 12, color: '#0F7B5C', fontWeight: 700 }}>All required uploaded</span>}
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
            {errors[key] && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{errors[key]}</div>}
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
          Claims without required documents may be delayed or rejected during review.
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
          background: 'white', border: '1.5px solid #E3E8F0', borderRadius: 14,
          cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
        }}>
        <span>Optional supporting documents ({optionals.length})</span>
        <span style={{ fontSize: 14, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>&#9662;</span>
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
              {errors[key] && <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>{errors[key]}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
