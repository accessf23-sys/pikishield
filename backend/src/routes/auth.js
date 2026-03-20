const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const User = require('../models/User');
const { auth } = require('../middleware/auth');

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
    process.env.JWT_SECRET || 'pikishield_local_dev_secret_change_in_production_min_32_chars',
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
    res.status(500).json({ error: e.message });
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
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
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

    const ok = await user.comparePassword(password);

    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user._id);

    res.json({
      token,
      user
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      nationalId,
      county,
      licenseNumber,
      bikeReg,
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

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await User.findOne({ phone });

    if (existing) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    const isFuneralMember = registrationType === 'funeral_member';
    const role = isFuneralMember ? 'member' : 'rider';

    const user = await User.create({
      fullName,
      phone,
      email,
      password,
      nationalId,
      role,
      kycStatus: 'pending',
      tempUploadId,
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
    res.status(500).json({ error: e.message });
  }
});

router.post('/register-nok', auth, async (req, res) => {
  try {
    const { fullName, nationalId, password, tempUploadId } = req.body;
    const phone = normalizePhone(req.body.phone || '');

    if (!fullName || !phone || !password || !nationalId) {
      return res.status(400).json({ error: 'All NOK fields required' });
    }

    const existing = await User.findOne({ phone });

    if (existing) {
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    const nok = await User.create({
      fullName,
      phone,
      nationalId,
      password,
      role: 'nok',
      kycStatus: 'pending',
      nokFor: req.user._id,
      tempUploadId
    });

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
    res.status(500).json({ error: e.message });
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
    res.status(500).json({ error: e.message });
  }
});

router.get('/me', auth, (req, res) => {
  res.json(req.user);
});

router.post('/forgot-password', async (req, res) => {
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

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetOtp = otp;
    user.resetOtpExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const isDev = process.env.NODE_ENV !== 'production';

    res.json({
      message: 'OTP sent',
      ...(isDev ? { demoOtp: otp } : {})
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/verify-otp', async (req, res) => {
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

    if (
      !user ||
      user.resetOtp !== otp ||
      !user.resetOtpExpiry ||
      user.resetOtpExpiry < new Date()
    ) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const resetToken = jwt.sign(
      { id: user._id, purpose: 'reset' },
      process.env.JWT_SECRET || 'pikishield_local_dev_secret_change_in_production_min_32_chars',
      { expiresIn: '15m' }
    );

    res.json({ resetToken });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'pikishield_local_dev_secret_change_in_production_min_32_chars');
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

    user.password = password;
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Current and new password required' });
    if (newPassword.trim().length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const ok = await user.comparePassword(currentPassword);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


router.get('/notifications', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications');
    res.json(user?.notifications || []);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.patch('/notifications/:id/read', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const n = user.notifications.id(req.params.id);
    if (n) n.read = true;
    await user.save();
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.patch('/notifications/read-all', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.notifications.forEach(n => n.read = true);
    await user.save();
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

@

router.post("/admin-reset-password", auth, async (req, res) => {
  try {
    if (!["admin","superadmin"].includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    const { phone, newPassword } = req.body;
    if (!phone || !newPassword) return res.status(400).json({ error: "Phone and newPassword required" });
    const normalizePhone = (p="") => { let s=String(p).replace(/[^0-9]/g,""); if(s.startsWith("0"))s="254"+s.slice(1); else if(!s.startsWith("254"))s="254"+s; return s; };
    const user = await User.findOne({ phone: normalizePhone(phone) });
    if (!user) return res.status(404).json({ error: "User not found" });
    user.password = newPassword;
    user.mustChangePassword = false;
    await user.save();
    res.json({ message: "Password reset for " + user.fullName });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;






