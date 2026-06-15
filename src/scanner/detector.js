const SECRET_PATTERNS = [
  {
    name: 'aws_access_key_id',
    severity: 'critical',
    pattern: /\bAKIA[0-9A-Z]{16}\b/,
    description: 'AWS Access Key ID',
  },
  {
    name: 'github_personal_token',
    severity: 'high',
    pattern: /\bghp_[A-Za-z0-9]{36}\b/,
    description: 'GitHub Personal Access Token',
  },
  {
    name: 'stripe_secret_key',
    severity: 'critical',
    pattern: /\bsk_live_[0-9a-zA-Z]{24,}\b/,
    description: 'Stripe Live Secret Key',
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
    name: 'openai_api_key',
    severity: 'high',
    pattern: /\bsk-[A-Za-z0-9]{48}\b/,
    description: 'OpenAI API Key',
  },
  {
    name: 'private_key_pem',
    severity: 'critical',
    pattern: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    description: 'Private Key',
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
];

const FALSE_POSITIVES = [
  /^(example|placeholder|your[_-]?key|changeme|xxx+|test|dummy|fake)/i,
  /^[A-Z_]+$/,
  /^[0-9]+$/,
];

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
  const lines = content.split('\n');
  const findings = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    if (line.trim().startsWith('//') || line.trim().startsWith('#')) continue;

    for (const rule of SECRET_PATTERNS) {
      const match = rule.pattern.exec(line);
      if (!match) continue;

      const matchedValue = match[0];
      if (isFalsePositive(matchedValue)) continue;

      findings.push({
        ruleId: rule.name,
        description: rule.description,
        severity: rule.severity,
        filePath,
        lineNumber: i + 1,
        matchedValue: redactSecret(matchedValue),
        rawLine: line.trim().substring(0, 100),
      });
    }
  }

  return findings;
}

module.exports = { scanContent, shannonEntropy };