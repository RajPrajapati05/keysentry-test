const axios = require('axios');

async function fetchFileContent(repoFullName, sha, filePath, token) {
  try {
    const [owner, repoName] = repoFullName.split('/');
    const url = `https://api.github.com/repos/${owner}/${repoName}/contents/${filePath}?ref=${sha}`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3.raw',
      },
      timeout: 8000,
    });
    return typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data);
  } catch (err) {
    if (err.response?.status === 404) return null;
    console.warn(`[GitHub] Could not fetch ${filePath}:`, err.message);
    return null;
  }
}

async function listUserRepos(token) {
  const response = await axios.get('https://api.github.com/user/repos', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
    params: { per_page: 100, sort: 'updated', affiliation: 'owner' }
  });
  return response.data.map(r => ({
    id: r.id,
    fullName: r.full_name,
    description: r.description,
    private: r.private,
    language: r.language,
    updatedAt: r.updated_at,
  }));
}

async function installWebhook(repoFullName, token, webhookURL, secret) {
  const [owner, repo] = repoFullName.split('/');
  const response = await axios.post(
    `https://api.github.com/repos/${owner}/${repo}/hooks`,
    {
      name: 'web',
      active: true,
      events: ['push'],
      config: {
        url: webhookURL,
        content_type: 'json',
        secret,
        insecure_ssl: '0'
      }
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
      }
    }
  );
  return response.data.id;
}

module.exports = { fetchFileContent, listUserRepos, installWebhook };