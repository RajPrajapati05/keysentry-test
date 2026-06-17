const Scan = require('../db/models/Scan');
require('dotenv').config();
const axios = require('axios');
const { scanQueue } = require('../queue');
const { scanContent } = require('./detector');
const { sendAlerts } = require('../alerts/alerter');

const SKIP_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg',
  '.ico', '.pdf', '.zip', '.tar', '.gz',
  '.lock', '.map'
];

function shouldSkip(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.includes('node_modules/')) return true;
  if (lower.includes('.git/')) return true;
  if (lower.includes('dist/')) return true;
  return SKIP_EXTENSIONS.some(ext => lower.endsWith(ext));
}

async function fetchFileContent(repo, sha, filePath) {
  try {
    const [owner, repoName] = repo.fullName.split('/');
    const url = `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}?ref=${sha}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3.raw',
      },
      timeout: 8000,
    });
    return typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data);
  } catch (err) {
    if (err.response?.status === 404) return null;
    console.warn(`[Worker] Could not fetch ${filePath}:`, err.message);
    return null;
  }
}

scanQueue.process('scan-commits', 3, async (job) => {
  const { repo, commits, pusher } = job.data;
  const allFindings = [];

  console.log(`[Worker] Scanning ${repo.fullName} — ${commits.length} commit(s)`);

  for (const commit of commits) {
    const files = [...new Set([...commit.added, ...commit.modified])];
    const commitFindings = []; // ← ADD THIS

    for (const filePath of files) {
      if (shouldSkip(filePath)) continue;

      const content = await fetchFileContent(repo, commit.sha, filePath);
      if (!content) continue;

      const findings = scanContent(content, filePath);

      if (findings.length > 0) {
        findings.forEach(f => {
          f.repo = repo.fullName;
          f.pusher = pusher;
          f.commitSha = commit.sha;
          f.author = commit.author;
          f.commitUrl = commit.url;
        });
        allFindings.push(...findings);
        commitFindings.push(...findings); // ← ADD THIS
        console.log(`[Scanner] Found ${findings.length} secret(s) in ${filePath}`);
      }
    }

    // ── ADD THIS BLOCK: save one Scan doc per commit ──────────────────
    try {
      const scan = new Scan({
        repoFullName:  repo.fullName,
        commitSha:     commit.sha,
        commitMessage: commit.message,
        pushedBy:      pusher,
        findings:      commitFindings.map(f => ({
          type:     f.type,
          value:    f.value,
          file:     f.file,
          line:     f.line,
          severity: f.severity || 'high'
        })),
        findingsCount: commitFindings.length,
        status:        commitFindings.length > 0 ? 'flagged' : 'clean',
        alertSent:     false
      });
      await scan.save();
      console.log(`💾 Scan saved — ${scan.status} (${commitFindings.length} finding(s))`);
    } catch (err) {
      console.error('❌ Failed to save scan to MongoDB:', err.message);
    }
    // ─────────────────────────────────────────────────────────────────
  }

  if (allFindings.length > 0) {
    console.log(`[Worker] Total: ${allFindings.length} secret(s) — sending alerts!`);
    await sendAlerts(allFindings);
  } else {
    console.log(`[Worker] Clean — no secrets found`);
  }

  return { secretsFound: allFindings.length };
});

console.log('[Worker] Scanner worker is running...');