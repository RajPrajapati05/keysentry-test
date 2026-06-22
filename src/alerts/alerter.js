require('dotenv').config();
const nodemailer = require('nodemailer');
const { sendSlackAlert } = require('./slack');

function createTransporter() {
  const { EMAIL_HOST, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST) return null;
  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: 587,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
  });
}

async function sendEmailAlert(findings) {
  const { EMAIL_USER, ALERT_EMAIL_TO } = process.env;
  const transporter = createTransporter();

  if (!transporter || !ALERT_EMAIL_TO) {
    console.warn('[Alerts] Email not configured — skipping');
    return;
  }

  const top = findings[0];

  const rows = findings.map(f => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${f.type || f.description}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${f.file || f.filePath}:${f.line || f.lineNumber}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${f.value || f.matchedValue}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;color:red;font-weight:bold">${f.severity?.toUpperCase()}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family:sans-serif;max-width:600px">
      <h2 style="color:#E24B4A">🚨 KeySentry — Secret Detected!</h2>
      <p>
        <b>Repository:</b> ${top.repo}<br>
        <b>Pushed by:</b> ${top.pusher}<br>
        <b>Total findings:</b> ${findings.length}
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px;text-align:left">Type</th>
            <th style="padding:8px;text-align:left">Location</th>
            <th style="padding:8px;text-align:left">Value</th>
            <th style="padding:8px;text-align:left">Severity</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:20px;color:#666">Sent by KeySentry — API Key Leak Scanner</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"KeySentry" <${EMAIL_USER}>`,
    to: ALERT_EMAIL_TO,
    subject: `[${top.severity?.toUpperCase()}] Secret leaked in ${top.repo}`,
    html,
  });

  console.log('[Alerts] Email sent to', ALERT_EMAIL_TO);
}

async function sendTeamInviteEmail(toEmail, teamName, inviteUrl, invitedBy) {
  const { EMAIL_USER } = process.env;
  const transporter = createTransporter();

  if (!transporter) {
    console.warn('[Alerts] Email not configured — skipping invite email');
    return;
  }

  const html = `
    <div style="font-family:sans-serif;max-width:600px">
      <h2 style="color:#3B82F6">🔐 You've been invited to join KeySentry</h2>
      <p><b>${invitedBy}</b> has invited you to join the team <b>${teamName}</b> on KeySentry.</p>
      <p>Click the button below to accept the invitation:</p>
      <a href="${inviteUrl}" style="
        display:inline-block;
        padding:12px 24px;
        background:#3B82F6;
        color:white;
        text-decoration:none;
        border-radius:6px;
        font-weight:bold;
        margin:16px 0;
      ">Accept Invitation</a>
      <p style="color:#666;font-size:13px">This invite link expires in 7 days.</p>
      <p style="margin-top:20px;color:#666">Sent by KeySentry — API Key Leak Scanner</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"KeySentry" <${EMAIL_USER}>`,
    to: toEmail,
    subject: `You've been invited to join ${teamName} on KeySentry`,
    html,
  });

  console.log('[Alerts] Invite email sent to', toEmail);
}

async function sendAlerts(findings) {
  if (!findings || findings.length === 0) return;

  const top = findings[0];

  await Promise.allSettled([
    sendEmailAlert(findings),
    sendSlackAlert(findings, top.repo, top.commitSha, top.pusher),
  ]);
}

module.exports = { sendAlerts, sendTeamInviteEmail };