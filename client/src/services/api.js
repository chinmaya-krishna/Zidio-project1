import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// Add interceptor to send token in Authorization header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Save token from response if provided
api.interceptors.response.use((response) => {
  if (response.data?.token) {
    localStorage.setItem('token', response.data.token);
  }
  return response;
});

export default api;
