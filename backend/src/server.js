require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const path     = require('path');
const cron     = require('node-cron');
const { apiLimiter, sanitize } = require('./middleware/security');
const { getJwtSecret } = require('./utils/jwtSecret');

const authRoutes       = require('./routes/auth');
const userRoutes       = require('./routes/users');
const policyRoutes     = require('./routes/policies');
const claimRoutes      = require('./routes/claims');
const paymentRoutes    = require('./routes/payments');
const documentRoutes   = require('./routes/documents');

getJwtSecret(); // fail fast in production if JWT_SECRET is missing

const app  = express();
const PORT = process.env.PORT || 5000;
app.set('trust proxy', 1);          // Railway sits behind a proxy (correct client IPs for rate limits)
app.disable('x-powered-by');

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use('/api', apiLimiter);

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(sanitize);

// ── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  // Log the path only. The query string can carry a login token (document links).
  app.use(morgan((tokens, req, res) => [
    '[' + tokens.method(req, res) + ']',
    String(req.originalUrl || req.url).split('?')[0],
    tokens.status(req, res),
    tokens['response-time'](req, res) + ' ms'
  ].join(' ')));
}

// ── Static uploads ────────────────────────────────────────────────────────────
// KYC documents are private. They are served only through the authenticated
// /api/documents/:id/preview|download routes. Set SERVE_PUBLIC_UPLOADS=true only
// if you must temporarily restore the old public behaviour.
if (process.env.SERVE_PUBLIC_UPLOADS === 'true') {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/policies',  policyRoutes);
app.use('/api/claims',    claimRoutes);
app.use('/api/payments',  paymentRoutes);
app.use('/api/documents', documentRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
const SERVER_BOOT_TIME = Date.now();
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), bootTime: SERVER_BOOT_TIME });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  const status = err.status || 500;
  const safe = status < 500 || process.env.NODE_ENV !== 'production';
  res.status(status).json({ error: safe ? (err.message || 'Request failed') : 'Something went wrong. Please try again.' });
});

// ── Database ──────────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pikishield')
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => console.log(`🚀 PikiShield API running on port ${PORT}`));

    // Cron: delete orphaned temp uploads older than 24h
    cron.schedule('0 2 * * *', async () => {
      try {
        const Document = require('./models/Document');
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const deleted = await Document.deleteMany({ userId: null, createdAt: { $lt: cutoff } });
        if (deleted.deletedCount) console.log(`🗑️  Cron: removed ${deleted.deletedCount} orphaned docs`);
      } catch (e) { console.error('Cron error:', e.message); }
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
