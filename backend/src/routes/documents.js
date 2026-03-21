const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const jwt      = require('jsonwebtoken');
const Document = require('../models/Document');
const { auth, roles } = require('../middleware/auth');

// ── Upload directory ──────────────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ── Multer config ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, safe);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only PDF, JPG and PNG files are allowed'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024 },
});

// ── Serve document with token check (for preview & download) ──────────────────
function serveDoc(res, filePath, disposition) {
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });
  res.setHeader('Content-Disposition', disposition);
  res.sendFile(path.resolve(filePath));
}

async function resolveDocAuth(req) {
  // Supports ?token=JWT query param as well as Authorization header
  const token = req.query.token || (req.headers.authorization || '').split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pikishield_dev_secret');
    const User = require('../models/User');
    return await User.findById(decoded.id);
  } catch { return null; }
}

// ── GET /api/documents/types ─────────────────────────────────────────────────
// Returns required doc types for a claim type
const DOC_TYPES = {
  bail:    ['police_abstract', 'national_id'],
  income:  ['medical_report', 'national_id'],
  funeral: ['death_certificate', 'burial_permit', 'deceased_id', 'national_id'],
  kyc:     ['national_id', 'riders_license', 'insurance_cert'],
};
router.get('/types', (req, res) => {
  const { claimType } = req.query;
  res.json(claimType ? (DOC_TYPES[claimType] || []) : DOC_TYPES);
});

// ── POST /api/documents/upload-kyc ────────────────────────────────────────────
// Pre-auth KYC upload (RegisterPage, AgentDashboard, SubscribePage NOK)
// No auth required — uses tempUploadId to associate docs before user exists
router.post('/upload-kyc', upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });
    const { docType, tempUploadId } = req.body;

    const documents = await Promise.all(req.files.map(f =>
      Document.create({
        userId:      null,
        tempUploadId: tempUploadId || null,
        docType:     docType || 'national_id',
        originalName: f.originalname,
        filename:    f.filename,
        mimetype:    f.mimetype,
        size:        f.size,
        path:        `uploads/${f.filename}`,
      })
    ));

    res.status(201).json({ documents });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/documents/attach-kyc ───────────────────────────────────────────
// After registration completes, attach orphaned docs to the new user
router.post('/attach-kyc', auth, async (req, res) => {
  try {
    const { tempUploadId } = req.body;
    if (!tempUploadId) return res.status(400).json({ error: 'tempUploadId required' });

    const result = await Document.updateMany(
      { tempUploadId, userId: null },
      { $set: { userId: req.user._id } }
    );
    res.json({ attached: result.modifiedCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/documents/upload ────────────────────────────────────────────────
// Authenticated upload for claim documents (ClaimsPage, SubscribePage NOK)
router.post('/upload', auth, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });
    const { docType, tempUploadId } = req.body;

    const documents = await Promise.all(req.files.map(f =>
      Document.create({
        userId:      req.user._id,
        tempUploadId: tempUploadId || null,
        docType:     docType || 'other',
        originalName: f.originalname,
        filename:    f.filename,
        mimetype:    f.mimetype,
        size:        f.size,
        path:        `uploads/${f.filename}`,
      })
    ));

    res.status(201).json({ documents });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/documents/attach ───────────────────────────────────────────────
// Attach temp claim docs to a real claim after submission
router.post('/attach', auth, async (req, res) => {
  try {
    const { claimId, tempUploadId } = req.body;
    if (!claimId || !tempUploadId) return res.status(400).json({ error: 'claimId and tempUploadId required' });

    const result = await Document.updateMany(
      { tempUploadId, userId: req.user._id },
      { $set: { claimId } }
    );
    res.json({ attached: result.modifiedCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/documents/claim/:claimId ────────────────────────────────────────
router.get('/claim/:claimId', auth, async (req, res) => {
  try {
    const docs = await Document.find({ claimId: req.params.claimId });
    res.json(docs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/documents/user/:userId ──────────────────────────────────────────
router.get('/user/:userId', auth, async (req, res) => {
  try {
    // Admin can view any user's docs; user can view own
    if (!['admin','superadmin'].includes(req.user.role) && String(req.user._id) !== req.params.userId)
      return res.status(403).json({ error: 'Access denied' });
    const docs = await Document.find({ userId: req.params.userId });
    res.json(docs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/documents/:id/preview ───────────────────────────────────────────
router.get('/:id/preview', async (req, res) => {
  try {
    const user = await resolveDocAuth(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const filePath = path.join(__dirname, '../../', doc.path);
    serveDoc(res, filePath, `inline; filename="${doc.originalName}"`);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/documents/:id/download ──────────────────────────────────────────
router.get('/:id/download', async (req, res) => {
  try {
    const user = await resolveDocAuth(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const filePath = path.join(__dirname, '../../', doc.path);
    serveDoc(res, filePath, `attachment; filename="${doc.originalName}"`);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/documents/:id ─────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Only owner or admin can delete
    if (!['admin','superadmin'].includes(req.user.role) && String(doc.userId) !== String(req.user._id))
      return res.status(403).json({ error: 'Access denied' });

    // Delete from disk
    const filePath = path.join(__dirname, '../../', doc.path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await doc.deleteOne();

    res.json({ message: 'Document deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /api/documents/:id/verify ──────────────────────────────────────────
router.patch('/:id/verify', auth, roles('admin','superadmin'), async (req, res) => {
  try {
    const doc = await Document.findByIdAndUpdate(
      req.params.id,
      { verified: true, verifiedBy: req.user._id, verifiedAt: new Date() },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
