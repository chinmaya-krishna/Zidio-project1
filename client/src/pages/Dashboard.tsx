import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createMeeting, joinMeeting, getMyMeetings, deleteMeeting } from '../services/meetingService.js';
import { logout } from '../services/authService.js';
import useAuthStore from '../store/authStore.js';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout: logoutStore } = useAuthStore();
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingCode, setMeetingCode] = useState('');
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [loadingJoin, setLoadingJoin] = useState(false);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['meetings'],
    queryFn: getMyMeetings,
  });

  const handleCreateMeeting = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!meetingTitle) return;
    setLoadingCreate(true);
    setError('');
    try {
      const data = await createMeeting({ title: meetingTitle });
      navigate(`/meeting/${data.meeting._id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create meeting');
    } finally {
      setLoadingCreate(false);
    }
  };

  const handleJoinMeeting = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!meetingCode) return;
    setLoadingJoin(true);
    setError('');
    try {
      const data = await joinMeeting(meetingCode.trim().toUpperCase());
      navigate(`/meeting/${data.meeting._id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join meeting');
    } finally {
      setLoadingJoin(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Always clear local state even if API call fails
      logoutStore();
      // Clear all app state and navigate
      queryClient.clear();
      navigate('/login');
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    setLoadingCreate(false);
    setLoadingJoin(false);
    setError('');
    try {
      await deleteMeeting(id);
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete meeting');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      
      {/* Navbar */}
      <div className="bg-gray-800 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">🤖 IntellMeet</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-400">Hello, {user?.name}!</span>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm transition"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">

        {/* Error */}
        {error && (
          <div className="bg-red-500 text-white p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* Create Meeting */}
          <div className="bg-gray-800 p-6 rounded-xl">
            <h2 className="text-lg font-semibold mb-4">Create Meeting</h2>
            <form onSubmit={handleCreateMeeting}>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="Meeting title"
                className="w-full bg-gray-700 text-white p-3 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={loadingCreate}
                className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded-lg font-semibold transition disabled:opacity-50"
              >
                {loadingCreate ? 'Creating...' : '+ New Meeting'}
              </button>
            </form>
          </div>

          {/* Join Meeting */}
          <div className="bg-gray-800 p-6 rounded-xl">
            <h2 className="text-lg font-semibold mb-4">Join Meeting</h2>
            <form onSubmit={handleJoinMeeting}>
              <input
                type="text"
                value={meetingCode}
                onChange={(e) => setMeetingCode(e.target.value)}
                placeholder="Enter meeting code"
                className="w-full bg-gray-700 text-white p-3 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                type="submit"
                disabled={loadingJoin}
                className="w-full bg-green-600 hover:bg-green-700 p-3 rounded-lg font-semibold transition disabled:opacity-50"
              >
                {loadingJoin ? 'Joining...' : 'Join Meeting'}
              </button>
            </form>
          </div>
        </div>

        {/* My Meetings */}
        <div className="bg-gray-800 p-6 rounded-xl">
          <h2 className="text-lg font-semibold mb-4">My Meetings</h2>
          {(!data?.meetings || data.meetings.length === 0) && (
            <p className="text-gray-400">No meetings yet. Create one! 😊</p>
          )}
          <div className="space-y-3">
            {data?.meetings && data.meetings.map((meeting: any) => (
              <div
                key={meeting._id}
                className="bg-gray-700 p-4 rounded-lg flex justify-between items-center"
              >
                <div>
                  <h3 className="font-semibold">{meeting.title}</h3>
                  <p className="text-gray-400 text-sm">
                    Code: {meeting.meetingCode} • Status: {meeting.status}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/meeting/${meeting._id}`)}
                    className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm transition"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => handleDeleteMeeting(meeting._id)}
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
