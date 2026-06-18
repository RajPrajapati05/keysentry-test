const SECRET_PATTERNS = [
  {
    name: 'aws_access_key_id',
    severity: 'critical',
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
    description: 'AWS Access Key ID',
  },
  {
    name: 'aws_secret_access_key',
    severity: 'critical',
    pattern: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*=\s*['"]?([A-Za-z0-9/+=]{40})['"]?/,
    description: 'AWS Secret Access Key',
  },
  {
    name: 'github_personal_token',
    severity: 'high',
    pattern: /\bghp_[A-Za-z0-9]{36}\b/,
    description: 'GitHub Personal Access Token',
  },
  {
    name: 'github_oauth_token',
    severity: 'high',
    pattern: /\bgho_[A-Za-z0-9]{36}\b/,
    description: 'GitHub OAuth Token',
  },
  {
    name: 'stripe_secret_key',
    severity: 'critical',
    pattern: /\bsk_live_[0-9a-zA-Z]{24,}\b/,
    description: 'Stripe Live Secret Key',
  },
  {
    name: 'stripe_test_key',
    severity: 'medium',
    pattern: /\bsk_test_[0-9a-zA-Z]{24,}\b/,
    description: 'Stripe Test Secret Key',
  },
  {
    name: 'google_api_key',
    severity: 'high',
    pattern: /\bAIza[0-9A-Za-z\-_]{35}\b/,
    description: 'Google API Key',
  },
  {
    name: 'slack_token',
    severity: 'high',
    pattern: /\bxox[baprs]-[0-9a-zA-Z\-]{10,48}\b/,
    description: 'Slack Token',
  },
  {
    name: 'slack_webhook',
    severity: 'high',
    pattern: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/,
    description: 'Slack Webhook URL',
  },
  {
    name: 'openai_api_key',
    severity: 'high',
    pattern: /\bsk-[A-Za-z0-9]{48}\b/,
    description: 'OpenAI API Key',
  },
  {
    name: 'openai_api_key_v2',
    severity: 'high',
    pattern: /\bsk-proj-[A-Za-z0-9\-_]{40,}\b/,
    description: 'OpenAI Project API Key',
  },
  {
    name: 'private_key_pem',
    severity: 'critical',
    pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    description: 'Private Key (PEM)',
  },
  {
    name: 'mongodb_uri',
    severity: 'critical',
    pattern: /mongodb(?:\+srv)?:\/\/[^:]+:[^@]+@[^\s"']+/,
    description: 'MongoDB Connection String',
  },
  {
    name: 'sendgrid_key',
    severity: 'high',
    pattern: /\bSG\.[A-Za-z0-9\-_]{22}\.[A-Za-z0-9\-_]{43}\b/,
    description: 'SendGrid API Key',
  },
  {
    name: 'jwt_token',
    severity: 'medium',
    pattern: /\beyJ[A-Za-z0-9\-_=]{20,}\.[A-Za-z0-9\-_=]{20,}\.[A-Za-z0-9\-_.+/=]{20,}\b/,
    description: 'JWT Token',
  },
  {
    name: 'firebase_api_key',
    severity: 'high',
    pattern: /AAAA[A-Za-z0-9_-]{7}:[A-Za-z0-9_-]{140}/,
    description: 'Firebase Server Key',
  },
  {
    name: 'twilio_api_key',
    severity: 'high',
    pattern: /\bSK[a-z0-9]{32}\b/,
    description: 'Twilio API Key',
  },
  {
    name: 'heroku_api_key',
    severity: 'high',
    pattern: /[hH]eroku.*[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/,
    description: 'Heroku API Key',
  },
  {
    name: 'discord_token',
    severity: 'high',
    pattern: /\b[MNO][A-Za-z0-9]{23}\.[A-Za-z0-9\-_]{6}\.[A-Za-z0-9\-_]{27}\b/,
    description: 'Discord Bot Token',
  },
  {
    name: 'generic_secret',
    severity: 'low',
    pattern: /(?:secret|password|passwd|api_key|apikey|token)\s*[:=]\s*['"]([^'"]{12,})['"](?!\s*#\s*example)/i,
    description: 'Generic Secret Assignment',
  },
];

const FALSE_POSITIVES = [
  /^(example|placeholder|your[_-]?key|changeme|xxx+|test|dummy|fake|insert|replace|add[_-]?your)/i,
  /^[A-Z_]+$/,
  /^[0-9]+$/,
  /<[A-Z_]+>/,
  /\$\{[A-Z_]+\}/,
  /process\.env\./,
];

const SKIP_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
  '.pdf', '.zip', '.tar', '.gz', '.lock', '.map',
  '.min.js', '.min.css'
];

function shouldSkipFile(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.includes('node_modules/')) return true;
  if (lower.includes('.git/')) return true;
  if (lower.includes('dist/')) return true;
  if (lower.includes('build/')) return true;
  if (lower.includes('vendor/')) return true;
  if (lower.includes('__pycache__/')) return true;
  if (lower.includes('test/fixtures/')) return true;
  return SKIP_EXTENSIONS.some(ext => lower.endsWith(ext));
}

function shannonEntropy(str) {
  if (!str) return 0;
  const freq = {};
  for (const ch of str) freq[ch] = (freq[ch] || 0) + 1;
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / str.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function isFalsePositive(value) {
  for (const fp of FALSE_POSITIVES) {
    if (fp.test(value)) return true;
  }
  if (shannonEntropy(value) < 2.5) return true;
  return false;
}

function redactSecret(secret) {
  if (!secret || secret.length < 8) return '***';
  const visible = Math.min(6, Math.floor(secret.length * 0.2));
  return secret.substring(0, visible) + '...' + secret.slice(-3);
}

function scanContent(content, filePath) {
  if (shouldSkipFile(filePath)) return [];

  const lines = content.split('\n');
  const findings = [];
  const seen = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (line.trim().startsWith('//') || line.trim().startsWith('#')) continue;
    if (line.trim().startsWith('*')) continue;

    for (const rule of SECRET_PATTERNS) {
      const match = rule.pattern.exec(line);
      if (!match) continue;

      const matchedValue = match[1] || match[0];
      if (isFalsePositive(matchedValue)) continue;

      // Deduplicate same secret in same file
      const key = `${filePath}:${rule.name}:${matchedValue}`;
      if (seen.has(key)) continue;
      seen.add(key);

      findings.push({
        type:         rule.description,
        ruleId:       rule.name,
        severity:     rule.severity,
        file:         filePath,
        line:         i + 1,
        value:        redactSecret(matchedValue),
        rawLine:      line.trim().substring(0, 100),
      });
    }
  }

  return findings;
}

module.exports = { scanContent, shannonEntropy };