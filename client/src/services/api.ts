import axios from 'axios';

const serverUrl = (import.meta.env.VITE_SERVER_URL || '').replace(/\/api\/?$/, '').replace(/\/$/, '');
export const API_URL = `${serverUrl}/api`;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
