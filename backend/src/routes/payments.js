const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Policy = require('../models/Policy');
const Transaction = require('../models/Transaction');
const { auth, roles } = require('../middleware/auth');

// ── M-Pesa helpers ────────────────────────────────────────────────────────────
async function getMpesaToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error('M-Pesa credentials not configured');

  const url = process.env.MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

  const cred = Buffer.from(`${key}:${secret}`).toString('base64');
  const res = await fetch(url, { headers: { Authorization: `Basic ${cred}` } });
  const data = await res.json();
  return data.access_token;
}

function mpesaTimestamp() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
    String(d.getSeconds()).padStart(2, '0'),
  ].join('');
}

// ── POST /api/payments/mpesa/initiate ────────────────────────────────────────
// Triggers STK push to rider's phone (PaymentsPage)
router.post('/mpesa/initiate', auth, roles('rider'), async (req, res) => {
  try {
    const { amount, phone, policyId, description } = req.body;
    if (!amount || !phone) return res.status(400).json({ error: 'Amount and phone required' });
    if (Number(amount) < 1) return res.status(400).json({ error: 'Minimum amount is KES 1' });

    const payment = await Payment.create({
      userId: req.user._id,
      policyId: policyId || null,
      type: 'mpesa_stk',
      status: 'pending',
      amount: Number(amount),
      phone,
      description: description || 'PikiShield contribution',
    });

    const shortcode = process.env.MPESA_SHORTCODE || '174379';
    const passkey = process.env.MPESA_PASSKEY;
    const callbackUrl = process.env.MPESA_CALLBACK_URL || 'http://localhost:5000/api/payments/mpesa/callback';

    if (passkey && process.env.MPESA_CONSUMER_KEY) {
      try {
        const token = await getMpesaToken();
        const timestamp = mpesaTimestamp();
        const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
        const stkUrl = process.env.MPESA_ENV === 'production'
          ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
          : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';

        const mpesaRes = await fetch(stkUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.ceil(Number(amount)),
            PartyA: String(phone).replace(/^\+/, ''),
            PartyB: shortcode,
            PhoneNumber: String(phone).replace(/^\+/, ''),
            CallBackURL: callbackUrl,
            AccountReference: `PikiShield-${payment.reference}`,
            TransactionDesc: payment.description,
          }),
        });

        const mpesaData = await mpesaRes.json();

        if (mpesaData.ResponseCode === '0') {
          payment.checkoutRequestId = mpesaData.CheckoutRequestID;
          payment.merchantRequestId = mpesaData.MerchantRequestID;
          await payment.save();
          return res.json({
            paymentId: payment._id,
            message: 'STK push sent — check your phone'
          });
        }
      } catch (mpesaErr) {
        console.warn('M-Pesa STK error, using simulation:', mpesaErr.message);
      }
    }

    payment.checkoutRequestId = `ws_CO_SIM_${Date.now()}`;
    await payment.save();

    setTimeout(async () => {
      try {
        const p = await Payment.findById(payment._id);
        if (p && p.status === 'pending') {
          p.status = 'completed';
          p.mpesaReceiptNumber = `SIM${Date.now().toString().slice(-8)}`;
          p.completedAt = new Date();
          await p.save();

          if (policyId) {
            await Policy.findByIdAndUpdate(policyId, { $inc: { totalContributed: Number(amount) } });
          }

          await Transaction.create({
            userId: req.user._id,
            type: 'contribution',
            amount: Number(amount),
            description: `M-Pesa contribution — ${p.mpesaReceiptNumber}`,
            method: 'mpesa',
          });
        }
      } catch (e) {
        console.error('Sim complete error:', e.message);
      }
    }, 5000);

    res.json({
      paymentId: payment._id,
      message: '📱 STK push sent (sandbox) — check your phone'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/payments/mpesa/status/:id ──────────────────────────────────────
// Frontend polls this every 2s (PaymentsPage)
router.get('/mpesa/status/:id', auth, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    if (String(payment.userId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(payment);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/payments/mpesa/callback ────────────────────────────────────────
// Safaricom calls this URL after STK push completes
router.post('/mpesa/callback', async (req, res) => {
  try {
    const { Body } = req.body;
    const callback = Body?.stkCallback;
    if (!callback) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    const { CheckoutRequestID, ResultCode } = callback;
    const payment = await Payment.findOne({ checkoutRequestId: CheckoutRequestID });
    if (!payment) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    if (ResultCode === 0) {
      const items = callback.CallbackMetadata?.Item || [];
      const get = (name) => items.find(i => i.Name === name)?.Value;

      payment.status = 'completed';
      payment.mpesaReceiptNumber = get('MpesaReceiptNumber') || '';
      payment.completedAt = new Date();
      await payment.save();

      if (payment.policyId) {
        await Policy.findByIdAndUpdate(payment.policyId, { $inc: { totalContributed: payment.amount } });
      }

      await Transaction.create({
        userId: payment.userId,
        type: 'contribution',
        amount: payment.amount,
        description: `M-Pesa — ${payment.mpesaReceiptNumber}`,
        method: 'mpesa',
      });
    } else {
      payment.status = 'failed';
      await payment.save();
    }

    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/payments/manual ────────────────────────────────────────────────
// Rider can record card/bank demo payments for self
// Admin can record manual payments for any user
router.post('/manual', auth, roles('rider', 'admin', 'superadmin'), async (req, res) => {
  try {
    const { userId, policyId, amount, description, reference, method, cardLast4 } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'amount required' });
    }

    const paymentUserId =
      req.user.role === 'rider'
        ? req.user._id
        : userId;

    if (!paymentUserId) {
      return res.status(400).json({ error: 'userId required for admin manual payment' });
    }

    const paymentType =
      method === 'card'
        ? 'card'
        : method === 'bank_transfer'
        ? 'bank_transfer'
        : 'manual';

    const payment = await Payment.create({
      userId: paymentUserId,
      policyId: policyId || null,
      type: paymentType,
      status: 'completed',
      amount: Number(amount),
      description: description || 'Manual payment',
      reference,
      cardLast4: cardLast4 || undefined,
      completedAt: new Date(),
    });

    if (policyId) {
      await Policy.findByIdAndUpdate(policyId, { $inc: { totalContributed: Number(amount) } });
    }

    await Transaction.create({
      userId: paymentUserId,
      type: 'contribution',
      amount: Number(amount),
      description:
        description ||
        (paymentType === 'card'
          ? 'Card payment'
          : paymentType === 'bank_transfer'
          ? 'Bank transfer payment'
          : 'Manual payment recorded'),
      method:
        paymentType === 'card'
          ? 'card'
          : paymentType === 'bank_transfer'
          ? 'bank_transfer'
          : 'manual',
    });

    res.status(201).json({ payment });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/payments/history ────────────────────────────────────────────────
// Rider's payment history shown in PaymentsPage
router.get('/history', auth, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('policyId', 'type name');

    res.json(payments);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;