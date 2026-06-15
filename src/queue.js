require('dotenv').config();
const Bull = require('bull');

const redisUrl = process.env.REDIS_URL;

const scanQueue = new Bull('scan-commits', {
  redis: {
    host: 'pleasing-chimp-123607.upstash.io',
    port: 6379,
    password: 'gQAAAAAAAeLXAAIgcDE0YmU1ZDRiODEyYzQ0ZWI2OGU1MzA1ODc5ZTcxZWRkMg',
    tls: {},
    family: 4,
  }
});

scanQueue.on('error', (err) => {
  console.error('[Queue] Error:', err.message);
});

scanQueue.on('completed', (job, result) => {
  console.log(`[Queue] Job ${job.id} done — ${result.secretsFound} secret(s) found`);
});

scanQueue.on('failed', (job, err) => {
  console.error(`[Queue] Job ${job.id} failed:`, err.message);
});

module.exports = { scanQueue };