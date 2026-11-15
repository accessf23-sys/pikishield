const { sendSMS } = require('../utils/sms');
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const User = require('../models/User');
const { auth } = require('../middleware/auth');
const crypto = require('crypto');
const { getJwtSecret } = require('../utils/jwtSecret');
const { loginLimiter, otpLimiter, registerLimiter } = require('../middleware/security');

const TERMS_VERSION = process.env.TERMS_VERSION || '1.0';
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');
const strongEnough = (p='') => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
const PASSWORD_RULE = 'Password must be at least 8 characters and include a letter and a number';
const serverError = (res, e, where) => { console.error('[auth:' + where + ']', e && e.message); return res.status(500).json({ error: 'Something went wrong. Please try again.' }); };

// -- Auto-create NOK when member registers ------------------------------------
async function autoCreateNok(member, nokName, nokPhone, password) {
  if (!nokName || !nokPhone) return null;
  try {
    const normalizePhone = (p = '') => {
      let s = String(p).replace(/[^0-9]/g, '');
      if (s.startsWith('0')) s = '254' + s.slice(1);
      else if (!s.startsWith('254')) s = '254' + s;
      return s;
    };
    const phone = normalizePhone(nokPhone);
    const existing = await User.findOne({ phone });
    if (existing) return { nok: existing, tempPassword: null };
    const nokPass = password || `Nok@${Math.floor(1000 + Math.random() * 9000)}`;
    const nok = await User.create({
      fullName: nokName,
      phone,
      password: nokPass,
      role: 'nok',
      kycStatus: 'pending',
      nokFor: member._id,
      mustChangePassword: !password,
    });
    return { nok, tempPassword: nokPass };
  } catch (e) {
    console.error('Auto NOK creation failed:', e.message);
    return null;
  }
}


// -- Optional: who is registering this NOK? (route is public, token is optional) --
async function principalFromRequest(req) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return null;
    const decoded = jwt.verify(header.split(' ')[1], getJwtSecret());
    if (decoded.purpose) return null;
    const u = await User.findById(decoded.id).select('fullName memberNumber role');
    return u && (u.role === 'rider' || u.role === 'member') ? u : null;
  } catch (e) { return null; }
}

// -- Text the NOK their number and the principal's number (needed to lodge a claim) --
async function notifyNok(nok, principal) {
  try {
    if (!nok || !nok.phone) return;
    const site = process.env.FRONTEND_URL || 'https://pikishield-eta.vercel.app';
    const msg = `PikiShield: Hello ${nok.fullName}, ${principal ? principal.fullName : 'a PikiShield member'} has registered you as Next of Kin. ` +
      `Your NOK number: ${nok.nokNumber}. ` +
      (principal && principal.memberNumber ? `Principal member number: ${principal.memberNumber}. ` : '') +
      `Keep both numbers safe: you need them to lodge a claim. Log in at ${site}`;
    await sendSMS(nok.phone, msg);
  } catch (e) { console.error('NOK SMS failed:', e && e.message); }
}

const normalizePhone = (value = '') => {
  let s = String(value || '').trim();

  if (!s) return '';

  s = s.replace(/\s+/g, '').replace(/-/g, '');

  if (s.startsWith('+')) s = s.slice(1);

  if (/^0\d+$/.test(s)) {
    return '254' + s.slice(1);
  }

  if (/^254\d+$/.test(s)) {
    return s;
  }

  if (/^[17]\d+$/.test(s)) {
    return '254' + s;
  }

  return s;
};

const signToken = (id) =>
  jwt.sign(
    { id },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

router.get('/setup-status', async (req, res) => {
  try {
    const superadminExists = await User.exists({ role: 'superadmin' });
    const adminExists = await User.exists({ role: { $in: ['admin', 'superadmin'] } });

    res.json({
      setupRequired: !superadminExists,
      adminExists
    });
  } catch (e) {
    serverError(res, e, 'route');
  }
});

router.post('/setup-admin', async (req, res) => {
  try {
    const superadminExists = await User.exists({ role: 'superadmin' });

    if (superadminExists) {
      return res.status(403).json({ error: 'Super Admin already exists' });
    }

    const { fullName, email, password } = req.body;
    const phone = normalizePhone(req.body.phone || '');

    if (!fullName || !phone || !password) {
      return res.status(400).json({ error: 'Name, phone and password required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = await User.create({
      fullName,
      phone,
      email,
      password,
      role: 'superadmin',
      kycStatus: 'approved'
    });

    const token = signToken(user._id);
    res.json({ token, user });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }
    serverError(res, e, 'route');
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const rawPhone = String(req.body.phone || '').trim();
    const rawEmail = String(req.body.email || '').trim().toLowerCase();
    const password = req.body.password;

    if ((!rawPhone && !rawEmail) || !password) {
      return res.status(400).json({ error: 'Phone/email and password required' });
    }

    const normalizedPhone = normalizePhone(rawPhone);
    const upperIdentifier = rawPhone.toUpperCase().trim();

    const or = [];

    if (rawPhone) {
      or.push({ phone: normalizedPhone });
      or.push({ phone: rawPhone });
      or.push({ memberNumber: upperIdentifier });
      or.push({ nokNumber: upperIdentifier });
    }

    if (rawEmail) {
      or.push({ email: rawEmail });
    }

    const user = await User.findOne({ $or: or });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.suspended) {
      return res.status(403).json({ error: 'Account suspended. Contact support.' });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(429).json({ error: 'Account temporarily locked after too many failed attempts. Try again in a few minutes.' });
    }

    const ok = await user.comparePassword(password);

    if (!ok) {
      user.failedLogins = (user.failedLogins || 0) + 1;
      if (user.failedLogins >= MAX_FAILED_LOGINS) {
        user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        user.failedLogins = 0;
      }
      await user.save();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.failedLogins || user.lockUntil) {
      user.failedLogins = 0;
      user.lockUntil = undefined;
      await user.save();
    }

    const token = signToken(user._id);

    res.json({
      token,
      user
    });
  } catch (e) {
    serverError(res, e, 'route');
  }
});

router.post('/register', registerLimiter, async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      nationalId,
      county,
      licenseNumber,
      bikeReg,
      saccoName,
      bikeType,
      isBikeOwner,
      ownerName,
      ownerPhone,
      tempUploadId,
      registrationType,
      nokName,
      nokPhone,
      nokRelationship
    } = req.body;

    const phone = normalizePhone(req.body.phone || '');

    if (!fullName || !phone || !password) {
      return res.status(400).json({ error: 'Name, phone and password required' });
    }

    if (!strongEnough(password)) {
      return res.status(400).json({ error: PASSWORD_RULE });
    }

    if (req.body.acceptedTerms !== true) {
      return res.status(400).json({ error: 'You must accept the Terms and Conditions and Privacy Policy to register' });
    }

    const existing = await User.findOne({ phone });

    if (existing) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    const isFuneralMember = registrationType === 'funeral_member';
    const role = isFuneralMember ? 'member' : 'rider';

    if (!isFuneralMember && !String(saccoName || '').trim()) {
      return res.status(400).json({ error: 'SACCO name is required for riders' });
    }

    const user = await User.create({
      fullName,
      phone,
      email,
      password,
      nationalId,
      role,
      kycStatus: 'pending',
      tempUploadId,
      consent: { termsVersion: TERMS_VERSION, acceptedAt: new Date(), ip: req.ip },
      profile: {
        county,
        ...(isFuneralMember
          ? {
              nokName,
              nokPhone: normalizePhone(nokPhone || ''),
              nokRelationship
            }
          : {
              licenseNumber,
              bikeReg,
              sacco: String(saccoName || '').trim(),
              bikeType: bikeType || 'Petrol',
              isBikeOwner,
              ownerName,
              ownerPhone: normalizePhone(ownerPhone || '')
            })
      }
    });

    if (tempUploadId) {
      const Document = require('../models/Document');
      await Document.updateMany(
        { tempUploadId, userId: null },
        { userId: user._id }
      );
    }

    const token = signToken(user._id);

    // Auto-create NOK for funeral members
    let nokResult = null;
    if (role === 'member' && req.body.nokName && req.body.nokPhone) {
      nokResult = await autoCreateNok(user, req.body.nokName, req.body.nokPhone, null);
    }

    res.status(201).json({
      token,
      user,
      ...(nokResult ? { nok: nokResult.nok, nokTempPassword: nokResult.tempPassword } : {})
    });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }
    serverError(res, e, 'route');
  }
});

// ── FIX: register-nok now handles already-existing NOK gracefully ─────────────
// When a funeral member registers, autoCreateNok() runs automatically on the
// backend and creates the NOK account. Then on Step 4 the frontend calls
// register-nok for the same phone. Instead of erroring, we update the
// existing NOK's password (since the user just chose it) and return success.
router.post('/register-nok', registerLimiter, async (req, res) => {
  try {
    const { fullName, nationalId, password, tempUploadId } = req.body;
    const phone = normalizePhone(req.body.phone || '');

    if (!fullName || !phone || !password) {
      return res.status(400).json({ error: 'All NOK fields required' });
    }

    const principal = await principalFromRequest(req);
    const existing = await User.findOne({ phone });

    if (existing) {
      // NOK was auto-created by autoCreateNok() during member registration.
      // Update their password with the one the user just chose and return success.
      // Security: this route is public, so only a NOK that was auto-created in the
      // last hour and has never been claimed (still on its temp password) may be
      // completed here. Otherwise anyone could overwrite a NOK's password by phone.
      const freshAutoNok =
        existing.role === 'nok' &&
        existing.mustChangePassword === true &&
        Date.now() - new Date(existing.createdAt).getTime() < 60 * 60 * 1000;

      if (freshAutoNok) {
        existing.password = password;
        if (nationalId) existing.nationalId = nationalId;
        existing.mustChangePassword = false;
        if (principal && !existing.nokFor) existing.nokFor = principal._id;
        await existing.save();
        await notifyNok(existing, principal);

        if (tempUploadId) {
          const Document = require('../models/Document');
          await Document.updateMany(
            { tempUploadId, userId: null },
            { userId: existing._id }
          );
        }

        return res.status(200).json({
          nokNumber: existing.nokNumber,
          user: existing,
        });
      }

      // Phone belongs to a non-NOK account — genuine duplicate
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    const nok = await User.create({
      fullName,
      phone,
      nationalId,
      password,
      role: 'nok',
      kycStatus: 'pending',
      ...(principal ? { nokFor: principal._id } : {}),
      tempUploadId
    });
    await notifyNok(nok, principal);

    if (tempUploadId) {
      const Document = require('../models/Document');
      await Document.updateMany(
        { tempUploadId, userId: null },
        { userId: nok._id }
      );
    }

    res.status(201).json({
      nokNumber: nok.nokNumber,
      user: nok
    });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }
    serverError(res, e, 'route');
  }
});

router.post('/register-member', auth, async (req, res) => {
  try {
    const { fullName, nationalId, county, password, tempUploadId } = req.body;
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

    const member = await User.create({
      fullName,
      phone,
      nationalId,
      password,
      role: 'member',
      kycStatus: 'pending',
      mustChangePassword: true,
      registeredBy: req.user._id,
      tempUploadId,
      profile: { county }
    });

    if (tempUploadId) {
      const Document = require('../models/Document');
      await Document.updateMany(
        { tempUploadId, userId: null },
        { userId: member._id }
      );
    }

    // Auto-create NOK
    let nokResult = null;
    if (req.body.nokName && req.body.nokPhone) {
      nokResult = await autoCreateNok(member, req.body.nokName, req.body.nokPhone, null);
    }

    res.status(201).json({
      memberNumber: member.memberNumber,
      user: member,
      tempPassword: password,
      ...(nokResult ? { nok: nokResult.nok, nokNumber: nokResult.nok?.nokNumber, nokTempPassword: nokResult.tempPassword } : {})
    });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }
    serverError(res, e, 'route');
  }
});

router.get('/me', auth, (req, res) => {
  res.json(req.user);
});

router.post('/forgot-password', otpLimiter, async (req, res) => {
  try {
    const rawPhone = req.body.phone || '';
    const rawEmail = String(req.body.email || '').trim().toLowerCase();
    const phone = normalizePhone(rawPhone);

    const user = await User.findOne({
      $or: [
        { phone },
        { email: rawEmail || rawPhone }
      ]
    });

    if (!user) {
      return res.json({
        message: 'If that number is registered, an OTP has been sent.'
      });
    }

    // At most one code a minute per account (stops someone flooding a person's phone with texts)
    if (user.resetOtpExpiry && user.resetOtpExpiry.getTime() - Date.now() > 14 * 60 * 1000) {
      return res.json({ message: 'If that number is registered, an OTP has been sent.' });
    }

    const otp = String(crypto.randomInt(100000, 1000000));

    user.resetOtp = hashOtp(otp);
    user.resetOtpExpiry = new Date(Date.now() + 15 * 60 * 1000);
    user.resetOtpAttempts = 0;
    await user.save();
    await sendSMS(user.phone, `Your PikiShield reset code: ${otp}. Valid 15 mins.`);

    // Until SMS is live you can set ALLOW_DEMO_OTP=true to see the code in the response.
    // Leave it unset in production.
    const demo = process.env.ALLOW_DEMO_OTP === 'true';
    return res.json({
      message: 'If that number is registered, an OTP has been sent.',
      ...(demo ? { otp } : {})
    });
  } catch (e) {
    return serverError(res, e, 'forgot-password');
  }
});

router.post('/verify-otp', otpLimiter, async (req, res) => {
  try {
    const { otp } = req.body;
    const rawPhone = req.body.phone || '';
    const rawEmail = String(req.body.email || '').trim().toLowerCase();
    const phone = normalizePhone(rawPhone);

    const user = await User.findOne({
      $or: [
        { phone },
        { email: rawEmail || rawPhone }
      ]
    });

    if (!user || !user.resetOtp || !user.resetOtpExpiry || user.resetOtpExpiry < new Date() || (user.resetOtpAttempts || 0) >= 5) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    if (user.resetOtp !== hashOtp(otp)) {
      user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const resetToken = jwt.sign(
      { id: user._id, purpose: 'reset' },
      getJwtSecret(),
      { expiresIn: '15m' }
    );

    res.json({ resetToken });
  } catch (e) {
    serverError(res, e, 'route');
  }
});

router.post('/reset-password', otpLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password required' });
    }

    if (!strongEnough(password)) {
      return res.status(400).json({ error: PASSWORD_RULE });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch {
      return res.status(400).json({ error: 'Reset link expired — request a new OTP' });
    }

    if (decoded.purpose !== 'reset') {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // A reset link works once: the code is cleared when the password is changed
    if (!user.resetOtp) {
      return res.status(400).json({ error: 'Reset link expired — request a new OTP' });
    }

    user.password = password;
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    user.resetOtpAttempts = 0;
    user.failedLogins = 0;
    user.lockUntil = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (e) {
    serverError(res, e, 'route');
  }
});


router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required' });
    if (!strongEnough(newPassword)) return res.status(400).json({ error: PASSWORD_RULE });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const ok = await user.comparePassword(currentPassword);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (e) { serverError(res, e, 'route'); }
});


router.get('/notifications', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications');
    res.json(user?.notifications || []);
  } catch(e) { serverError(res, e, 'route'); }
});

router.patch('/notifications/:id/read', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const n = user.notifications.id(req.params.id);
    if (n) n.read = true;
    await user.save();
    res.json({ ok: true });
  } catch(e) { serverError(res, e, 'route'); }
});

router.patch('/notifications/read-all', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.notifications.forEach(n => n.read = true);
    await user.save();
    res.json({ ok: true });
  } catch(e) { serverError(res, e, 'route'); }
});


router.post("/admin-reset-password", auth, async (req, res) => {
  try {
    if (!["admin","superadmin"].includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    const { phone, newPassword } = req.body;
    if (!phone || !newPassword) return res.status(400).json({ error: "Phone and newPassword required" });
    const normalizePhone = (p="") => { let s=String(p).replace(/[^0-9]/g,""); if(s.startsWith("0"))s="254"+s.slice(1); else if(!s.startsWith("254"))s="254"+s; return s; };
    const user = await User.findOne({ phone: normalizePhone(phone) });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!strongEnough(newPassword)) return res.status(400).json({ error: PASSWORD_RULE });
    // Admins can reset customers and agents. Only a super admin can reset an admin, and
    // nobody can reset a super admin this way.
    if (user.role === 'superadmin') return res.status(403).json({ error: "Forbidden" });
    if (user.role === 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ error: "Forbidden" });
    user.password = newPassword;
    user.mustChangePassword = true;
    await user.save();
    res.json({ message: "Password reset for " + user.fullName });
  } catch(e) { serverError(res, e, 'route'); }
});




module.exports = router;
