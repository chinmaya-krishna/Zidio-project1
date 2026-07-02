import api from './api.js';

// Send message
export const sendMessage = async (meetingId, data) => {
  const response = await api.post(`/api/messages/${meetingId}/send`, data);
  return response.data;
};

// Get meeting messages
export const getMeetingMessages = async (meetingId) => {
  const response = await api.get(`/api/messages/${meetingId}/messages`);
  return response.data;
};
