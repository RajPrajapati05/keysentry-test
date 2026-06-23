<div align="center">
  <h1>🔐 KeySentry</h1>
  <p><strong>Real-time API key and secret leak detection for GitHub, GitLab, and Bitbucket</strong></p>

  <p>
    <a href="https://keysentry-frontend.onrender.com">🌐 Live Demo</a> ·
    <a href="https://keysentry-test.onrender.com">⚙️ API Base URL</a> ·
    <a href="#api-reference">📖 API Docs</a> ·
    <a href="#cicd-integration">⚙️ CI/CD Setup</a>
  </p>

  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="Node version"/>
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License"/>
  <img src="https://img.shields.io/badge/providers-GitHub%20%7C%20GitLab%20%7C%20Bitbucket-orange" alt="Providers"/>

  <br/><br/>

  | 🌐 Frontend | ⚙️ Backend API |
  |-------------|----------------|
  | [keysentry-frontend.onrender.com](https://keysentry-frontend.onrender.com) | [keysentry-test.onrender.com](https://keysentry-test.onrender.com) |

</div>

---

## What is KeySentry?

KeySentry is an open-source SaaS tool that automatically scans your Git repositories for accidentally committed secrets — API keys, tokens, passwords, and credentials — and alerts your team in real time before they can be exploited.

**How it works:**
1. Connect your GitHub, GitLab, or Bitbucket repositories
2. KeySentry installs a webhook on each repo automatically
3. Every push triggers a scan of changed files using 20+ secret detection patterns
4. Findings are sent via email and Slack, displayed on the dashboard, and can block PRs via GitHub Actions

---

## Features

### 🔍 Secret Detection
- **20+ detection patterns** — AWS keys, GitHub tokens, Stripe keys, OpenAI keys, MongoDB URIs, private keys, Slack webhooks, and more
- **Shannon entropy analysis** — catches high-entropy strings that look like secrets even without a known pattern
- **False positive filtering** — ignores example values, placeholders, and environment variable references
- **Severity scoring** — critical / high / medium / low based on secret type

### 🔗 Multi-Provider Support
- **GitHub** — OAuth login, auto webhook install, real-time push scanning
- **GitLab** — OAuth connect, Bearer token auth, automatic token refresh
- **Bitbucket** — OAuth connect, workspace-based repo listing, diffstat-based file scanning

### 🚨 Alerts
- **Email alerts** — rich HTML emails with finding details on every flagged commit
- **Slack alerts** — block-formatted messages with severity, file, line number, and commit link

### 🛡️ False Positive Management
- **Per-finding suppression** — dismiss individual findings with a reason
- **Permanent suppression rules** — auto-suppress future identical findings across commits

### ⚙️ CI/CD Integration
- **GitHub Actions workflow** — scans changed files on every push and PR
- **Blocks merges** — fails the check if secrets are found, preventing them from reaching `main`
- **Zero external dependencies** — runs entirely in the CI runner, no network calls needed

### 👥 Team Management
- **Create teams** — invite collaborators by email
- **Role-based access** — admin, member, viewer roles with different permissions
- **Invite flow** — secure token-based invite links with 7-day expiry

### 🔌 Public REST API
- **API key authentication** — generate and revoke personal API keys
- **Rate limiting** — 60 requests per minute per key
- **4 endpoints** — list scans, get scan details, list repos, list findings

---

## Quick Start

### 1. Connect a Repository
1. Log in with GitHub at [keysentry-frontend.onrender.com](https://keysentry-frontend.onrender.com)
2. Go to **Repositories** → select your provider tab
3. Click **Connect** on any repo — KeySentry installs the webhook automatically

### 2. Trigger a Scan
Push any commit to a connected repo. KeySentry will:
- Detect changed files via the webhook payload
- Scan each file against 20+ secret patterns
- Save results to the dashboard
- Send email + Slack alerts if secrets are found

### 3. View Results
Go to the **Dashboard** to see all scan history with filters by status, repo, and date.

---

## CI/CD Integration

Add secret scanning to your GitHub Actions pipeline in seconds.

Create `.github/workflows/keysentry-scan.yml`:

```yaml
name: KeySentry Secret Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '24'

      - name: Run KeySentry secret scan
        env:
          KEYSENTRY_BASE_REF: ${{ github.event.pull_request.base.ref }}
        run: node src/scripts/ci-scan.js
```

The scan script runs locally in the CI runner — no API key needed, no external calls. It exits with code 1 if secrets are found, failing the check and blocking the merge.

---

## API Reference

Base URL: `https://keysentry-test.onrender.com`

All API requests require an API key generated from the **API Keys** page.
### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/scans` | List recent scans |
| GET | `/v1/scans/:id` | Get scan details + findings |
| GET | `/v1/repos` | List connected repositories |
| GET | `/v1/findings` | List all active findings |

### Query Parameters

**GET /v1/scans**
- `status` — filter by `clean` or `flagged`
- `repo` — filter by repo full name (e.g. `RajPrajapati05/keysentry-test`)
- `limit` — results per page (max 100, default 50)
- `page` — page number (default 1)

**GET /v1/findings**
- `severity` — filter by `critical`, `high`, `medium`, or `low`
- `repo` — filter by repo full name
- `limit` — max results (max 200, default 50)

### Example

```bash
# List flagged scans
curl -H "Authorization: Bearer ks_your_key" \
  "https://keysentry-test.onrender.com/v1/scans?status=flagged"

# List critical findings
curl -H "Authorization: Bearer ks_your_key" \
  "https://keysentry-test.onrender.com/v1/findings?severity=critical"
```

### Rate Limiting
60 requests per minute per API key. Exceeding this returns:
```json
{ "error": "Rate limit exceeded. Max 60 requests per minute." }
```

---

## Detected Secret Types

| Pattern | Severity |
|---------|----------|
| AWS Access Key ID | 🔴 Critical |
| AWS Secret Access Key | 🔴 Critical |
| Private Key (PEM) | 🔴 Critical |
| MongoDB Connection String | 🔴 Critical |
| Stripe Live Secret Key | 🔴 Critical |
| GitHub Personal Access Token | 🟠 High |
| GitHub OAuth Token | 🟠 High |
| Google API Key | 🟠 High |
| Slack Token / Webhook | 🟠 High |
| OpenAI API Key | 🟠 High |
| SendGrid API Key | 🟠 High |
| Firebase Server Key | 🟠 High |
| Twilio API Key | 🟠 High |
| Heroku API Key | 🟠 High |
| Discord Bot Token | 🟠 High |
| Stripe Test Key | 🟡 Medium |
| JWT Token | 🟡 Medium |
| Generic Secret Assignment | 🔵 Low |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express |
| Queue | Bull + Redis (Upstash) |
| Database | MongoDB Atlas |
| Authentication | Passport.js (GitHub OAuth) |
| Provider OAuth | Manual OAuth2 (GitLab, Bitbucket) |
| Email | Nodemailer |
| Frontend | React, Tailwind CSS, react-router-dom |
| Deployment | Render (backend + frontend) |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | JWT signing secret |
| `SESSION_SECRET` | Express session secret |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret |
| `GITHUB_WEBHOOK_SECRET` | GitHub webhook validation secret |
| `GITHUB_TOKEN` | GitHub personal access token (for scanning) |
| `GITLAB_CLIENT_ID` | GitLab OAuth app client ID |
| `GITLAB_CLIENT_SECRET` | GitLab OAuth app client secret |
| `GITLAB_WEBHOOK_SECRET` | GitLab webhook token |
| `BITBUCKET_CLIENT_ID` | Bitbucket OAuth consumer key |
| `BITBUCKET_CLIENT_SECRET` | Bitbucket OAuth consumer secret |
| `BITBUCKET_WORKSPACE` | Bitbucket workspace slug |
| `REDIS_URL` | Upstash Redis URL |
| `APP_URL` | Backend URL |
| `EMAIL_HOST` | SMTP host for email alerts |
| `EMAIL_USER` | SMTP username |
| `EMAIL_PASS` | SMTP password |
| `ALERT_EMAIL_TO` | Email address to send alerts to |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL |

---
