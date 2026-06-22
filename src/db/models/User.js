const mongoose = require('mongoose');

const providerConnectionSchema = new mongoose.Schema({
  providerId:   String,
  accessToken:  String,
  refreshToken: String,
  expiresAt:    Date,
  connectedAt:  { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  githubId:   { type: String, required: true, unique: true },
  username:   { type: String, required: true },
  email:      String,
  avatarUrl:  String,
  accessToken: String,
  teamId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  role:       { type: String, enum: ['admin', 'member', 'viewer'], default: 'admin' },
  connections: {
    github:    providerConnectionSchema,
    gitlab:    providerConnectionSchema,
    bitbucket: providerConnectionSchema
  },
  createdAt:  { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);