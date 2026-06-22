const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:       { type: String, required: true },
  keyHash:    { type: String, required: true, unique: true },
  keyPrefix:  { type: String, required: true },
  lastUsedAt: Date,
  createdAt:  { type: Date, default: Date.now }
});

// Static method to generate a new key
apiKeySchema.statics.generateKey = function() {
  const raw = `ks_${crypto.randomBytes(32).toString('hex')}`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const prefix = raw.substring(0, 10);
  return { raw, hash, prefix };
};

// Static method to find a key by raw value
apiKeySchema.statics.findByRawKey = async function(raw) {
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return this.findOne({ keyHash: hash });
};

module.exports = mongoose.model('ApiKey', apiKeySchema);