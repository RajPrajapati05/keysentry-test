import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

export const getScans = () => API.get('/scans');
export const getScanById = (id) => API.get(`/scans/${id}`);
export const getStats = () => API.get('/scans/stats');