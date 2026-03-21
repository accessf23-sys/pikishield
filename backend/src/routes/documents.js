const express    = require('express');
const router     = express.Router();
const auth       = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const multer     = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// ── Cloudinary config ─────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Multer + Cloudinary storage ───────────────────────────────────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:          'pikishield/documents',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    resource_type:   'auto',
    public_id:       `doc_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  }),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// In-memory store for temp uploads (keyed by tempUploadId)
const tempStore = {};

// ── Document types per claim type ─────────────────────────────────────────────
const DOC_TYPES = {
  bail: {
    police_abstract: { label: 'Police Abstract or Court Charge Sheet', required: true,  icon: '📄' },
    national_id:     { label: 'National ID Copy',                       required: true,  icon: '🪪' },
  },
  funeral: {
    death_certificate: { label: 'Death Certificate (Official)',          required: true,  icon: '📜' },
    burial_permit:     { label: 'Burial Permit',                         required: true,  icon: '📋' },
    deceased_id:       { label: "Deceased's National ID Copy",           required: true,  icon: '🪪' },
    nok_id:            { label: 'Your National ID Copy',                 required: true,  icon: '🪪' },
  },
  income: {
    doctors_note:    { label: "Doctor's Note (with doctor name & hospital)", required: true,  icon: '🏥' },
    national_id:     { label: 'National ID Copy',                            required: true,  icon: '🪪' },
    xray_or_report:  { label: 'X-Ray or Medical Report',                     required: false, icon: '🩻' },
  },
};

// ── Upload KYC docs (temp store) ──────────────────────────────────────────────
router.post('/upload-kyc', auth, (req, res, next) => upload.array('files', 5)(req, res, next), async (req, res) => {
  try {
    const { tempUploadId, docType } = req.body;
    if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' });

    const documents = req.files.map(f => ({
      id:           f.filename || f.public_id || `doc_${Date.now()}`,
      originalName: f.originalname,
      url:          f.path || f.secure_url,
      mimeType:     f.mimetype,
      size:         f.size,
      docType:      docType || 'general',
      docLabel:     docType || 'Document',
      tempUploadId,
      userId:       null,
      createdAt:    new Date(),
    }));

    // Store in temp
    if (tempUploadId) {
      if (!tempStore[tempUploadId]) tempStore[tempUploadId] = [];
      tempStore[tempUploadId].push(...documents);
    }

    res.status(201).json({ documents, message: 'Uploaded successfully' });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// ── Upload claim docs ─────────────────────────────────────────────────────────
router.post('/upload', auth, (req, res, next) => upload.array('files', 5)(req, res, next), async (req, res) => {
  try {
    const { docType, tempUploadId, claimId } = req.body;
    if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' });

    const documents = req.files.map(f => ({
      id:           f.filename || f.public_id || `doc_${Date.now()}`,
      originalName: f.originalname,
      url:          f.path || f.secure_url,
      mimeType:     f.mimetype,
      size:         f.size,
      docType:      docType || 'general',
      docLabel:     docType || 'Document',
      tempUploadId,
      claimId:      claimId || null,
      userId:       req.user._id,
      createdAt:    new Date(),
    }));

    if (tempUploadId) {
      if (!tempStore[tempUploadId]) tempStore[tempUploadId] = [];
      tempStore[tempUploadId].push(...documents);
    }

    res.status(201).json({ documents });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

// ── Attach KYC docs to user ───────────────────────────────────────────────────
router.post('/attach-kyc', auth, async (req, res) => {
  try {
    const { tempUploadId, userId } = req.body;
    const uid = userId || req.user._id;
    const docs = tempStore[tempUploadId] || [];
    // Mark docs as attached to user
    docs.forEach(d => { d.userId = uid; });
    if (tempUploadId) delete tempStore[tempUploadId];
    res.json({ message: 'Documents attached', count: docs.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get doc types for claim type ──────────────────────────────────────────────
router.get('/types', auth, async (req, res) => {
  try {
    const { claimType } = req.query;
    const types = claimType ? (DOC_TYPES[claimType] || {}) : DOC_TYPES;
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get docs for claim ────────────────────────────────────────────────────────
router.get('/claim/:claimId', auth, async (req, res) => {
  try {
    const docs = Object.values(tempStore)
      .flat()
      .filter(d => d.claimId === req.params.claimId);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get docs for user (KYC review) ───────────────────────────────────────────
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const docs = Object.values(tempStore)
      .flat()
      .filter(d => String(d.userId) === req.params.userId);
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Download/preview doc ──────────────────────────────────────────────────────
router.get('/:id/download', auth, async (req, res) => {
  try {
    const doc = Object.values(tempStore).flat().find(d => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.redirect(doc.url);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/preview', auth, async (req, res) => {
  try {
    const doc = Object.values(tempStore).flat().find(d => d.id === req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.redirect(doc.url);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
