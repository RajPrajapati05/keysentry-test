const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Scan = require('../db/models/Scan');
const Suppression = require('../db/models/Suppression');
const jwt = require('jsonwebtoken');

// Middleware to get user from JWT cookie (optional auth — used to track who suppressed)
function getUser(req) {
  const token = req.cookies?.keysentry_token;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

router.get('/', async (req, res) => {
  try {
    const scans = await Scan.find().sort({ scannedAt: -1 }).limit(100);
    res.json(scans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.id);
    if (!scan) return res.status(404).json({ error: 'Scan not found' });
    res.json(scan);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scans/:id/findings/:findingId/suppress — mark a finding as false positive
router.post('/:id/findings/:findingId/suppress', async (req, res) => {
  try {
    const { reason, permanent } = req.body;
    const user = getUser(req);
    const scan = await Scan.findById(req.params.id);
    if (!scan) return res.status(404).json({ error: 'Scan not found' });

    const finding = scan.findings.id(req.params.findingId);
    if (!finding) return res.status(404).json({ error: 'Finding not found' });

    finding.suppressed = true;
    finding.suppressedBy = user?.username || 'unknown';
    finding.suppressedAt = new Date();
    finding.suppressReason = reason || '';

    // Recalculate findingsCount and status based on non-suppressed findings
    const activeFindings = scan.findings.filter(f => !f.suppressed);
    scan.findingsCount = activeFindings.length;
    scan.status = activeFindings.length > 0 ? 'flagged' : 'clean';

    await scan.save();

    // If permanent, save a suppression rule so future identical findings auto-suppress
    if (permanent) {
      const valueHash = crypto.createHash('sha256').update(finding.value).digest('hex');
      await Suppression.findOneAndUpdate(
        {
          repoFullName: scan.repoFullName,
          file: finding.file,
          ruleId: finding.type,
          valueHash
        },
        {
          reason: reason || '',
          createdBy: user?.username || 'unknown'
        },
        { upsert: true }
      );
    }

    res.json({ success: true, scan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scans/:id/findings/:findingId/unsuppress — undo suppression
router.post('/:id/findings/:findingId/unsuppress', async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.id);
    if (!scan) return res.status(404).json({ error: 'Scan not found' });

    const finding = scan.findings.id(req.params.findingId);
    if (!finding) return res.status(404).json({ error: 'Finding not found' });

    finding.suppressed = false;
    finding.suppressedBy = undefined;
    finding.suppressedAt = undefined;
    finding.suppressReason = undefined;

    const activeFindings = scan.findings.filter(f => !f.suppressed);
    scan.findingsCount = activeFindings.length;
    scan.status = activeFindings.length > 0 ? 'flagged' : 'clean';

    await scan.save();
    res.json({ success: true, scan });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;