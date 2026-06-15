const crypto = require('crypto');

function validateWebhookSignature(rawBody, signature, secret) {
  if (!secret) return false;

  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

module.exports = { validateWebhookSignature };