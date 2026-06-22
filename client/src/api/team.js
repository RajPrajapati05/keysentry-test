import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
const api = axios.create({ baseURL: BACKEND_URL, withCredentials: true });

export const getTeam = () => api.get('/api/team').then(r => r.data);
export const createTeam = (name) => api.post('/api/team/create', { name }).then(r => r.data);
export const inviteMember = (email, role) => api.post('/api/team/invite', { email, role }).then(r => r.data);
export const acceptInvite = (token) => api.post('/api/team/accept-invite', { token }).then(r => r.data);
export const changeMemberRole = (userId, role) => api.patch(`/api/team/members/${userId}/role`, { role }).then(r => r.data);
export const removeMember = (userId) => api.delete(`/api/team/members/${userId}`).then(r => r.data);