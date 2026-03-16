const mongoose = require('mongoose');

// ── Package definitions (mirrors PACKAGE_INFO in SubscribePage.js) ────────────
const PACKAGES = {
  bail: {
    name: 'Bail Bond Cover',
    dailyContribution: 20,
    coverages: { bail: 20000 },
  },
  bail_income: {
    name: 'Bail + Income Shield',
    dailyContribution: 40,
    coverages: { bail: 20000, income: 15000 },
  },
  funeral: {
    name: 'Funeral Protection',
    dailyContribution: 15,
    coverages: { funeral: 200000 },
  },
};

const memberSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  relation: { type: String },
  age:      { type: Number, max: 70 },
  id:       { type: String },   // national ID of covered member
}, { _id: true });

const policySchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:        { type: String, enum: ['bail', 'bail_income', 'funeral'], required: true },
  name:        { type: String },
  status:      { type: String, enum: ['active', 'cancelled', 'expired'], default: 'active' },

  dailyContribution: { type: Number },
  coverages:   { type: mongoose.Schema.Types.Mixed, default: {} },

  startDate:      { type: Date, default: Date.now },
  cancelledAt:    { type: Date },

  totalContributed: { type: Number, default: 0 },
  claimsUsed:       { type: Number, default: 0 },

  // Funeral only — covered household members
  members: [memberSchema],

}, { timestamps: true });

// ── Pre-save: fill package defaults ───────────────────────────────────────────
policySchema.pre('save', function (next) {
  if (this.isNew) {
    const pkg = PACKAGES[this.type];
    if (pkg) {
      if (!this.name)              this.name = pkg.name;
      if (!this.dailyContribution) this.dailyContribution = pkg.dailyContribution;
      if (!Object.keys(this.coverages || {}).length) this.coverages = pkg.coverages;
    }
  }
  next();
});

// ── Virtual: id ───────────────────────────────────────────────────────────────
policySchema.virtual('id').get(function () { return this._id.toHexString(); });
policySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Policy', policySchema);
module.exports.PACKAGES = PACKAGES;
