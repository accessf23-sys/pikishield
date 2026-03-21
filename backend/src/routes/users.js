const { uploadHelmet } = require('../utils/cloudinary');
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Policy = require('../models/Policy');
const Claim = require('../models/Claim');
const Payment = require('../models/Payment');
const Transaction = require('../models/Transaction');
const { auth, roles } = require('../middleware/auth');

const normalizePhone = (p = '') => {
  let s = String(p).replace(/[^0-9]/g, '');
  if (s.startsWith('0')) s = '254' + s.slice(1);
  else if (s.startsWith('254')) s = s;
  else if (/^[17]/.test(s)) s = '254' + s;
  return s;
};

router.get('/dashboard', auth, roles('rider', 'member'), async (req, res) => {
  try {
    const [policies, claims, payments] = await Promise.all([
      Policy.find({ userId: req.user._id, status: 'active' }),
      Claim.find({ userId: req.user._id }),
      Payment.find({ userId: req.user._id, status: 'completed' })
    ]);

    const totalPayouts = claims
      .filter((c) => c.status === 'paid')
      .reduce((s, c) => s + (c.amountPaid || 0), 0);

    const pendingClaims = claims.filter((c) => c.status === 'pending' || c.status === 'under_review').length;
    const approvedClaims = claims.filter((c) => c.status === 'approved' || c.status === 'paid').length;

    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString('en-KE', { month: 'short' });
      const amount = payments
        .filter((p) => {
          const pd = new Date(p.completedAt || p.initiatedAt);
          return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
        })
        .reduce((s, p) => s + p.amount, 0);

      months.push({ month: label, amount });
    }

    res.json({
      policies,
      totalPayouts,
      pendingClaims,
      approvedClaims,
      monthlyData: months,
      allPolicies: policies
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/admin/dashboard', auth, roles('admin', 'superadmin'), async (req, res) => {
  try {
    const [users, policies, claims, payments] = await Promise.all([
      User.find(),
      Policy.find(),
      Claim.find(),
      Payment.find({ status: 'completed' })
    ]);

    const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);
    const totalPayouts = claims
      .filter((c) => c.status === 'paid')
      .reduce((s, c) => s + (c.amountPaid || 0), 0);

    const netPosition = totalRevenue - totalPayouts;
    const riskDist = { green: 0, yellow: 0, red: 0 };

    users.forEach((u) => {
      if (riskDist[u.riskTier] !== undefined) riskDist[u.riskTier]++;
    });

    const recentClaims = await Claim.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('userId', 'fullName memberNumber phone');

    const monthlyFinancials = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);

      const label = d.toLocaleString('en-KE', { month: 'short', year: '2-digit' });

      const revenue = payments
        .filter((p) => {
          const pd = new Date(p.completedAt || p.initiatedAt);
          return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
        })
        .reduce((s, p) => s + p.amount, 0);

      const payouts = claims
        .filter((c) => {
          if (c.status !== 'paid' || !c.updatedAt) return false;
          const cd = new Date(c.updatedAt);
          return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
        })
        .reduce((s, c) => s + (c.amountPaid || 0), 0);

      monthlyFinancials.push({
        month: label,
        revenue,
        payouts,
        net: revenue - payouts
      });
    }

    const claimBreakdown = ['bail', 'income', 'funeral'].map((type) => ({
      type,
      total: claims.filter((c) => (c.claimType || c.type) === type).length,
      paid: claims.filter((c) => (c.claimType || c.type) === type && c.status === 'paid').length,
      pending: claims.filter(
        (c) => (c.claimType || c.type) === type && ['pending', 'under_review'].includes(c.status)
      ).length,
      rejected: claims.filter((c) => (c.claimType || c.type) === type && c.status === 'rejected').length,
      amount: claims
        .filter((c) => (c.claimType || c.type) === type && c.status === 'paid')
        .reduce((s, c) => s + (c.amountPaid || 0), 0)
    }));

    const userGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);

      const riders = users.filter((u) => {
        const ud = new Date(u.createdAt);
        return u.role === 'rider' && ud.getMonth() === d.getMonth() && ud.getFullYear() === d.getFullYear();
      }).length;

      const members = users.filter((u) => {
        const ud = new Date(u.createdAt);
        return u.role === 'member' && ud.getMonth() === d.getMonth() && ud.getFullYear() === d.getFullYear();
      }).length;

      userGrowth.push({
        month: d.toLocaleString('en-KE', { month: 'short' }),
        riders,
        members
      });
    }

    const admins = users
      .filter((u) => ['admin', 'superadmin'].includes(u.role))
      .map((u) => ({
        id: u._id,
        fullName: u.fullName,
        phone: u.phone,
        role: u.role,
        createdAt: u.createdAt,
        suspended: u.suspended
      }));

    res.json({
      totalUsers: users.filter((u) => u.role === 'rider').length,
      totalMembers: users.filter((u) => u.role === 'member').length,
      totalNOKs: users.filter((u) => u.role === 'nok').length,
      totalAgents: users.filter((u) => u.role === 'agent').length,
      activePolicies: policies.filter((p) => p.status === 'active').length,
      pendingClaims: claims.filter((c) => c.status === 'pending').length,
      pendingOnboards: users.filter(
        (u) => u.kycStatus === 'pending' && !['admin', 'superadmin'].includes(u.role)
      ).length,
      totalClaims: claims.length,
      suspended: users.filter((u) => u.suspended).length,
      totalRevenue,
      totalPayouts,
      netPosition,
      monthlyFinancials,
      claimBreakdown,
      userGrowth,
      riskDistribution: riskDist,
      recentClaims,
      allUsers: users,
      admins
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/agent/dashboard', auth, roles('agent'), async (req, res) => {
  try {
    const registeredUsers = await User.find({ registeredBy: req.user._id });
    const riders = registeredUsers.filter((u) => u.role === 'rider');
    const members = registeredUsers.filter((u) => u.role === 'member');
    const pending = registeredUsers.filter((u) => u.kycStatus === 'pending');

    const activePolicies = await Policy.countDocuments({
      userId: { $in: registeredUsers.map((u) => u._id) },
      status: 'active'
    });

    res.json({
      riders,
      members,
      region: req.user.region,
      stats: {
        totalRiders: riders.length,
        totalMembers: members.length,
        pendingKYC: pending.length,
        activePolicies
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/admin/agents', auth, roles('admin', 'superadmin'), async (req, res) => {
  try {
    const agents = await User.find({ role: 'agent' });

    const agentData = await Promise.all(
      agents.map(async (a) => {
        const registeredIds = await User.find({ registeredBy: a._id }).distinct('_id');
        const registeredUsers = await User.find({ registeredBy: a._id });

        const ridersCount = registeredUsers.filter((u) => u.role === 'rider').length;
        const membersCount = registeredUsers.filter((u) => u.role === 'member').length;
        const pendingKYC = registeredUsers.filter((u) => u.kycStatus === 'pending').length;
        const approvedKYC = registeredUsers.filter((u) => u.kycStatus === 'approved').length;
        const totalOnboarded = ridersCount + membersCount;
        const activePolicies = await Policy.countDocuments({ status: 'active', userId: { $in: registeredIds } });
        const claimsCount = await Claim.countDocuments({ userId: { $in: registeredIds } });
        const kycApprovalRate = totalOnboarded ? Math.round((approvedKYC / totalOnboarded) * 100) : 0;

        return {
          ...a.toJSON(),
          ridersCount,
          membersCount,
          pendingKYC,
          approvedKYC,
          totalOnboarded,
          activePolicies,
          claimsCount,
          enrolled: totalOnboarded,
          kycApprovalRate
        };
      })
    );

    const totals = {
      agents: agents.length,
      total: agentData.reduce((s, a) => s + a.totalOnboarded, 0),
      enrolled: agentData.reduce((s, a) => s + a.totalOnboarded, 0),
      policies: agentData.reduce((s, a) => s + a.activePolicies, 0),
      pendingKYC: agentData.reduce((s, a) => s + a.pendingKYC, 0),
      claims: agentData.reduce((s, a) => s + a.claimsCount, 0)
    };

    res.json({ agents: agentData, totals, allUsers: agentData });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/admin/pending-onboards', auth, roles('admin', 'superadmin'), async (req, res) => {
  try {
    const users = await User.find({
      kycStatus: 'pending',
      role: { $nin: ['admin', 'superadmin'] }
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ pending: users });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/transactions', auth, async (req, res) => {
  try {
    const txns = await Transaction.find({ userId: req.user._id }).sort({ date: -1 }).limit(100);
    res.json(txns);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/tokens/earn', auth, roles('rider'), async (req, res) => {
  try {
    const { action } = req.body;
    const EARN_MAP = {
      helmet_check: 3,
      safety_quiz: 5,
      ev_charging: 4,
      no_claim_month: 10,
      referral: 20
    };

    const tokens = EARN_MAP[action];
    if (!tokens) return res.status(400).json({ error: 'Unknown action' });

    const user = await User.findById(req.user._id);
    const lastTime = user.profile?.lastActions?.[action];

    if (lastTime && Date.now() - new Date(lastTime) < 24 * 60 * 60 * 1000) {
      return res.status(429).json({ error: 'Action on cooldown — try again tomorrow' });
    }

    user.shieldTokens = (user.shieldTokens || 0) + tokens;
    if (!user.profile.lastActions) user.profile.lastActions = {};
    user.profile.lastActions[action] = new Date();
    user.markModified('profile');
    await user.save();

    await Transaction.create({
      userId: user._id,
      type: 'token_earned',
      amount: tokens,
      description: `Earned ${tokens} tokens: ${action.replace(/_/g, ' ')}`,
      method: 'system'
    });

    res.json({
      message: `+${tokens} Shield Tokens earned! Keep it up.`,
      shieldTokens: user.shieldTokens
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/tokens/redeem', auth, roles('rider'), async (req, res) => {
  try {
    const { amount, reward } = req.body;
    const user = await User.findById(req.user._id);

    if ((user.shieldTokens || 0) < amount) {
      return res.status(400).json({ error: 'Insufficient tokens' });
    }

    user.shieldTokens -= amount;
    await user.save();

    await Transaction.create({
      userId: user._id,
      type: 'token_redeemed',
      amount,
      description: `Redeemed ${amount} tokens: ${reward}`,
      method: 'system'
    });

    res.json({
      message: `Redeemed ${amount} tokens for ${reward}`,
      shieldTokens: user.shieldTokens
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/profile', auth, async (req, res) => {
  try {
    const allowed = ['fullName', 'email', 'profile'];
    const update = {};
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    });

    const user = await User.findByIdAndUpdate(req.user._id, { $set: update }, { new: true });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id/approve-kyc', auth, roles('admin', 'superadmin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { kycStatus: 'approved' }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Credit referral tokens to the person who referred this rider
    if (user.referredBy) {
      await User.findByIdAndUpdate(user.referredBy, {
        $inc: { shieldTokens: 30, referralCount: 1 }
      });
    }

    user.notifications.push({
      message: '✅ Your KYC has been approved! You now have full access.',
      type: 'success'
    });
    await user.save();

    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id/reject-kyc', auth, roles('admin', 'superadmin'), async (req, res) => {
  try {
    const { reason } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { kycStatus: 'rejected', kycRejectionReason: reason || '' },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    user.notifications.push({
      message: `❌ KYC rejected: ${reason || 'Please resubmit your documents.'}`,
      type: 'error'
    });
    await user.save();

    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id/suspend', auth, roles('admin', 'superadmin'), async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { suspended: true, suspensionReason: reason || '' },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id/unsuspend', auth, roles('admin', 'superadmin'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { suspended: false, suspensionReason: '' },
      { new: true }
    );

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/admin/create-agent', auth, roles('admin', 'superadmin'), async (req, res) => {
  try {
    const { fullName, email, region, password } = req.body;
    const phone = normalizePhone(req.body.phone || '');

    if (!fullName || !phone) {
      return res.status(400).json({ error: 'Name and phone required' });
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    const tempPass = password || `Agent@${Math.floor(1000 + Math.random() * 9000)}`;

    const agent = await User.create({
      fullName,
      phone,
      email,
      password: tempPass,
      role: 'agent',
      kycStatus: 'approved',
      mustChangePassword: true,
      region: region || ''
    });

    res.status(201).json({ agent, tempPassword: tempPass });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }
    res.status(500).json({ error: e.message });
  }
});

router.post('/admin/create-admin', auth, roles('superadmin'), async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    const phone = normalizePhone(req.body.phone || '');

    if (!fullName || !phone || !password) {
      return res.status(400).json({ error: 'Name, phone and password required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    const admin = await User.create({
      fullName,
      phone,
      email,
      password,
      role: 'admin',
      kycStatus: 'approved'
    });

    res.status(201).json({
      message: `Admin account created for ${admin.fullName}`,
      user: admin
    });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }
    res.status(500).json({ error: e.message });
  }
});
router.post('/helmet-checkin', auth, uploadHelmet.single('photo'), async (req, res) => {
  try {
    const photoUrl = req.file?.path || req.file?.secure_url || '';
    const user = await User.findById(req.user._id);
    if (!user.profile) user.profile = {};
    if (!user.profile.lastActions) user.profile.lastActions = {};
    const last = user.profile.lastActions.helmet_check;
    if (last && (new Date() - new Date(last)) / 36e5 < 24) {
      return res.status(400).json({ error: 'Already checked in today. Come back in 24 hours.' });
    }
    user.profile.lastActions.helmet_check = new Date();
    user.profile.helmetPhotos = user.profile.helmetPhotos || [];
    user.profile.helmetPhotos.push({ url: photoUrl, date: new Date(), verified: false });
    user.shieldTokens = (user.shieldTokens || 0) + 3;
    user.markModified('profile');
    await user.save();
    res.json({ message: '+3 tokens earned! Helmet check recorded.', tokens: user.shieldTokens });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/admin/generate-referral-codes', auth, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
    const riders = await User.find({ role: 'rider', referralCode: { $exists: false } });
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let count = 0;
    for (const rider of riders) {
      let code = 'REF-';
      for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
      rider.referralCode = code;
      await rider.save();
      count++;
    }
    res.json({ message: `Generated codes for ${count} riders` });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;