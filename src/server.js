const connectDB = require('./db/connection');
connectDB();
require('dotenv').config();
const express = require('express');
const { validateWebhookSignature } = require('./utils/signature');
const { scanQueue } = require('./queue');

const app = express();
const PORT = process.env.PORT || 3000;

// This lets us read the raw request body for signature checking
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

// Health check — visit this in browser to confirm server is running
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: 'KeySentry',
    message: 'Webhook server is live!'
  });
});

// GitHub sends a request here every time someone pushes code
app.post('/webhook/github', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const event = req.headers['x-github-event'];

  // Step 1 — check signature is valid
  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }

  const isValid = validateWebhookSignature(
    req.rawBody,
    signature,
    process.env.GITHUB_WEBHOOK_SECRET
  );

  if (!isValid) {
    console.warn('[GitHub] Invalid signature — rejected');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Step 2 — only process push events
  if (event !== 'push') {
    return res.status(200).json({ message: `Event '${event}' ignored` });
  }

  const { repository, commits, pusher, ref } = req.body;

  if (!commits || commits.length === 0) {
    return res.status(200).json({ message: 'No commits to scan' });
  }

  console.log(`[GitHub] Push from ${pusher.name} on ${repository.full_name}`);

  // Step 3 — add scan job to queue
  const job = await scanQueue.add('scan-commits', {
    provider: 'github',
    repo: {
      fullName: repository.full_name,
      url: repository.clone_url,
    },
    commits: commits.map(c => ({
      sha: c.id,
      message: c.message,
      author: c.author?.email || pusher.email,
      added: c.added || [],
      modified: c.modified || [],
      url: c.url,
    })),
    branch: ref,
    pusher: pusher.name,
  });

  console.log(`[Queue] Job ${job.id} added for ${repository.full_name}`);
  return res.status(202).json({ message: 'Scan started', jobId: job.id });
});

app.listen(PORT, () => {
  console.log(`KeySentry running on http://localhost:${PORT}`);
});

module.exports = app;