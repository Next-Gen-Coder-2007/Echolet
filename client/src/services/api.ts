import axios from 'axios';

export const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_SERVER_URL;

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
