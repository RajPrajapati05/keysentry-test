const express = require('express');
const router = express.Router();
const axios = require('axios');
const Repo = require('../db/models/Repo');
const jwt = require('jsonwebtoken');

// Middleware to get user from JWT cookie
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

// GET /api/repos — get all connected repos
router.get('/', authMiddleware, async (req, res) => {
  try {
    const repos = await Repo.find().sort({ addedAt: -1 });
    res.json(repos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/repos/github — list user's GitHub repos
router.get('/github', authMiddleware, async (req, res) => {
  try {
    const User = require('../db/models/User');
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const response = await axios.get('https://api.github.com/user/repos', {
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
      params: { per_page: 100, sort: 'updated', affiliation: 'owner' }
    });

    const connectedRepos = await Repo.find();
    const connectedNames = connectedRepos.map(r => r.repoFullName);

    const repos = response.data.map(r => ({
      id: r.id,
      fullName: r.full_name,
      description: r.description,
      private: r.private,
      language: r.language,
      updatedAt: r.updated_at,
      isConnected: connectedNames.includes(r.full_name)
    }));

    res.json(repos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/repos/connect — connect a repo and install webhook
router.post('/connect', authMiddleware, async (req, res) => {
  const { repoFullName } = req.body;
  if (!repoFullName) return res.status(400).json({ error: 'repoFullName required' });

  try {
    const User = require('../db/models/User');
    const user = await User.findById(req.user.id);
    const [owner, repo] = repoFullName.split('/');

    // Install webhook on GitHub
    const webhookURL = `${process.env.RENDER_URL || 'https://keysentry-test.onrender.com'}/webhook/github`;

    let webhookId = null;
    try {
      const webhookRes = await axios.post(
        `https://api.github.com/repos/${owner}/${repo}/hooks`,
        {
          name: 'web',
          active: true,
          events: ['push'],
          config: {
            url: webhookURL,
            content_type: 'json',
            secret: process.env.GITHUB_WEBHOOK_SECRET,
            insecure_ssl: '0'
          }
        },
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          }
        }
      );
      webhookId = webhookRes.data.id;
    } catch (webhookErr) {
      // Webhook might already exist — continue
      console.warn('[Repos] Webhook install warning:', webhookErr.response?.data?.message);
    }

    // Save repo to MongoDB
    const existing = await Repo.findOne({ repoFullName });
    if (existing) return res.status(400).json({ error: 'Repo already connected' });

    const newRepo = await Repo.create({ repoFullName, webhookId });
    console.log(`[Repos] Connected: ${repoFullName}`);
    res.json({ success: true, repo: newRepo });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/repos/disconnect — disconnect a repo
router.delete('/disconnect', authMiddleware, async (req, res) => {
  const { repoFullName } = req.body;
  try {
    await Repo.findOneAndDelete({ repoFullName });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;