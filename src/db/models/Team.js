const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role:      { type: String, enum: ['admin', 'member', 'viewer'], default: 'member' },
  joinedAt:  { type: Date, default: Date.now }
}, { _id: false });

const inviteSchema = new mongoose.Schema({
  email:     { type: String, required: true },
  role:      { type: String, enum: ['admin', 'member', 'viewer'], default: 'member' },
  token:     { type: String, required: true },
  expiresAt: { type: Date, required: true },
  accepted:  { type: Boolean, default: false }
}, { _id: false });

const teamSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  ownerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members:   [memberSchema],
  invites:   [inviteSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Team', teamSchema);