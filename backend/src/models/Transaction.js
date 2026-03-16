const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:        {
    type: String,
    enum: ['claim_payout', 'token_earned', 'token_redeemed', 'contribution'],
    required: true,
  },
  amount:      { type: Number, required: true },
  description: { type: String },
  method:      { type: String, default: 'system' },
  date:        { type: Date, default: Date.now },
  metadata:    { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

transactionSchema.virtual('id').get(function () { return this._id.toHexString(); });
transactionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Transaction', transactionSchema);
