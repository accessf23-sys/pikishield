const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  policyId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Policy' },

  type:      { type: String, enum: ['bail', 'income', 'funeral'], required: true },
  status:    {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'paid'],
    default: 'pending',
  },

  // Amounts
  amountRequested: { type: Number },
  amountApproved:  { type: Number },
  amountPaid:      { type: Number },

  // Narrative
  description:     { type: String, default: '' },
  adminNotes:      { type: String, default: '' },
  rejectionReason: { type: String, default: '' },

  // Payment details
  paymentMethod:   { type: String, default: 'mpesa' },
  mpesaPhone:      { type: String },
  mpesaRef:        { type: String },
  paidAt:          { type: Date },

  // For fraud scoring
  fraudScore:      { type: Number, default: null },

  // Admin who processed
  processedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt:     { type: Date },

  // Temp upload bucket (docs attached pre-submit)
  tempUploadId:    { type: String },
  principalMemberNumber: { type: String },  // NOK claims: verified principal member no.
  deceasedMemberName:    { type: String },  // Member claims: name of deceased household member
  relationship:          { type: String },  // claimant's relationship to deceased

  // Reference number shown to user
  referenceNumber: { type: String },

}, { timestamps: true });

// ── Auto-generate reference number ────────────────────────────────────────────
claimSchema.pre('save', async function (next) {
  if (this.isNew && !this.referenceNumber) {
    const count = await mongoose.model('Claim').countDocuments();
    const year  = new Date().getFullYear();
    this.referenceNumber = `CLM-${year}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

claimSchema.virtual('id').get(function () { return this._id.toHexString(); });
claimSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Claim', claimSchema);
