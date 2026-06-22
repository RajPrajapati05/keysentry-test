const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const Scan = require('../db/models/Scan');
const Repo = require('../db/models/Repo');
const apiKeyAuth = require('../middleware/apiKeyAuth');

// Rate limit: 60 requests per minute per API key
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.apiKey?._id?.toString() || req.ip || 'unknown',
  validate: { xForwardedForHeader: false },
  message: { error: 'Rate limit exceeded. Max 60 requests per minute.' }
});

router.use(apiKeyAuth);
router.use(apiLimiter);

// GET /v1/scans — list recent scans
router.get('/scans', async (req, res) => {
  try {
    const { status, repo, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (repo) filter.repoFullName = repo;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const scans = await Scan.find(filter)
      .sort({ scannedAt: -1 })
      .skip(skip)
      .limit(Math.min(parseInt(limit), 100));

    const total = await Scan.countDocuments(filter);

    res.json({
      data: scans.map(s => ({
        id: s._id,
        repo: s.repoFullName,
        commitSha: s.commitSha,
        commitMessage: s.commitMessage,
        pushedBy: s.pushedBy,
        status: s.status,
        findingsCount: s.findingsCount,
        scannedAt: s.scannedAt
      })),
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /v1/scans/:id — get a single scan with full findings
router.get('/scans/:id', async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.id);
    if (!scan) return res.status(404).json({ error: 'Scan not found' });

    res.json({
      id: scan._id,
      repo: scan.repoFullName,
      commitSha: scan.commitSha,
      commitMessage: scan.commitMessage,
      pushedBy: scan.pushedBy,
      status: scan.status,
      findingsCount: scan.findingsCount,
      scannedAt: scan.scannedAt,
      findings: scan.findings.filter(f => !f.suppressed).map(f => ({
        type: f.type,
        severity: f.severity,
        file: f.file,
        line: f.line,
        value: f.value
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /v1/repos — list connected repos
router.get('/repos', async (req, res) => {
  try {
    const repos = await Repo.find().sort({ addedAt: -1 });
    res.json({
      data: repos.map(r => ({
        id: r._id,
        provider: r.provider,
        repoFullName: r.repoFullName,
        totalScans: r.totalScans,
        totalFindings: r.totalFindings,
        lastScanAt: r.lastScanAt,
        addedAt: r.addedAt
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /v1/findings — list all active (non-suppressed) findings across all scans
router.get('/findings', async (req, res) => {
  try {
    const { severity, repo, limit = 50 } = req.query;

    const scans = await Scan.find({ status: 'flagged', ...repo ? { repoFullName: repo } : {} })
      .sort({ scannedAt: -1 })
      .limit(Math.min(parseInt(limit), 200));

    const findings = [];
    for (const scan of scans) {
      for (const f of scan.findings) {
        if (f.suppressed) continue;
        if (severity && f.severity !== severity) continue;
        findings.push({
          scanId: scan._id,
          repo: scan.repoFullName,
          commitSha: scan.commitSha,
          scannedAt: scan.scannedAt,
          type: f.type,
          severity: f.severity,
          file: f.file,
          line: f.line,
          value: f.value
        });
      }
    }

    res.json({ data: findings, total: findings.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;