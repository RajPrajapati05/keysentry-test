require('dotenv').config();
const connectDB = require('./db/connection');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const passport = require('./auth/passport');
const { validateWebhookSignature } = require('./utils/signature');
const { scanQueue } = require('./queue');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Start the scanner worker
require('./scanner/worker');

// CORS — must be before other middleware
app.use(cors({
  origin: ['https://keysentry-frontend.onrender.com', 'http://localhost:3000'],
  credentials: true
}));

// Middleware
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));
app.use(passport.initialize());
app.use(passport.session());

// Increase payload limit for large GitHub webhook payloads
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// API routes
const scansRouter = require('./routes/scans');
const authRouter = require('./routes/auth');
const reposRouter = require('./routes/repos');
app.use('/api/scans', scansRouter);
app.use('/auth', authRouter);
app.use('/api/repos', reposRouter);

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    service: 'KeySentry',
    message: 'Webhook server is live!'
  });
});

// GitHub webhook endpoint
app.post('/webhook/github', async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const event = req.headers['x-github-event'];

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

  if (event !== 'push') {
    return res.status(200).json({ message: `Event '${event}' ignored` });
  }

  const { repository, commits, pusher, ref } = req.body;

  if (!commits || commits.length === 0) {
    return res.status(200).json({ message: 'No commits to scan' });
  }

  console.log(`[GitHub] Push from ${pusher.name} on ${repository.full_name}`);

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