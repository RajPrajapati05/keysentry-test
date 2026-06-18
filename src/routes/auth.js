const express = require('express');
const router = express.Router();
const passport = require('../auth/passport');
const jwt = require('jsonwebtoken');

// Start GitHub OAuth flow
router.get('/github', passport.authenticate('github', {
  scope: ['user:email', 'repo']
}));

// GitHub callback
router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req, res) => {
    // Create JWT token
    const token = jwt.sign(
      {
        id:       req.user._id,
        username: req.user.username,
        avatar:   req.user.avatarUrl
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Send token to frontend via cookie
    res.cookie('keysentry_token', token, {
      httpOnly: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });

    // Redirect to dashboard
    const clientURL = process.env.NODE_ENV === 'production'
      ? 'https://your-frontend.onrender.com'
      : 'http://localhost:3000';

    res.redirect(clientURL);
  }
);

// Get current user
router.get('/me', (req, res) => {
  const token = req.cookies?.keysentry_token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    res.json(user);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout
router.get('/logout', (req, res) => {
  res.clearCookie('keysentry_token');
  res.json({ message: 'Logged out' });
});

module.exports = router;