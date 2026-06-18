import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

export const getConnectedRepos = () => API.get('/repos');
export const getGithubRepos = () => API.get('/repos/github');
export const connectRepo = (repoFullName) => API.post('/repos/connect', { repoFullName });
export const disconnectRepo = (repoFullName) => API.delete('/repos/disconnect', { data: { repoFullName } });