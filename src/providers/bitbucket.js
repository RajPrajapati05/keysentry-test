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
  const headers = { Authorization: `Bearer ${token}` };
  const workspace = process.env.BITBUCKET_WORKSPACE;

  if (!workspace) {
    throw new Error('BITBUCKET_WORKSPACE env var is not set');
  }

  const allRepos = [];
  let url = `https://api.bitbucket.org/2.0/repositories/${workspace}`;
  let params = { role: 'member', pagelen: 100 };

  while (url) {
    const res = await axios.get(url, { headers, params });
    allRepos.push(...res.data.values);
    url = res.data.next || null;
    params = undefined;
  }

  return allRepos.map(r => ({
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