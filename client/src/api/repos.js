import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
const API = axios.create({ baseURL: BACKEND_URL });

export const getConnectedRepos = () => API.get('/api/repos');
export const getGithubRepos = () => API.get('/api/repos/github');
export const connectRepo = (repoFullName) => API.post('/api/repos/connect', { repoFullName });
export const disconnectRepo = (repoFullName) => API.delete('/api/repos/disconnect', { data: { repoFullName } });