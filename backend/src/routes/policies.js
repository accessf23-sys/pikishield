const express = require('express');
const router  = express.Router();
const Policy  = require('../models/Policy');
const { PACKAGES } = require('../models/Policy');
const { auth, roles } = require('../middleware/auth');

// ── GET /api/policies/packages ────────────────────────────────────────────────
// Returns the package catalogue shown on SubscribePage
router.get('/packages', (req, res) => {
  res.json(PACKAGES);
});

// ── GET /api/policies ─────────────────────────────────────────────────────────
// Returns the logged-in rider's own policies
router.get('/', auth, async (req, res) => {
  try {
    const policies = await Policy.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(policies);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/policies/subscribe ─────────────────────────────────────────────
// Rider subscribes to a package (SubscribePage)
router.post('/subscribe', auth, roles('rider','member'), async (req, res) => {
  try {
    const { type, members } = req.body;

    if (!PACKAGES[type]) return res.status(400).json({ error: 'Invalid package type' });

    // KYC must be approved before subscribing
    if (req.user.kycStatus !== 'approved')
      return res.status(403).json({ error: 'Your KYC must be approved before subscribing' });

    // Check for existing active policy of same type
    const existing = await Policy.findOne({ userId: req.user._id, type, status: 'active' });
    if (existing) return res.status(400).json({ error: `You already have an active ${PACKAGES[type].name} policy` });

    const policy = await Policy.create({
      userId: req.user._id,
      type,
      members: type === 'funeral' ? (members || []) : [],
    });

    res.status(201).json({
      policy,
      message: `✅ You are now enrolled in ${policy.name}. Cover starts today!`,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/policies/:id ──────────────────────────────────────────────────
// Rider cancels a policy (PoliciesPage)
router.delete('/:id', auth, async (req, res) => {
  try {
    const policy = await Policy.findOne({ _id: req.params.id, userId: req.user._id });
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    if (policy.status === 'cancelled') return res.status(400).json({ error: 'Policy already cancelled' });

    policy.status      = 'cancelled';
    policy.cancelledAt = new Date();
    await policy.save();

    res.json({ message: 'Policy cancelled successfully', policy });
  } catch (e) { res.status(500).json({ error: e.message }); }
});
module.exports = router;
