const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const ApiKey = require('../db/models/ApiKey');

function authMiddleware(req, res, next) {
  const token = req.cookies?.keysentry_token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// GET /api/keys — list user's API keys (never returns raw key, only prefix + metadata)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const keys = await ApiKey.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(keys.map(k => ({
      id: k._id,
      name: k.name,
      prefix: k.keyPrefix,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/keys — generate a new API key
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Key name required' });

    const { raw, hash, prefix } = ApiKey.generateKey();

    await ApiKey.create({
      userId: req.user.id,
      name,
      keyHash: hash,
      keyPrefix: prefix
    });

    // Return the raw key ONCE — never stored, can't be retrieved again
    res.json({ success: true, key: raw, prefix, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/keys/:id — revoke a key
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const key = await ApiKey.findOne({ _id: req.params.id, userId: req.user.id });
    if (!key) return res.status(404).json({ error: 'Key not found' });
    await key.deleteOne();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;