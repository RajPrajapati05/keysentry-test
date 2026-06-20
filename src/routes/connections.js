const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../db/models/User');

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

// ── GitLab connect flow ──────────────────────────────────────────
router.get('/gitlab', authMiddleware, (req, res) => {
  const redirectUri = `${process.env.APP_URL}/connections/gitlab/callback`;
  const authUrl = `https://gitlab.com/oauth/authorize?client_id=${process.env.GITLAB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=api+read_user+read_repository&state=${req.user.id}`;
  res.redirect(authUrl);
});

router.get('/gitlab/callback', async (req, res) => {
  const { code, state: userId } = req.query;
  const clientURL = process.env.NODE_ENV === 'production'
    ? 'https://keysentry-frontend.onrender.com'
    : 'http://localhost:3000';

  try {
    const redirectUri = `${process.env.APP_URL}/connections/gitlab/callback`;
    const tokenRes = await axios.post('https://gitlab.com/oauth/token', {
      client_id: process.env.GITLAB_CLIENT_ID,
      client_secret: process.env.GITLAB_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    });

    const { access_token, refresh_token, expires_in } = tokenRes.data;

    const gitlabUser = await axios.get('https://gitlab.com/api/v4/user', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    await User.findByIdAndUpdate(userId, {
      'connections.gitlab': {
        providerId: String(gitlabUser.data.id),
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        connectedAt: new Date()
      }
    });

    res.redirect(`${clientURL}/repos?connected=gitlab`);
  } catch (err) {
    console.error('[GitLab] OAuth error:', err.response?.data || err.message);
    res.redirect(`${clientURL}/repos?error=gitlab_failed`);
  }
});

// ── Bitbucket connect flow ───────────────────────────────────────
router.get('/bitbucket', authMiddleware, (req, res) => {
  const redirectUri = `${process.env.APP_URL}/connections/bitbucket/callback`;
  const authUrl = `https://bitbucket.org/site/oauth2/authorize?client_id=${process.env.BITBUCKET_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${req.user.id}`;
  res.redirect(authUrl);
});

router.get('/bitbucket/callback', async (req, res) => {
  const { code, state: userId } = req.query;
  const clientURL = process.env.NODE_ENV === 'production'
    ? 'https://keysentry-frontend.onrender.com'
    : 'http://localhost:3000';

  try {
    const tokenRes = await axios.post(
      'https://bitbucket.org/site/oauth2/access_token',
      new URLSearchParams({ grant_type: 'authorization_code', code }),
      {
        auth: {
          username: process.env.BITBUCKET_CLIENT_ID,
          password: process.env.BITBUCKET_CLIENT_SECRET
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );

    const { access_token } = tokenRes.data;

    const bbUser = await axios.get('https://api.bitbucket.org/2.0/user', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    await User.findByIdAndUpdate(userId, {
      'connections.bitbucket': {
        providerId: bbUser.data.uuid,
        accessToken: access_token,
        connectedAt: new Date()
      }
    });

    res.redirect(`${clientURL}/repos?connected=bitbucket`);
  } catch (err) {
    console.error('[Bitbucket] OAuth error:', err.response?.data || err.message);
    res.redirect(`${clientURL}/repos?error=bitbucket_failed`);
  }
});

// Get connection status for all providers
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      github: !!user.accessToken,
      gitlab: !!user.connections?.gitlab?.accessToken,
      bitbucket: !!user.connections?.bitbucket?.accessToken
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;