const mongoose = require('mongoose');

const OtpLogSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true
  },
  otp: {
    type: Number,
    required: true
  },
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expiry: {
    type: Date,
    required: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Automatically remove OTP logs after 7 days
OtpLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

module.exports = mongoose.model('OtpLog', OtpLogSchema);
