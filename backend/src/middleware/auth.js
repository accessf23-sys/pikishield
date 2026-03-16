const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ── Verify JWT ────────────────────────────────────────────────────────────────
const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer '))
      return res.status(401).json({ error: 'No token provided' });

    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pikishield_local_dev_secret_change_in_production_min_32_chars');
    const user    = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ error: 'User not found' });
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
