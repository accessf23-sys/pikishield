const express = require('express');
const axios   = require('axios');
const router  = express.Router();
const auth    = require('../middleware/auth');
const Payment = require('../models/Payment');
const Policy  = require('../models/Policy');
const User    = require('../models/User');

const SANDBOX = process.env.MPESA_ENV === 'sandbox';
const BASE_URL = SANDBOX
  ? 'https://sandbox.safaricom.co.ke'
  : 'https://api.safaricom.co.ke';

// ── Get OAuth token ──────────────────────────────────────────────────────────
async function getToken() {
  const key    = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  const creds  = Buffer.from(`${key}:${secret}`).toString('base64');
  const res = await axios.get(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${creds}` },
  });
  return res.data.access_token;
}

// ── STK Push ─────────────────────────────────────────────────────────────────
router.post('/mpesa/initiate', auth, async (req, res) => {
  try {
    const { amount, phone, policyId, description } = req.body;
    if (!amount || !phone) return res.status(400).json({ error: 'Amount and phone required' });

    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey   = process.env.MPESA_PASSKEY;
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password  = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    // Normalize phone
    let mpesaPhone = String(phone).replace(/[^0-9]/g, '');
    if (mpesaPhone.startsWith('0')) mpesaPhone = '254' + mpesaPhone.slice(1);
    if (!mpesaPhone.startsWith('254')) mpesaPhone = '254' + mpesaPhone;

    const callbackUrl = process.env.CALLBACK_URL || 'https://pikishield-production.up.railway.app/api/payments/mpesa/callback';

    const token = await getToken();

    const stkRes = await axios.post(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      BusinessShortCode: shortcode,
      Password:          password,
      Timestamp:         timestamp,
      TransactionType:   'CustomerPayBillOnline',
      Amount:            Math.ceil(Number(amount)),
      PartyA:            mpesaPhone,
      PartyB:            shortcode,
      PhoneNumber:       mpesaPhone,
      CallBackURL:       callbackUrl,
      AccountReference:  'PikiShield',
      TransactionDesc:   description || 'PikiShield Premium',
    }, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const checkoutId = stkRes.data.CheckoutRequestID;

    // Save payment record
    const payment = await Payment.create({
      userId:            req.user._id,
      policyId:          policyId || null,
      amount:            Number(amount),
      phone:             mpesaPhone,
      type:              'mpesa_stk',
      status:            'pending',
      checkoutRequestId: checkoutId,
      merchantRequestId: stkRes.data.MerchantRequestID,
      description:       description || 'PikiShield Premium',
      initiatedAt:       new Date(),
    });

    res.json({
      success:           true,
      checkoutRequestId: checkoutId,
      paymentId:         payment._id,
      message:           'STK push sent to your phone',
    });
  } catch (err) {
    console.error('M-Pesa STK error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.errorMessage || 'M-Pesa request failed' });
  }
});

// ── STK Callback ─────────────────────────────────────────────────────────────
router.post('/mpesa/callback', async (req, res) => {
  try {
    const body     = req.body?.Body?.stkCallback;
    const checkId  = body?.CheckoutRequestID;
    const resultCode = body?.ResultCode;

    const payment = await Payment.findOne({ checkoutRequestId: checkId });
    if (!payment) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    if (resultCode === 0) {
      // Success
      const meta = body.CallbackMetadata?.Item || [];
      const get  = (name) => meta.find(i => i.Name === name)?.Value;

      payment.status             = 'completed';
      payment.mpesaReceiptNumber = get('MpesaReceiptNumber');
      payment.completedAt        = new Date();
      await payment.save();

      // Activate policy if linked
      if (payment.policyId) {
        await Policy.findByIdAndUpdate(payment.policyId, { status: 'active', lastPaidAt: new Date() });
      }

      // Credit user tokens (1 token per KES 20)
      const tokens = Math.floor(payment.amount / 20);
      if (tokens > 0) {
        await User.findByIdAndUpdate(payment.userId, { $inc: { tokens } });
      }
    } else {
      payment.status      = 'failed';
      payment.failReason  = body?.ResultDesc || 'Failed';
      await payment.save();
    }

    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('Callback error:', err.message);
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

// ── Check payment status ──────────────────────────────────────────────────────
router.get('/mpesa/status/:paymentId', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Payment history ───────────────────────────────────────────────────────────
router.get('/history', auth, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .sort({ initiatedAt: -1 })
      .limit(50);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin — all payments ──────────────────────────────────────────────────────
router.get('/admin/all', auth, async (req, res) => {
  try {
    if (!['admin','superadmin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    const payments = await Payment.find()
      .populate('userId', 'fullName phone memberNumber')
      .sort({ initiatedAt: -1 })
      .limit(200);
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
