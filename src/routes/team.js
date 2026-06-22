const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../db/models/User');
const Team = require('../db/models/Team');
const { sendTeamInviteEmail } = require('../alerts/alerter');

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

function requireRole(...roles) {
  return async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user?.teamId) return res.status(403).json({ error: 'No team found' });
    if (!roles.includes(user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    req.fullUser = user;
    next();
  };
}

// POST /api/team/create — create a new team (only if user has no team yet)
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Team name required' });

    const user = await User.findById(req.user.id);
    if (user.teamId) return res.status(400).json({ error: 'You already belong to a team' });

    const team = await Team.create({
      name,
      ownerId: user._id,
      members: [{ userId: user._id, role: 'admin' }]
    });

    await User.findByIdAndUpdate(user._id, { teamId: team._id, role: 'admin' });

    res.json({ success: true, team });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/team — get current user's team info
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.teamId) return res.json(null);

    const team = await Team.findById(user.teamId).populate('members.userId', 'username email avatarUrl');
    res.json({ team, userRole: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/team/invite — invite someone by email
router.post('/invite', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { email, role = 'member' } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const team = await Team.findById(req.fullUser.teamId);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    // Check if already invited
    const existing = team.invites.find(i => i.email === email && !i.accepted);
    if (existing) return res.status(400).json({ error: 'Invite already sent to this email' });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    team.invites.push({ email, role, token, expiresAt });
    await team.save();

    const inviteUrl = `${process.env.CLIENT_URL || 'https://keysentry-frontend.onrender.com'}/invite?token=${token}`;
    await sendTeamInviteEmail(email, team.name, inviteUrl, req.fullUser.username);

    res.json({ success: true, inviteUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/team/accept-invite — accept an invite by token
router.post('/accept-invite', authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const team = await Team.findOne({ 'invites.token': token });
    if (!team) return res.status(404).json({ error: 'Invalid or expired invite' });

    const invite = team.invites.find(i => i.token === token);
    if (!invite) return res.status(404).json({ error: 'Invite not found' });
    if (invite.accepted) return res.status(400).json({ error: 'Invite already used' });
    if (new Date() > invite.expiresAt) return res.status(400).json({ error: 'Invite expired' });

    const user = await User.findById(req.user.id);
    if (user.teamId) return res.status(400).json({ error: 'You already belong to a team' });

    // Add user to team
    team.members.push({ userId: user._id, role: invite.role });
    invite.accepted = true;
    await team.save();

    await User.findByIdAndUpdate(user._id, { teamId: team._id, role: invite.role });

    res.json({ success: true, team: { id: team._id, name: team.name }, role: invite.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/team/members/:userId/role — change a member's role
router.patch('/members/:userId/role', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'member', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const team = await Team.findById(req.fullUser.teamId);
    const member = team.members.find(m => m.userId.toString() === req.params.userId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    member.role = role;
    await team.save();
    await User.findByIdAndUpdate(req.params.userId, { role });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/team/members/:userId — remove a member
router.delete('/members/:userId', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const team = await Team.findById(req.fullUser.teamId);
    team.members = team.members.filter(m => m.userId.toString() !== req.params.userId);
    await team.save();

    await User.findByIdAndUpdate(req.params.userId, { teamId: null, role: 'admin' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;