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

  // Step 1: get the user's workspaces via the new permissions-based endpoint
  // (GET /2.0/workspaces and GET /2.0/repositories were both removed under CHANGE-2770)
  const slugs = [];
  let wsUrl = 'https://api.bitbucket.org/2.0/user/permissions/workspaces';
  let wsParams = { pagelen: 100 };

  while (wsUrl) {
    const res = await axios.get(wsUrl, { headers, params: wsParams });
    for (const v of res.data.values || []) {
      if (v.workspace?.slug) slugs.push(v.workspace.slug);
    }
    wsUrl = res.data.next || null;
    wsParams = undefined;
  }

  // Step 2: list repos per workspace, following pagination
  const allRepos = [];
  for (const slug of slugs) {
    let url = `https://api.bitbucket.org/2.0/repositories/${slug}`;
    let params = { role: 'member', pagelen: 100 };

    while (url) {
      const res = await axios.get(url, { headers, params });
      allRepos.push(...res.data.values);
      url = res.data.next || null;
      params = undefined;
    }
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