import api from './api.js';

// Create task
export const createTask = async (data) => {
  const response = await api.post('/api/tasks/create', data);
  return response.data;
};

// Get my tasks
export const getMyTasks = async () => {
  const response = await api.get('/api/tasks/my-tasks');
  return response.data;
};

// Update task status
export const updateTaskStatus = async (id, status) => {
  const response = await api.put(`/api/tasks/${id}/status`, { status });
  return response.data;
};

// Delete task
export const deleteTask = async (id) => {
  const response = await api.delete(`/api/tasks/${id}`);
  return response.data;
};
