const express     = require('express');
const router      = express.Router();
const Claim       = require('../models/Claim');
const Policy      = require('../models/Policy');
const Document    = require('../models/Document');
const Transaction = require('../models/Transaction');
const User        = require('../models/User');
const { auth, roles } = require('../middleware/auth');

// ── Waiting period: 90 days from policy start ──────────────────────────────────
const WAITING_PERIOD_MS = 90 * 24 * 60 * 60 * 1000;

// ── GET /api/claims ───────────────────────────────────────────────────────────
// ?all=1 → admin gets every claim; otherwise rider/nok gets own claims
router.get('/', auth, async (req, res) => {
  try {
    let claims;
    if (req.query.all === '1' && req.user.role === 'admin') {
      claims = await Claim.find()
        .sort({ createdAt: -1 })
        .populate('userId', 'fullName memberNumber phone nokNumber riskScore riskTier')
        .populate('policyId', 'type name');
    } else {
      claims = await Claim.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .populate('policyId', 'type name');
    }
    // Normalise fields so frontend always gets: amount, submittedAt, userName, memberNumber, referenceNumber
    const normalised = claims.map(cl => {
      const obj = cl.toJSON();
      const user = obj.userId;
      const claimIdStr = String(obj._id || '');
      return {
        ...obj,
        referenceNumber: obj.referenceNumber || ('CLM-' + claimIdStr.slice(-6).toUpperCase()),
        amount:      obj.amountApproved || obj.amountRequested || 0,
        submittedAt: obj.createdAt,
        userName:    user?.fullName  || '—',
        userPhone:   user?.phone     || '—',
        memberNumber:user?.memberNumber || user?.nokNumber || '—',
        userId:      user?._id || user || obj.userId,
      };
    });
    res.json(normalised);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/claims/:id ───────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const claim = await Claim.findById(req.params.id)
      .populate('userId', 'fullName memberNumber phone')
      .populate('policyId', 'type name');
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    // Only admin or claim owner can view
    if (req.user.role !== 'admin' && String(claim.userId._id) !== String(req.user._id))
      return res.status(403).json({ error: 'Access denied' });

    res.json(claim);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/claims ──────────────────────────────────────────────────────────
// Rider or NOK submits a claim (ClaimsPage)
router.post('/', auth, async (req, res) => {
  try {
    const { policyId, type, description, amountRequested, mpesaPhone, tempUploadId } = req.body;

    if (!type) return res.status(400).json({ error: 'Claim type is required' });
    // Members registered by agents are pre-verified; riders need full KYC approval
    if (req.user.role !== 'member' && req.user.kycStatus !== 'approved')
      return res.status(403).json({ error: 'KYC must be approved before submitting claims' });

    // Verify policy is active and past waiting period
    if (policyId) {
      const policy = await Policy.findOne({ _id: policyId, userId: req.user._id });
      if (!policy || policy.status !== 'active')
        return res.status(400).json({ error: 'Policy not found or not active' });

      const elapsed = Date.now() - new Date(policy.startDate).getTime();
      if (elapsed < WAITING_PERIOD_MS)
        return res.status(400).json({ error: 'Claims open after 3 months of cover' });
    }

    // ── NOK fraud prevention: verify principal member number ──────────────────
    let principalUser = null;
    if (req.user.role === 'nok') {
      const { principalMemberNumber } = req.body;
      if (!principalMemberNumber) {
        return res.status(400).json({ error: 'Please enter the principal rider\'s member number (PS-XXXXXX) to verify your claim.' });
      }
      // Find the principal and confirm this NOK is linked to them
      principalUser = await User.findOne({ memberNumber: principalMemberNumber.toUpperCase().trim() });
      if (!principalUser) {
        return res.status(400).json({ error: 'Member number not found. Please check and try again.' });
      }
      // Verify NOK is actually linked to this principal
      if (!req.user.nokFor || String(req.user.nokFor) !== String(principalUser._id)) {
        return res.status(403).json({ error: 'This member number does not match your registered principal rider. Contact your agent.' });
      }
      // Ensure principal is not already frozen (duplicate claim guard)
      if (principalUser.frozen) {
        return res.status(400).json({ error: 'A claim is already in progress for this member. Duplicate claims are not allowed.' });
      }
    }

    // Simple fraud score: random for now; real ML model plugs in here
    const fraudScore = Math.floor(Math.random() * 40);

    const claim = await Claim.create({
      userId: req.user._id,
      policyId: policyId || null,
      type, description,
      amountRequested: amountRequested || null,
      mpesaPhone,
      fraudScore,
      tempUploadId,
      principalMemberNumber: req.body.principalMemberNumber || undefined,
      deceasedMemberName:    req.body.deceasedMemberName    || undefined,
      relationship:          req.body.relationship          || undefined,
      status: 'pending',
    });

    // ── Freeze principal's account while NOK claim is under review ─────────────
    if (req.user.role === 'nok' && principalUser) {
      await User.findByIdAndUpdate(principalUser._id, {
        frozen: true,
        frozenAt: new Date(),
        frozenReason: 'NOK claim ' + claim.referenceNumber + ' in progress — account frozen pending verification and payout',
      });
    }

    // Attach documents
    if (tempUploadId) {
      await Document.updateMany({ tempUploadId, claimId: null }, { claimId: claim._id });
    }

    // Notify admins (push notification)
    await User.updateMany(
      { role: 'admin' },
      { $push: { notifications: { message: `📋 New ${type} claim from ${req.user.fullName} — Ref: ${claim.referenceNumber}`, type: 'info' } } }
    );

    res.status(201).json({ claim, message: `Claim submitted — Ref: ${claim.referenceNumber}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /api/claims/:id/status ─────────────────────────────────────────────
// Admin approves / rejects / marks paid (AdminClaimsPage)
router.patch('/:id/status', auth, roles('admin'), async (req, res) => {
  try {
    const { status, amountApproved, rejectionReason, adminNotes, mpesaPhone } = req.body;

    const allowed = ['pending', 'under_review', 'approved', 'rejected', 'paid'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const claim = await Claim.findById(req.params.id);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    claim.status       = status;
    claim.processedBy  = req.user._id;
    claim.processedAt  = new Date();
    if (adminNotes)       claim.adminNotes = adminNotes;
    if (rejectionReason)  claim.rejectionReason = rejectionReason;
    if (amountApproved)   claim.amountApproved = amountApproved;
    if (mpesaPhone)       claim.mpesaPhone = mpesaPhone;

    if (status === 'paid') {
      claim.amountPaid = amountApproved || claim.amountApproved;
      claim.paidAt     = new Date();

      // Record transaction
      await Transaction.create({
        userId: claim.userId, type: 'claim_payout',
        amount: claim.amountPaid,
        description: `Claim payout — ${claim.referenceNumber}`,
        method: 'mpesa',
      });

      // Notify NOK user
      await User.findByIdAndUpdate(claim.userId, {
        $push: { notifications: { message: `💰 Claim ${claim.referenceNumber} paid — KES ${claim.amountPaid?.toLocaleString()}`, type: 'success' } }
      });

      // ── If NOK claim: schedule principal account for deletion (30-day grace) ──
      const nokUser = await User.findById(claim.userId);
      if (nokUser?.role === 'nok' && nokUser.nokFor) {
        const principal = await User.findById(nokUser.nokFor);
        if (principal) {
          // Suspend + mark for deletion after 30 days; admin can override
          await User.findByIdAndUpdate(principal._id, {
            suspended: true,
            suspensionReason: `Principal deceased — NOK claim ${claim.referenceNumber} paid on ${new Date().toLocaleDateString('en-KE')}. Account scheduled for removal.`,
            frozen: true,
            frozenReason: `Payout complete — account pending admin review and deletion`,
          });
          await User.findByIdAndUpdate(claim.userId, {
            $push: { notifications: { message: `ℹ️ Principal member account (${principal.memberNumber}) has been suspended and flagged for admin review and removal.`, type: 'info' } }
          });
        }
      }
    }

    if (status === 'approved') {
      await User.findByIdAndUpdate(claim.userId, {
        $push: { notifications: { message: `✅ Claim ${claim.referenceNumber} approved — payment being processed`, type: 'success' } }
      });
    }

    if (status === 'rejected') {
      await User.findByIdAndUpdate(claim.userId, {
        $push: { notifications: { message: `❌ Claim ${claim.referenceNumber} rejected: ${rejectionReason || 'see admin notes'}`, type: 'error' } }
      });
    }

    await claim.save();
    res.json(claim);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
