// Single source of truth for the JWT secret. No hardcoded fallback in production.
const DEV_FALLBACK = 'pikishield_local_dev_secret_change_in_production_min_32_chars';

function getJwtSecret() {
  const s = process.env.JWT_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set (32+ characters) in production');
  }
  return s || DEV_FALLBACK;
}

module.exports = { getJwtSecret };
