require('dotenv').config();
const connectDB = require('./db/connection');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const passport = require('./auth/passport');
const { validateWebhookSignature } = require('./utils/signature');
const { scanQueue } = require('./queue');
const Repo = require('./db/models/Repo');
const { getValidToken } = require('./utils/tokenResolver');
const bitbucketProvider = require('./providers/bitbucket');

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

// Trust proxy — required for secure cookies behind Render's proxy
app.set('trust proxy', 1);

// Middleware
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));
app.use(passport.initialize());
app.use(passport.session());

// Increase payload limit for large webhook payloads
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
const connectionsRouter = require('./routes/connections');
app.use('/api/scans', scansRouter);
app.use('/auth', authRouter);
app.use('/api/repos', reposRouter);
app.use('/connections', connectionsRouter);

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

// GitLab webhook endpoint
app.post('/webhook/gitlab', async (req, res) => {
  const token = req.headers['x-gitlab-token'];
  const event = req.headers['x-gitlab-event'];

  if (!token || token !== process.env.GITLAB_WEBHOOK_SECRET) {
    console.warn('[GitLab] Invalid token — rejected');
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (event !== 'Push Hook') {
    return res.status(200).json({ message: `Event '${event}' ignored` });
  }

  const { project, commits, user_username, ref } = req.body;

  if (!commits || commits.length === 0) {
    return res.status(200).json({ message: 'No commits to scan' });
  }

  console.log(`[GitLab] Push from ${user_username} on ${project.path_with_namespace}`);

  const job = await scanQueue.add('scan-commits', {
    provider: 'gitlab',
    repo: {
      fullName: project.path_with_namespace,
      url: project.git_http_url,
    },
    commits: commits.map(c => ({
      sha: c.id,
      message: c.message,
      author: c.author?.email || user_username,
      added: c.added || [],
      modified: c.modified || [],
      url: c.url,
    })),
    branch: ref,
    pusher: user_username,
  });

  console.log(`[Queue] Job ${job.id} added for ${project.path_with_namespace}`);
  return res.status(202).json({ message: 'Scan started', jobId: job.id });
});

// Bitbucket webhook endpoint
app.post('/webhook/bitbucket', async (req, res) => {
  const event = req.headers['x-event-key'];

  const signature = req.headers['x-hub-signature'];
  if (process.env.BITBUCKET_WEBHOOK_SECRET && signature) {
    const expected = 'sha256=' + crypto
      .createHmac('sha256', process.env.BITBUCKET_WEBHOOK_SECRET)
      .update(req.rawBody)
      .digest('hex');
    if (signature !== expected) {
      console.warn('[Bitbucket] Invalid signature — rejected');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  if (event !== 'repo:push') {
    return res.status(200).json({ message: `Event '${event}' ignored` });
  }

  const { repository, push, actor } = req.body;
  const change = push?.changes?.[0];

  if (!change || !change.commits || change.commits.length === 0) {
    return res.status(200).json({ message: 'No commits to scan' });
  }

  console.log(`[Bitbucket] Push from ${actor.display_name} on ${repository.full_name}`);

  // Resolve a token so we can fetch real diffstat (changed files) for each commit
  const repoDoc = await Repo.findOne({ provider: 'bitbucket', repoFullName: repository.full_name });
  const token = repoDoc?.connectedBy
    ? await getValidToken(repoDoc.connectedBy, 'bitbucket')
    : null;

  const commits = await Promise.all(change.commits.map(async (c) => {
    let added = [];
    let modified = [];

    if (token) {
      const diff = await bitbucketProvider.getChangedFiles(repository.full_name, c.hash, token);
      added = diff.added;
      modified = diff.modified;
    }

    return {
      sha: c.hash,
      message: c.message,
      author: c.author?.raw || actor.display_name,
      added,
      modified,
      url: c.links?.html?.href,
    };
  }));

  const job = await scanQueue.add('scan-commits', {
    provider: 'bitbucket',
    repo: {
      fullName: repository.full_name,
      url: repository.links?.html?.href,
    },
    commits,
    branch: change.new?.name,
    pusher: actor.display_name,
  });

  console.log(`[Queue] Job ${job.id} added for ${repository.full_name}`);
  return res.status(202).json({ message: 'Scan started', jobId: job.id });
});

app.listen(PORT, () => {
  console.log(`KeySentry running on http://localhost:${PORT}`);
});

module.exports = app;