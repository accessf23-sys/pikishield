require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const path     = require('path');
const cron     = require('node-cron');

const authRoutes       = require('./routes/auth');
const userRoutes       = require('./routes/users');
const policyRoutes     = require('./routes/policies');
const claimRoutes      = require('./routes/claims');
const paymentRoutes    = require('./routes/payments');
const documentRoutes   = require('./routes/documents');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging ───────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('[:method] :url :status :response-time ms'));
}

// ── Static uploads ────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    env: process.env.NODE_ENV,
    bootTime: SERVER_BOOT_TIME,
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.url}` });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
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
