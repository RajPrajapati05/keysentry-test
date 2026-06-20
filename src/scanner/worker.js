const Scan = require('../db/models/Scan');
const Suppression = require('../db/models/Suppression');
const Repo = require('../db/models/Repo');
const crypto = require('crypto');
require('dotenv').config();
const { scanQueue } = require('../queue');
const { scanContent } = require('./detector');
const { sendAlerts } = require('../alerts/alerter');
const { getProvider } = require('../providers');

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

// Resolve the right token for the given provider
function getTokenForProvider(providerName) {
  if (providerName === 'gitlab') return process.env.GITLAB_TOKEN;
  if (providerName === 'bitbucket') return process.env.BITBUCKET_TOKEN;
  return process.env.GITHUB_TOKEN; // default
}

async function isSuppressed(repoFullName, filePath, ruleId, value) {
  try {
    const valueHash = crypto.createHash('sha256').update(value).digest('hex');
    const rule = await Suppression.findOne({
      repoFullName,
      file: filePath,
      ruleId,
      valueHash
    });
    return !!rule;
  } catch {
    return false;
  }
}

scanQueue.process('scan-commits', 3, async (job) => {
  const { repo, commits, pusher, provider: providerName = 'github' } = job.data;
  const allFindings = [];

  const provider = getProvider(providerName);
  const token = getTokenForProvider(providerName);

  console.log(`[Worker] Scanning ${repo.fullName} on ${providerName} — ${commits.length} commit(s)`);

  for (const commit of commits) {
    const files = [...new Set([...commit.added, ...commit.modified])];
    const commitFindings = [];

    for (const filePath of files) {
      if (shouldSkip(filePath)) continue;

      const content = await provider.fetchFileContent(repo.fullName, commit.sha, filePath, token);
      if (!content) continue;

      const findings = scanContent(content, filePath);

      if (findings.length > 0) {
        const activeFindings = [];
        for (const f of findings) {
          const suppressed = await isSuppressed(repo.fullName, filePath, f.type, f.value);
          if (!suppressed) activeFindings.push(f);
        }

        if (activeFindings.length > 0) {
          activeFindings.forEach(f => {
            f.repo = repo.fullName;
            f.pusher = pusher;
            f.commitSha = commit.sha;
            f.author = commit.author;
            f.commitUrl = commit.url;
          });
          allFindings.push(...activeFindings);
          commitFindings.push(...activeFindings);
          console.log(`[Scanner] Found ${activeFindings.length} secret(s) in ${filePath}`);
        }
      }
    }

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

      // Update repo stats
      await Repo.findOneAndUpdate(
        { provider: providerName, repoFullName: repo.fullName },
        {
          $set: { lastScanAt: new Date() },
          $inc: { totalScans: 1, totalFindings: commitFindings.length }
        }
      );
    } catch (err) {
      console.error('❌ Failed to save scan to MongoDB:', err.message);
    }
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