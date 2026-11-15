const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret } = require('../utils/jwtSecret');

// ── Verify JWT ────────────────────────────────────────────────────────────────
const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer '))
      return res.status(401).json({ error: 'No token provided' });

    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret());

    // Password-reset tokens must never work as login tokens
    if (decoded.purpose) return res.status(401).json({ error: 'Invalid or expired token' });

    const user = await User.findById(decoded.id).select('-password -resetOtp -resetOtpExpiry');
    if (!user) return res.status(401).json({ error: 'User not found' });
    // A password change or reset ends every older login
    if (user.passwordChangedAt && decoded.iat && decoded.iat * 1000 < user.passwordChangedAt.getTime() - 1000)
      return res.status(401).json({ error: 'Invalid or expired token' });
    if (user.suspended) return res.status(403).json({ error: 'Account suspended. Contact support.' });

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ── Role guard ────────────────────────────────────────────────────────────────
const roles = (...allowed) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!allowed.includes(req.user.role))
    return res.status(403).json({ error: 'Access denied — insufficient permissions' });
  next();
};

module.exports = { auth, roles };
