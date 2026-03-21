const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── KYC / claim documents ────────────────────────────────────────────────────
const kycStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'pikishield/kyc',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    resource_type:  'auto',
  },
});

// ── Helmet selfies ───────────────────────────────────────────────────────────
const helmetStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:         'pikishield/helmets',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    resource_type:  'image',
    transformation: [{ width: 800, crop: 'limit', quality: 'auto' }],
  },
});

const uploadKyc    = multer({ storage: kycStorage,    limits: { fileSize: 10 * 1024 * 1024 } });
const uploadHelmet = multer({ storage: helmetStorage, limits: { fileSize: 5  * 1024 * 1024 } });

module.exports = { cloudinary, uploadKyc, uploadHelmet };
