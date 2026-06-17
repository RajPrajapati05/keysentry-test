const mongoose = require('mongoose');

const repoSchema = new mongoose.Schema({
  repoFullName:  { type: String, required: true, unique: true },
  webhookId:     Number,
  addedAt:       { type: Date, default: Date.now },
  lastScanAt:    Date,
  totalScans:    { type: Number, default: 0 },
  totalFindings: { type: Number, default: 0 }
});

module.exports = mongoose.model('Repo', repoSchema);