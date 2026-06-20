const axios = require('axios');

async function fetchFileContent(repoFullName, sha, filePath, token) {
  try {
    const projectId = encodeURIComponent(repoFullName);
    const filePathEncoded = encodeURIComponent(filePath);
    const url = `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${filePathEncoded}/raw?ref=${sha}`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 8000,
    });
    return typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data);
  } catch (err) {
    if (err.response?.status === 404) return null;
    console.warn(`[GitLab] Could not fetch ${filePath}:`, err.message);
    return null;
  }
}

async function listUserRepos(token) {
  const response = await axios.get('https://gitlab.com/api/v4/projects', {
    headers: { Authorization: `Bearer ${token}` },
    params: { membership: true, per_page: 100, order_by: 'last_activity_at' }
  });
  return response.data.map(r => ({
    id: r.id,
    fullName: r.path_with_namespace,
    description: r.description,
    private: r.visibility !== 'public',
    language: null,
    updatedAt: r.last_activity_at,
  }));
}

async function installWebhook(repoFullName, token, webhookURL, secret) {
  const projectId = encodeURIComponent(repoFullName);
  const response = await axios.post(
    `https://gitlab.com/api/v4/projects/${projectId}/hooks`,
    {
      url: webhookURL,
      push_events: true,
      token: secret,
      enable_ssl_verification: true
    },
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.data.id;
}

async function refreshAccessToken(refreshToken) {
  const response = await axios.post('https://gitlab.com/oauth/token', {
    client_id: process.env.GITLAB_CLIENT_ID,
    client_secret: process.env.GITLAB_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });
  return response.data; // { access_token, refresh_token, expires_in, ... }
}

module.exports = { fetchFileContent, listUserRepos, installWebhook, refreshAccessToken };