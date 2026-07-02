import api from './api.js';

// Create meeting
export const createMeeting = async (data) => {
  const response = await api.post('/api/meetings/create', data);
  return response.data;
};

// Join meeting
export const joinMeeting = async (meetingCode) => {
  const response = await api.post(`/api/meetings/join/${meetingCode}`);
  return response.data;
};

// Get my meetings
export const getMyMeetings = async () => {
  const response = await api.get('/api/meetings/my-meetings');
  return response.data;
};

// Get single meeting
export const getMeeting = async (id) => {
  const response = await api.get(`/api/meetings/${id}`);
  return response.data;
};

// End meeting
export const endMeeting = async (id) => {
  const response = await api.put(`/api/meetings/end/${id}`);
  return response.data;
};

// Delete or leave meeting
export const deleteMeeting = async (id) => {
  const response = await api.delete(`/api/meetings/${id}`);
  return response.data;
};
