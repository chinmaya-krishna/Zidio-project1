import api from './api.js';

// Signup
export const signup = async (data) => {
  const response = await api.post('/api/auth/signup', data);
  return response.data;
};

// Login
export const login = async (data) => {
  const response = await api.post('/api/auth/login', data);
  return response.data;
};

// Logout
export const logout = async () => {
  const response = await api.post('/api/auth/logout');
  return response.data;
};

// Get current user
export const getMe = async () => {
  const response = await api.get('/api/auth/me');
  return response.data;
};
