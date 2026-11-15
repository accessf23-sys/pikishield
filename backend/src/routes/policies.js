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
  } catch (e) { res.status(500).json({ error: 'Something went wrong. Please try again.' }); }
});

// ── POST /api/policies/subscribe ─────────────────────────────────────────────
// Rider subscribes to a package (SubscribePage)
router.post('/subscribe', auth, roles('rider','member'), async (req, res) => {
  try {
    const { type } = req.body;

    if (typeof type !== 'string' || !PACKAGES[type]) return res.status(400).json({ error: 'Invalid package type' });

    // Non-riders (role "member") can buy funeral cover only
    if (req.user.role === 'member' && type !== 'funeral')
      return res.status(403).json({ error: 'This package is for riders only' });

    // KYC must be approved before subscribing
    if (req.user.kycStatus !== 'approved')
      return res.status(403).json({ error: 'Your KYC must be approved before subscribing' });

    // Household members: at most 3, plain text fields, age 70 or under
    const members = [];
    if (type === 'funeral') {
      const raw = Array.isArray(req.body.members) ? req.body.members : [];
      if (raw.length > 3) return res.status(400).json({ error: 'You can nominate up to 3 household members' });
      for (const m of raw) {
        const name = String((m && m.name) || '').trim().slice(0, 100);
        if (!name) continue;
        const age = parseInt(m.age, 10);
        if (!age || age < 1 || age > 70) return res.status(400).json({ error: 'Each household member must be aged 70 or under' });
        members.push({
          name,
          relation: String(m.relation || '').trim().slice(0, 30),
          age,
          id: String(m.id || '').trim().slice(0, 30)
        });
      }
    }

    // Check for existing active policy of same type
    const existing = await Policy.findOne({ userId: req.user._id, type, status: 'active' });
    if (existing) return res.status(400).json({ error: `You already have an active ${PACKAGES[type].name} policy` });

    const POLICY_NAMES = {
      'bail': 'Bail Bond Cover',
      'bail_income': 'Bail + Income Shield',
      'funeral': 'Funeral Cover',
      'income': 'Income Stipend',
    };
    const policy = await Policy.create({
      userId: req.user._id,
      type,
      name: POLICY_NAMES[type] || 'Protection Cover',
      members,
    });

    res.status(201).json({
      policy,
      message: `You are now enrolled in ${policy.name}. Cover starts today!`,
    });
  } catch (e) { res.status(500).json({ error: 'Something went wrong. Please try again.' }); }
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
  } catch (e) { res.status(500).json({ error: 'Something went wrong. Please try again.' }); }
});
module.exports = router;
