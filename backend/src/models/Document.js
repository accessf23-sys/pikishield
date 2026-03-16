const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  // Owner — null until attached to a real user
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  claimId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Claim', default: null },

  // Pre-auth upload bucket
  tempUploadId: { type: String, default: null },

  // File metadata
  docType:      { type: String },   // national_id, riders_license, police_abstract, etc.
  originalName: { type: String },
  filename:     { type: String },   // stored name on disk
  mimetype:     { type: String },
  size:         { type: Number },   // bytes
  path:         { type: String },   // relative path from uploads/

  // Verification
  verified:     { type: Boolean, default: false },
  verifiedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt:   { type: Date },

}, { timestamps: true });

documentSchema.virtual('id').get(function () { return this._id.toHexString(); });
documentSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Document', documentSchema);
