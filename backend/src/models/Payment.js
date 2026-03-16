const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  policyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Policy' },

  type:      { type: String, enum: ['mpesa_stk', 'card', 'bank_transfer', 'manual'], default: 'mpesa_stk' },
  status:    { type: String, enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'pending' },

  amount:    { type: Number, required: true },
  phone:     { type: String },
  description: { type: String },

  // M-Pesa specific
  checkoutRequestId: { type: String },
  merchantRequestId: { type: String },
  mpesaReceiptNumber: { type: String },

  // Generic reference
  reference:  { type: String },
  cardLast4:  { type: String },

  initiatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },

}, { timestamps: true });

// ── Auto-reference ─────────────────────────────────────────────────────────────
paymentSchema.pre('save', async function (next) {
  if (this.isNew && !this.reference) {
    const count = await mongoose.model('Payment').countDocuments();
    this.reference = `PAY-${String(count + 1).padStart(7, '0')}`;
  }
  next();
});

paymentSchema.virtual('id').get(function () { return this._id.toHexString(); });
paymentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Payment', paymentSchema);
