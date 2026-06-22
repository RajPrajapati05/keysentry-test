const ApiKey = require('../db/models/ApiKey');
const User = require('../db/models/User');

async function apiKeyAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ks_')) {
    return res.status(401).json({ error: 'Missing or invalid API key' });
  }

  const raw = authHeader.slice(7); // strip "Bearer "

  try {
    const apiKey = await ApiKey.findByRawKey(raw);
    if (!apiKey) return res.status(401).json({ error: 'Invalid API key' });

    // Update last used timestamp (non-blocking)
    ApiKey.findByIdAndUpdate(apiKey._id, { lastUsedAt: new Date() }).catch(() => {});

    const user = await User.findById(apiKey.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.apiUser = user;
    req.apiKey = apiKey;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = apiKeyAuth;