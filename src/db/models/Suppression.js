const mongoose = require('mongoose');

const suppressionSchema = new mongoose.Schema({
  repoFullName: { type: String, required: true },
  file:         { type: String, required: true },
  ruleId:       { type: String, required: true },
  valueHash:    { type: String, required: true }, // hash of the redacted value to match future findings
  reason:       String,
  createdBy:    String,
  createdAt:    { type: Date, default: Date.now }
});

suppressionSchema.index({ repoFullName: 1, file: 1, ruleId: 1, valueHash: 1 }, { unique: true });

module.exports = mongoose.model('Suppression', suppressionSchema);