const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const jwt      = require('jsonwebtoken');
const Document = require('../models/Document');
const { auth, roles } = require('../middleware/auth');
const { getJwtSecret } = require('../utils/jwtSecret');
const { uploadLimiter } = require('../middleware/security');

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const ISADMIN = (u) => ['admin', 'superadmin'].includes(u.role);
const safeName = (n = 'file') => String(n).replace(/[^\w.\- ]/g, '_').slice(0, 120);
const fail = (res, e) => { console.error('[documents]', e && e.message); return res.status(500).json({ error: 'Something went wrong. Please try again.' }); };

// Owner, admin, or the agent who registered the owner may access a document
async function canAccess(user, doc) {
  if (ISADMIN(user)) return true;
  if (doc.userId && String(doc.userId) === String(user._id)) return true;
  if (user.role === 'agent' && doc.userId) {
    const User = require('../models/User');
    const owner = await User.findById(doc.userId).select('registeredBy');
    return !!(owner && owner.registeredBy && String(owner.registeredBy) === String(user._id));
  }
  return false;
}

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
  if (allowed.includes(ext) && ALLOWED_MIME.includes(file.mimetype)) cb(null, true);
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
    const decoded = jwt.verify(token, getJwtSecret());
    const User = require('../models/User');
    if (decoded.purpose) return null;
    const u = await User.findById(decoded.id);
    return u && !u.suspended ? u : null;
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
router.post('/upload-kyc', uploadLimiter, upload.array('files', 5), async (req, res) => {
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
  } catch (e) { fail(res, e); }
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
  } catch (e) { fail(res, e); }
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
  } catch (e) { fail(res, e); }
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
  } catch (e) { fail(res, e); }
});

// ── GET /api/documents/claim/:claimId ────────────────────────────────────────
router.get('/claim/:claimId', auth, async (req, res) => {
  try {
    const docs = await Document.find({ claimId: req.params.claimId });
    const allowed = [];
    for (const doc of docs) if (await canAccess(req.user, doc)) allowed.push(doc);
    res.json(allowed);
  } catch (e) { fail(res, e); }
});

// ── GET /api/documents/user/:userId ──────────────────────────────────────────
router.get('/user/:userId', auth, async (req, res) => {
  try {
    // Admin can view any user's docs; user can view own
    if (!ISADMIN(req.user) && String(req.user._id) !== req.params.userId)
      return res.status(403).json({ error: 'Access denied' });
    const docs = await Document.find({ userId: req.params.userId });
    res.json(docs);
  } catch (e) { fail(res, e); }
});

// ── GET /api/documents/:id/preview ───────────────────────────────────────────
router.get('/:id/preview', async (req, res) => {
  try {
    const user = await resolveDocAuth(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const filePath = path.resolve(__dirname, '../../', doc.path);
    if (!filePath.startsWith(UPLOAD_DIR)) return res.status(400).json({ error: 'Invalid file path' });
    if (!(await canAccess(user, doc))) return res.status(403).json({ error: 'Access denied' });
    serveDoc(res, filePath, `inline; filename="${safeName(doc.originalName)}"`);
  } catch (e) { fail(res, e); }
});

// ── GET /api/documents/:id/download ──────────────────────────────────────────
router.get('/:id/download', async (req, res) => {
  try {
    const user = await resolveDocAuth(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const filePath = path.resolve(__dirname, '../../', doc.path);
    if (!filePath.startsWith(UPLOAD_DIR)) return res.status(400).json({ error: 'Invalid file path' });
    if (!(await canAccess(user, doc))) return res.status(403).json({ error: 'Access denied' });
    serveDoc(res, filePath, `attachment; filename="${safeName(doc.originalName)}"`);
  } catch (e) { fail(res, e); }
});

// ── DELETE /api/documents/:id ─────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // Only owner or admin can delete
    if (!ISADMIN(req.user) && String(doc.userId) !== String(req.user._id))
      return res.status(403).json({ error: 'Access denied' });

    // Delete from disk
    const filePath = path.join(__dirname, '../../', doc.path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await doc.deleteOne();

    res.json({ message: 'Document deleted' });
  } catch (e) { fail(res, e); }
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
  } catch (e) { fail(res, e); }
});

module.exports = router;
