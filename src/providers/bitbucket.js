const axios = require('axios');

async function fetchFileContent(repoFullName, sha, filePath, token) {
  try {
    const url = `https://api.bitbucket.org/2.0/repositories/${repoFullName}/src/${sha}/${filePath}`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 8000,
    });
    return typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data);
  } catch (err) {
    if (err.response?.status === 404) return null;
    console.warn(`[Bitbucket] Could not fetch ${filePath}:`, err.message);
    return null;
  }
}

async function listUserRepos(token) {
  const response = await axios.get('https://api.bitbucket.org/2.0/repositories', {
    headers: { Authorization: `Bearer ${token}` },
    params: { role: 'owner', pagelen: 100 }
  });
  return response.data.values.map(r => ({
    id: r.uuid,
    fullName: r.full_name,
    description: r.description,
    private: r.is_private,
    language: r.language,
    updatedAt: r.updated_on,
  }));
}

async function installWebhook(repoFullName, token, webhookURL, secret) {
  const response = await axios.post(
    `https://api.bitbucket.org/2.0/repositories/${repoFullName}/hooks`,
    {
      description: 'KeySentry secret scanner',
      url: webhookURL,
      active: true,
      events: ['repo:push']
    },
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.data.uuid;
}

module.exports = { fetchFileContent, listUserRepos, installWebhook };