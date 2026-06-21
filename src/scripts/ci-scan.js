#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { scanContent } = require('../scanner/detector');

function getChangedFiles() {
  // In a PR/MR context, compare against the base branch if provided.
  // Otherwise fall back to comparing the last commit against its parent.
  const base = process.env.KEYSENTRY_BASE_REF || process.argv[2];

  let diffCmd;
  if (base) {
    diffCmd = `git diff --name-only --diff-filter=ACM origin/${base}...HEAD`;
  } else {
    diffCmd = `git diff --name-only --diff-filter=ACM HEAD~1 HEAD`;
  }

  try {
    const output = execSync(diffCmd, { encoding: 'utf-8' });
    return output.split('\n').map(f => f.trim()).filter(Boolean);
  } catch (err) {
    console.error(`[KeySentry CI] Could not compute diff (${diffCmd}):`, err.message);
    console.error('[KeySentry CI] Falling back to scanning all tracked files.');
    const output = execSync('git ls-files', { encoding: 'utf-8' });
    return output.split('\n').map(f => f.trim()).filter(Boolean);
  }
}

function main() {
  console.log('[KeySentry CI] Scanning changed files for secrets...\n');

  const files = getChangedFiles();
  if (files.length === 0) {
    console.log('[KeySentry CI] No changed files to scan. ✅');
    process.exit(0);
  }

  let allFindings = [];

  for (const filePath of files) {
    if (!fs.existsSync(filePath)) continue; // deleted file
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;

    let content;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      continue; // binary or unreadable file
    }

    const findings = scanContent(content, filePath);
    allFindings.push(...findings);
  }

  if (allFindings.length === 0) {
    console.log(`[KeySentry CI] Scanned ${files.length} file(s). No secrets found. ✅`);
    process.exit(0);
  }

  console.log(`[KeySentry CI] 🚨 Found ${allFindings.length} potential secret(s):\n`);
  for (const f of allFindings) {
    console.log(`  ${f.severity.toUpperCase()}  ${f.file}:${f.line}  [${f.type}]`);
    console.log(`    ${f.rawLine}`);
    console.log('');
  }

  console.log('[KeySentry CI] Build failed — remove or suppress the secrets above before merging.');
  process.exit(1);
}

main();