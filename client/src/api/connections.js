const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

export const connectGitLab = () => {
  window.location.href = `${BACKEND_URL}/connections/gitlab`;
};

export const connectBitbucket = () => {
  window.location.href = `${BACKEND_URL}/connections/bitbucket`;
};