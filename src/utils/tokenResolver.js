const User = require('../db/models/User');
const { getProvider } = require('../providers');

// Returns a valid access token for the given user + provider,
// refreshing it first if needed (currently only GitLab supports refresh).
async function getValidToken(userId, providerName) {
  const user = await User.findById(userId);
  if (!user) return null;

  if (providerName === 'github') {
    return user.accessToken || null;
  }

  const conn = user.connections?.[providerName];
  if (!conn?.accessToken) return null;

  if (providerName === 'gitlab') {
    const isExpired = !conn.expiresAt || new Date(conn.expiresAt).getTime() < Date.now() + 60000;
    if (isExpired) {
      if (!conn.refreshToken) return null;
      const provider = getProvider('gitlab');
      const refreshed = await provider.refreshAccessToken(conn.refreshToken);

      await User.findByIdAndUpdate(userId, {
        'connections.gitlab.accessToken': refreshed.access_token,
        'connections.gitlab.refreshToken': refreshed.refresh_token,
        'connections.gitlab.expiresAt': new Date(Date.now() + refreshed.expires_in * 1000)
      });

      return refreshed.access_token;
    }
  }

  return conn.accessToken;
}

module.exports = { getValidToken };