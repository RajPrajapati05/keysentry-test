const axios = require('axios');

async function sendSlackAlert(findings, repoFullName, commitSha, pusher) {
  const webhookURL = process.env.SLACK_WEBHOOK_URL;
  if (!webhookURL) return;

  const critical = findings.filter(f => f.severity === 'critical').length;
  const high     = findings.filter(f => f.severity === 'high').length;
  const medium   = findings.filter(f => f.severity === 'medium').length;

  const severityEmoji = critical > 0 ? '🚨' : high > 0 ? '⚠️' : '🔔';
  const topSeverity   = critical > 0 ? 'CRITICAL' : high > 0 ? 'HIGH' : 'MEDIUM';

  const findingsList = findings.slice(0, 5).map(f =>
    `• *${f.type}* (${f.severity}) in \`${f.file}\` line ${f.line || '?'}`
  ).join('\n');

  const message = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${severityEmoji} KeySentry — Secret Leak Detected`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Repository:*\n${repoFullName}` },
          { type: 'mrkdwn', text: `*Pushed by:*\n${pusher}` },
          { type: 'mrkdwn', text: `*Commit:*\n\`${commitSha?.slice(0, 7)}\`` },
          { type: 'mrkdwn', text: `*Severity:*\n${topSeverity}` },
          { type: 'mrkdwn', text: `*Secrets found:*\n${findings.length}` },
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Findings:*\n${findingsList}${findings.length > 5 ? `\n_...and ${findings.length - 5} more_` : ''}`
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `🔐 KeySentry | Rotate these secrets immediately`
          }
        ]
      }
    ]
  };

  try {
    await axios.post(webhookURL, message);
    console.log('[Slack] Alert sent ✅');
  } catch (err) {
    console.error('[Slack] Alert failed:', err.message);
  }
}

module.exports = { sendSlackAlert };