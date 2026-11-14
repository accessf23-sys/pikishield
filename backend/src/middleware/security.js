const rateLimit = require('express-rate-limit');

const make = (windowMin, max, message) =>
  rateLimit({
    windowMs: windowMin * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message },
  });

// Whole API: generous, stops scraping/flooding
const apiLimiter = make(15, 600, 'Too many requests. Please slow down.');

// Login: brute-force protection
const loginLimiter = make(15, 10, 'Too many login attempts. Try again in 15 minutes.');

// OTP / reset / registration / anonymous uploads
const otpLimiter       = make(15, 5,  'Too many reset attempts. Try again in 15 minutes.');
const registerLimiter  = make(60, 20, 'Too many sign-ups from this network. Try again later.');
const uploadLimiter    = make(15, 30, 'Too many uploads. Try again later.');

// Strip Mongo operator keys ($ and .) from user input (NoSQL injection)
function sanitize(req, res, next) {
  const clean = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const k of Object.keys(obj)) {
      if (k.startsWith('$') || k.includes('.')) { delete obj[k]; continue; }
      clean(obj[k]);
    }
  };
  clean(req.body); clean(req.query); clean(req.params);
  next();
}

module.exports = { apiLimiter, loginLimiter, otpLimiter, registerLimiter, uploadLimiter, sanitize };
