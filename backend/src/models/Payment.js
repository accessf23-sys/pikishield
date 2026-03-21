const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  policyId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Policy', default: null },
  amount:            { type: Number, required: true },
  phone:             { type: String },
  type:              { type: String, enum: ['mpesa_stk', 'cash', 'card'], default: 'mpesa_stk' },
  status:            { type: String, enum: ['pending', 'completed', 'failed', 'cancelled'], default: 'pending' },
  checkoutRequestId: { type: String },
  merchantRequestId: { type: String },
  mpesaReceiptNumber:{ type: String },
  description:       { type: String },
  failReason:        { type: String },
  initiatedAt:       { type: Date, default: Date.now },
  completedAt:       { type: Date },
}, { timestamps: true });

module.exports = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
