import axios from "axios";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

const api = axios.create({
  baseURL: SERVER_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export const healthCheck = async() => {
  const res = await api.get('health');
  return res.data;
}

export default api;