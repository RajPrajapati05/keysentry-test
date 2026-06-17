const express = require('express');
const router = express.Router();
const Scan = require('../db/models/Scan');

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

module.exports = router;