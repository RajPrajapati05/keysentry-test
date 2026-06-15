require('dotenv').config();
const nodemailer = require('nodemailer');

async function sendEmailAlert(findings) {
  const { EMAIL_HOST, EMAIL_USER, EMAIL_PASS, ALERT_EMAIL_TO } = process.env;

  if (!EMAIL_HOST || !ALERT_EMAIL_TO) {
    console.warn('[Alerts] Email not configured — skipping');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: 587,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  const top = findings[0];

  const rows = findings.map(f => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${f.description}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${f.filePath}:${f.lineNumber}</td>
      <td style="padding:8px;border-bottom:1px solid #eee">${f.matchedValue}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;color:red;font-weight:bold">${f.severity.toUpperCase()}</td>
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
      <p style="margin-top:20px;color:#666">
        Sent by KeySentry — API Key Leak Scanner
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"KeySentry" <${EMAIL_USER}>`,
    to: ALERT_EMAIL_TO,
    subject: `[${top.severity.toUpperCase()}] Secret leaked in ${top.repo}`,
    html,
  });

  console.log('[Alerts] Email sent to', ALERT_EMAIL_TO);
}

async function sendAlerts(findings) {
  await Promise.allSettled([
    sendEmailAlert(findings),
  ]);
}

module.exports = { sendAlerts };