const mongoose = require('mongoose');

const findingSchema = new mongoose.Schema({
  type:     String,
  value:    String,
  file:     String,
  line:     Number,
  severity: { type: String, enum: ['critical','high','medium','low'], default: 'high' }
});

const scanSchema = new mongoose.Schema({
  repoFullName:  { type: String, required: true },
  commitSha:     { type: String, required: true },
  commitMessage: String,
  pushedBy:      String,
  findings:      [findingSchema],
  findingsCount: { type: Number, default: 0 },
  status:        { type: String, enum: ['pending','scanning','clean','flagged','error'], default: 'pending' },
  alertSent:     { type: Boolean, default: false },
  scannedAt:     { type: Date, default: Date.now }
});

module.exports = mongoose.model('Scan', scanSchema);