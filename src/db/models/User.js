const mongoose = require('mongoose');

const providerConnectionSchema = new mongoose.Schema({
  providerId:   String,
  accessToken:  String,
  refreshToken: String,
  expiresAt:    Date,
  connectedAt:  { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  githubId:   { type: String, required: true, unique: true }, // primary login identity stays GitHub
  username:   { type: String, required: true },
  email:      String,
  avatarUrl:  String,
  accessToken: String, // kept for backward compatibility — this is the GitHub token
  connections: {
    github:    providerConnectionSchema,
    gitlab:    providerConnectionSchema,
    bitbucket: providerConnectionSchema
  },
  createdAt:  { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);