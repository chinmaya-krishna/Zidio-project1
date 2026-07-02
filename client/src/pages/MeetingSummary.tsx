import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMeeting } from '../services/meetingService';

const MeetingSummary = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['meeting', id],
    queryFn: () => getMeeting(id!),
  });

  const meeting = data?.meeting;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p>Loading summary...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gray-800 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">🤖 IntellMeet</h1>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-gray-800 p-6 rounded-xl">
          <h2 className="text-2xl font-bold mb-2">{meeting?.title}</h2>
          <p className="text-gray-400 text-sm">
            Code: {meeting?.meetingCode} • Status: {meeting?.status}
          </p>
        </div>

        <div className="bg-gray-800 p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4">🤖 AI Summary</h3>
          {meeting?.aiSummary ? (
            <p className="text-gray-300 leading-relaxed">{meeting.aiSummary}</p>
          ) : (
            <p className="text-gray-400">No AI summary available yet.</p>
          )}
        </div>

        <div className="bg-gray-800 p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4">✅ Action Items</h3>
          {meeting?.actionItems?.length === 0 ? (
            <p className="text-gray-400">No action items found.</p>
          ) : (
            <div className="space-y-3">
              {meeting?.actionItems?.map((item: any, index: number) => (
                <div key={index} className="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item.task}</p>
                    <p className="text-gray-400 text-sm">
                      Assigned to: {item.assignedTo?.name || 'Unassigned'}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    item.isCompleted ? 'bg-green-600' : 'bg-yellow-600'
                  }`}>
                    {item.isCompleted ? 'Done' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-800 p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4">👥 Participants</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {meeting?.participants?.map((p: any) => (
              <div key={p.user?._id} className="bg-gray-700 p-3 rounded-lg text-center">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-2">
                  {p.user?.name?.[0]?.toUpperCase()}
                </div>
                <p className="text-sm font-medium">{p.user?.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingSummary;