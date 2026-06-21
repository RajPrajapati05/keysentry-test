const mongoose = require('mongoose');

const repoSchema = new mongoose.Schema({
  provider:      { type: String, enum: ['github', 'gitlab', 'bitbucket'], default: 'github' },
  repoFullName:  { type: String, required: true },
  webhookId:     mongoose.Schema.Types.Mixed,
  connectedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  addedAt:       { type: Date, default: Date.now },
  lastScanAt:    Date,
  totalScans:    { type: Number, default: 0 },
  totalFindings: { type: Number, default: 0 }
});

repoSchema.index({ provider: 1, repoFullName: 1 }, { unique: true });

module.exports = mongoose.model('Repo', repoSchema);