const express    = require('express');
const router     = express.Router();
const auth       = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;
const multer     = require('multer');
const streamifier = require('streamifier');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const tempStore = {};

function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

router.post('/upload-kyc', auth, upload.array('files', 5), async (req, res) => {
  try {
    const { tempUploadId, docType } = req.body;
    if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' });
    const documents = await Promise.all(req.files.map(async f => {
      const result = await uploadToCloudinary(f.buffer, { folder: 'pikishield/kyc', resource_type: 'auto' });
      return { id: result.public_id, originalName: f.originalname, url: result.secure_url, mimeType: f.mimetype, size: f.size, docType: docType||'general', docLabel: docType||'Document', tempUploadId, userId: null, createdAt: new Date() };
    }));
    if (tempUploadId) { if (!tempStore[tempUploadId]) tempStore[tempUploadId] = []; tempStore[tempUploadId].push(...documents); }
    res.status(201).json({ documents, message: 'Uploaded successfully' });
  } catch (err) { console.error('Upload error:', err); res.status(500).json({ error: err.message || 'Upload failed' }); }
});

router.post('/upload', auth, upload.array('files', 5), async (req, res) => {
  try {
    const { docType, tempUploadId, claimId } = req.body;
    if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' });
    const documents = await Promise.all(req.files.map(async f => {
      const result = await uploadToCloudinary(f.buffer, { folder: 'pikishield/documents', resource_type: 'auto' });
      return { id: result.public_id, originalName: f.originalname, url: result.secure_url, mimeType: f.mimetype, size: f.size, docType: docType||'general', docLabel: docType||'Document', tempUploadId, claimId: claimId||null, userId: req.user._id, createdAt: new Date() };
    }));
    if (tempUploadId) { if (!tempStore[tempUploadId]) tempStore[tempUploadId] = []; tempStore[tempUploadId].push(...documents); }
    res.status(201).json({ documents });
  } catch (err) { console.error('Upload error:', err); res.status(500).json({ error: err.message || 'Upload failed' }); }
});

router.post('/attach-kyc', auth, async (req, res) => {
  try {
    const { tempUploadId, userId } = req.body;
    const docs = tempStore[tempUploadId] || [];
    docs.forEach(d => { d.userId = userId || req.user._id; });
    if (tempUploadId) delete tempStore[tempUploadId];
    res.json({ message: 'Documents attached', count: docs.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/types', auth, async (req, res) => {
  const DOC_TYPES = {
    bail: { police_abstract: { label: 'Police Abstract or Court Charge Sheet', required: true, icon: '📄' }, national_id: { label: 'National ID Copy', required: true, icon: '🪪' } },
    funeral: { death_certificate: { label: 'Death Certificate (Official)', required: true, icon: '📜' }, burial_permit: { label: 'Burial Permit', required: true, icon: '📋' }, deceased_id: { label: "Deceased's National ID Copy", required: true, icon: '🪪' }, nok_id: { label: 'Your National ID Copy', required: true, icon: '🪪' } },
    income: { doctors_note: { label: "Doctor's Note (with doctor name & hospital)", required: true, icon: '🏥' }, national_id: { label: 'National ID Copy', required: true, icon: '🪪' }, xray_or_report: { label: 'X-Ray or Medical Report', required: false, icon: '🩻' } },
  };
  const { claimType } = req.query;
  res.json(claimType ? (DOC_TYPES[claimType] || {}) : DOC_TYPES);
});

router.get('/claim/:claimId', auth, async (req, res) => { res.json(Object.values(tempStore).flat().filter(d => d.claimId === req.params.claimId)); });
router.get('/user/:userId', auth, async (req, res) => { res.json(Object.values(tempStore).flat().filter(d => String(d.userId) === req.params.userId)); });
router.get('/:id/download', auth, async (req, res) => {
  const doc = Object.values(tempStore).flat().find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.redirect(doc.url);
});
router.get('/:id/preview', auth, async (req, res) => {
  const doc = Object.values(tempStore).flat().find(d => d.id === req.params.id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  res.redirect(doc.url);
});

module.exports = router;
