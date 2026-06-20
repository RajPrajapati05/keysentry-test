import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
const API = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true
});

export const getConnectedRepos = () => API.get('/api/repos');
export const getProviderRepos = (provider) => API.get(`/api/repos/${provider}`);
export const connectRepo = (repoFullName, provider) =>
  API.post('/api/repos/connect', { repoFullName, provider });
export const disconnectRepo = (repoFullName, provider) =>
  API.delete('/api/repos/disconnect', { data: { repoFullName, provider } });
export const getConnectionStatus = () => API.get('/connections/status');