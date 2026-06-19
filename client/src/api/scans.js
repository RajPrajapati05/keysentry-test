import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';
const API = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true
});

export const getScans = () => API.get('/api/scans');
export const getScanById = (id) => API.get(`/api/scans/${id}`);