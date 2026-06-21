const express = require('express');
const router = express.Router();
const Repo = require('../db/models/Repo');
const User = require('../db/models/User');
const jwt = require('jsonwebtoken');
const { getProvider } = require('../providers');

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

// GET /api/repos — get all connected repos (across all providers)
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
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.accessToken) return res.json([]);

    const provider = getProvider('github');
    const repos = await provider.listUserRepos(user.accessToken);

    const connectedRepos = await Repo.find({ provider: 'github' });
    const connectedNames = connectedRepos.map(r => r.repoFullName);

    const result = repos.map(r => ({
      ...r,
      provider: 'github',
      isConnected: connectedNames.includes(r.fullName)
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/repos/gitlab — list user's GitLab repos
router.get('/gitlab', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const conn = user?.connections?.gitlab;
    if (!conn?.accessToken) return res.json([]);

    const provider = getProvider('gitlab');
    let token = conn.accessToken;

    // Refresh if expired or about to expire (60s buffer)
    const isExpired = !conn.expiresAt || new Date(conn.expiresAt).getTime() < Date.now() + 60000;
    if (isExpired) {
      if (!conn.refreshToken) {
        return res.status(400).json({ error: 'GitLab session expired. Please reconnect.' });
      }
      const refreshed = await provider.refreshAccessToken(conn.refreshToken);
      token = refreshed.access_token;

      await User.findByIdAndUpdate(req.user.id, {
        'connections.gitlab.accessToken': refreshed.access_token,
        'connections.gitlab.refreshToken': refreshed.refresh_token,
        'connections.gitlab.expiresAt': new Date(Date.now() + refreshed.expires_in * 1000)
      });
    }

    const repos = await provider.listUserRepos(token);

    const connectedRepos = await Repo.find({ provider: 'gitlab' });
    const connectedNames = connectedRepos.map(r => r.repoFullName);

    const result = repos.map(r => ({
      ...r,
      provider: 'gitlab',
      isConnected: connectedNames.includes(r.fullName)
    }));

    res.json(result);
  } catch (err) {
    console.error('[GitLab repos] Error:', err.response?.data || err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/repos/bitbucket — list user's Bitbucket repos
router.get('/bitbucket', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const token = user?.connections?.bitbucket?.accessToken;
    if (!token) return res.json([]);

    const provider = getProvider('bitbucket');
    const repos = await provider.listUserRepos(token);

    const connectedRepos = await Repo.find({ provider: 'bitbucket' });
    const connectedNames = connectedRepos.map(r => r.repoFullName);

    const result = repos.map(r => ({
      ...r,
      provider: 'bitbucket',
      isConnected: connectedNames.includes(r.fullName)
    }));

    res.json(result);
  } catch (err) {
    console.error('[Bitbucket repos] Error:', JSON.stringify(err.response?.data || err.message));
    res.status(500).json({ error: err.message });
  }
});

// POST /api/repos/connect — connect a repo on any provider and install webhook
router.post('/connect', authMiddleware, async (req, res) => {
  const { repoFullName, provider: providerName = 'github' } = req.body;
  if (!repoFullName) return res.status(400).json({ error: 'repoFullName required' });

  try {
    const user = await User.findById(req.user.id);

    let token, webhookSecret;
    if (providerName === 'github') {
      token = user.accessToken;
      webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    } else if (providerName === 'gitlab') {
      token = user.connections?.gitlab?.accessToken;
      webhookSecret = process.env.GITLAB_WEBHOOK_SECRET;
    } else if (providerName === 'bitbucket') {
      token = user.connections?.bitbucket?.accessToken;
      webhookSecret = process.env.BITBUCKET_WEBHOOK_SECRET;
    } else {
      return res.status(400).json({ error: 'Unknown provider' });
    }

    if (!token) return res.status(400).json({ error: `${providerName} account not connected` });

    const baseUrl = process.env.RENDER_URL || 'https://keysentry-test.onrender.com';
    const webhookURL = `${baseUrl}/webhook/${providerName}`;

    const provider = getProvider(providerName);
    let webhookId = null;
    try {
      webhookId = await provider.installWebhook(repoFullName, token, webhookURL, webhookSecret);
    } catch (webhookErr) {
      console.warn(`[Repos] Webhook install warning (${providerName}):`, webhookErr.response?.data || webhookErr.message);
    }

    const existing = await Repo.findOne({ provider: providerName, repoFullName });
    if (existing) return res.status(400).json({ error: 'Repo already connected' });

    const newRepo = await Repo.create({ provider: providerName, repoFullName, webhookId, connectedBy: req.user.id });
    console.log(`[Repos] Connected: ${repoFullName} (${providerName})`);
    res.json({ success: true, repo: newRepo });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/repos/disconnect — disconnect a repo
router.delete('/disconnect', authMiddleware, async (req, res) => {
  const { repoFullName, provider: providerName = 'github' } = req.body;
  try {
    await Repo.findOneAndDelete({ provider: providerName, repoFullName });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;