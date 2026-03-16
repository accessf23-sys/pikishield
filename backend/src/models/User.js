const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true, sparse: true },
    password: { type: String, required: true },

    role: {
      type: String,
      enum: ['rider', 'member', 'nok', 'agent', 'admin', 'superadmin'],
      default: 'rider'
    },

    nationalId: { type: String, trim: true },
    memberNumber: { type: String, trim: true },
    nokNumber: { type: String, trim: true },
    agentCode: { type: String, trim: true },

    kycStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },

    kycRejectionReason: { type: String, default: '' },
    mustChangePassword: { type: Boolean, default: false },

    registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    nokFor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    suspended: { type: Boolean, default: false },
    suspensionReason: { type: String, default: '' },

    frozen: { type: Boolean, default: false },
    frozenReason: { type: String, default: '' },
    frozenAt: { type: Date, default: null },

    riskScore: { type: Number, default: 0 },
    riskTier: {
      type: String,
      enum: ['green', 'yellow', 'red'],
      default: 'green'
    },

    shieldTokens: { type: Number, default: 0 },

    profile: { type: Object, default: {} },
    notifications: { type: Array, default: [] },

    tempUploadId: { type: String, default: '' },

    resetOtp: { type: String, default: undefined },
    resetOtpExpiry: { type: Date, default: undefined }
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

userSchema.pre('save', async function (next) {
  if (this.role === 'member' && !this.memberNumber) {
    this.memberNumber = 'PS-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  if (this.role === 'nok' && !this.nokNumber) {
    this.nokNumber = 'NOK-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  if (this.role === 'agent' && !this.agentCode) {
    this.agentCode = 'AGT-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  next();
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
