import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { getMeeting, endMeeting } from '../services/meetingService';
import { getMeetingMessages, sendMessage } from '../services/messageService';
import useAuthStore from '../store/authStore';
import { useWebRTC } from '../hooks/useWebRTC';

const MeetingRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(true);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [messageNotification, setMessageNotification] = useState<string | null>(null);
  const isLeavingRef = useRef(false);
  const notificationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: meetingData } = useQuery({
    queryKey: ['meeting', id],
    queryFn: () => getMeeting(id!),
  });

  const { data: messagesData } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => getMeetingMessages(id!),
  });

  // Use the existing hook for peer handling and media control
  const {
    localVideoRef,
    localStream,
    remoteUsers,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    isMediaLoading,
    mediaError,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    cleanupMedia,
  } = useWebRTC(socket, id!, user?._id || '');
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // Do NOT request media automatically on load. Let user opt-in via the join modal buttons.

  useEffect(() => {
    if (messagesData?.messages) setMessages(messagesData.messages);
  }, [messagesData]);

  useEffect(() => {
    // attach stream to preview and main video only when appropriate
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = localStream?.getVideoTracks().length ? localStream : null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = hasJoinedRoom && localStream?.getVideoTracks().length ? localStream : null;
    }
  }, [localStream, hasJoinedRoom]);

  useEffect(() => {
    if (meetingData?.meeting?.participants) setParticipants(meetingData.meeting.participants);
  }, [meetingData]);

  // Socket lifecycle: only join after user chooses to enter the room
  useEffect(() => {
    if (!id || !user || !hasJoinedRoom) return;

    const s = io(import.meta.env.VITE_API_URL, { query: { userName: user?.name || 'Guest' } });
    socketRef.current = s;
    setSocket(s);

    s.emit('meeting:join', { meetingId: id, user });

    s.on('message:received', (message) => {
      setMessages((prev) => [...prev, message]);
      
      // Show notification if message is from someone else
      if (message.senderId !== user?._id) {
        setMessageNotification(`${message.senderName}: ${message.content}`);
        if (notificationTimeoutRef.current) {
          clearTimeout(notificationTimeoutRef.current);
        }
        notificationTimeoutRef.current = setTimeout(() => {
          setMessageNotification(null);
        }, 5000);
      }
    });
    s.on('meeting:participants-updated', ({ participants: updated }) => setParticipants(updated));

    return () => {
      if (!isLeavingRef.current) s.emit('meeting:leave', { meetingId: id, user });
      s.off('message:received');
      s.off('meeting:participants-updated');
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [id, user?._id, hasJoinedRoom]);

  const handleJoinMeeting = () => {
    if (!id || !user) return;
    setShowJoinModal(false);
    setHasJoinedRoom(true);
  };

  const handleLeaveMeeting = () => {
    isLeavingRef.current = true;
    socketRef.current?.emit('meeting:leave', { meetingId: id, user });
    socketRef.current?.disconnect();
    cleanupMedia();
    navigate('/dashboard');
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      const data = await sendMessage(id!, { content: newMessage });
      socketRef.current?.emit('message:send', { meetingId: id, message: data.data });
      setNewMessage('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleEndMeeting = async () => {
    if (!id) return;
    isLeavingRef.current = true;
    try {
      await endMeeting(id);
    } catch (err) {
      console.error(err);
    }
    socketRef.current?.emit('meeting:leave', { meetingId: id, user });
    socketRef.current?.disconnect();
    cleanupMedia();
    navigate(`/meeting/${id}/summary`);
  };

  
  const participantCount = participants.length || meetingData?.meeting?.participants?.length || 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-2xl">
            <h2 className="text-xl font-semibold">Join the meeting</h2>
            <p className="mt-2 text-sm text-gray-400">Choose whether to turn on your camera and microphone before entering the room.</p>

            <div className="mt-4 overflow-hidden rounded-xl bg-black aspect-video">
              {localStream?.getVideoTracks().length ? (
                // separate preview element so main room stays blank until join
                <video ref={previewVideoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-300">
                  {isMediaLoading ? 'Requesting camera and microphone access...' : 'Camera preview will appear here'}
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={async () => { try { await toggleMic(); } catch (e) { console.error(e); } }}
                disabled={isMediaLoading}
                className={`rounded-full px-4 py-2 text-sm transition ${isMicOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isMicOn ? 'Turn mic off' : 'Turn mic on'}
              </button>
              <button
                onClick={async () => { try { await toggleCamera(); } catch (e) { console.error(e); } }}
                disabled={isMediaLoading}
                className={`rounded-full px-4 py-2 text-sm transition ${isCameraOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isCameraOn ? 'Turn camera off' : 'Turn camera on'}
              </button>
            </div>

            {mediaError && <p className="mt-3 text-sm text-amber-400">{mediaError}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => navigate('/dashboard')} className="rounded-lg bg-gray-700 px-4 py-2 text-sm transition hover:bg-gray-600">Cancel</button>
              <button onClick={handleJoinMeeting} className="rounded-lg bg-blue-600 px-4 py-2 text-sm transition hover:bg-blue-700">Join meeting</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-800 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">{meetingData?.meeting?.title || 'Meeting Room'}</h1>
          <p className="text-gray-400 text-sm">Code: {meetingData?.meeting?.meetingCode}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleLeaveMeeting} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition">Leave Meeting</button>
          {meetingData?.meeting?.host?._id === user?._id && (
            <button onClick={handleEndMeeting} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm transition">End Meeting</button>
          )}
        </div>
      </div>

      {hasJoinedRoom ? (
        <div className="flex flex-1 overflow-hidden h-screen">
          <div className="flex-1 flex flex-col p-3 sm:p-4 min-h-0 w-full">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 auto-rows-fr min-h-0 overflow-y-auto">
              <div className="bg-black rounded-lg relative overflow-hidden flex items-center justify-center min-h-[200px] sm:min-h-[220px]">
                <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-2 left-2 flex items-center gap-2 rounded bg-black/60 px-2 py-1 text-xs">
                  <span>You</span>
                  {!isMicOn && <span>🔇</span>}
                  <SpeakingIndicator stream={localStream || null} />
                </div>
              </div>

              {
                // Build a participant-first list so we always show a tile per participant,
                // even if they have no active video stream.
                (() => {
                  const tiles: any[] = [];
                  const seen = new Set<string>();

                  // Render participants from meeting data first
                  for (const p of participants) {
                    const pid = p._id || p.user?._id;
                    if (!pid || pid === user?._id) continue;
                    seen.add(pid);
                    const remote = remoteUsers.get(pid);
                    if (remote && remote.stream) {
                      tiles.push(<RemoteVideo key={pid} stream={remote.stream} name={remote.name || p.name || p.user?.name || 'Guest'} />);
                    } else {
                      tiles.push(<PlaceholderTile key={pid} name={p.name || p.user?.name || 'Guest'} />);
                    }
                  }

                  // Also include any remote users we have connections for but weren't in participants list yet
                  for (const [uid, remoteUser] of remoteUsers.entries()) {
                    if (uid === user?._id) continue;
                    if (seen.has(uid)) continue;
                    seen.add(uid);
                    tiles.push(<RemoteVideo key={uid} stream={remoteUser.stream} name={remoteUser.name || 'Guest'} />);
                  }

                  return tiles.length ? tiles : null;
                })()
              }
            </div>

            <div className="flex justify-center gap-2 sm:gap-4 py-3 sm:py-4 flex-wrap">
              <button onClick={async () => { try { await toggleMic(); } catch(e: any){ console.error('Mic error:', e); } }} disabled={isMediaLoading} className={`p-3 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed ${isMicOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>{isMicOn ? '🎤' : '🔇'}</button>
              <button onClick={async () => { try { await toggleCamera(); } catch(e){console.error(e)} }} disabled={isMediaLoading} className={`p-3 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed ${isCameraOn ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>{isCameraOn ? '📹' : '📷'}</button>
              <button onClick={async () => { try { await toggleScreenShare(); } catch(e){console.error(e)} }} disabled={isMediaLoading} className={`p-3 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed ${isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}>🖥️</button>
              <button onClick={() => setShowChat(!showChat)} className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition">💬</button>
            </div>
            
            {messageNotification && (
              <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg max-w-sm z-30 animate-pulse">
                <p className="text-sm font-semibold">📩 New Message</p>
                <p className="text-xs mt-1 truncate">{messageNotification}</p>
              </div>
            )}
            
            {mediaError && <p className="text-center text-sm text-amber-400 mt-2">{mediaError}</p>}
          </div>

          {showChat && (
            <div className="fixed inset-0 z-40 lg:static lg:w-80 lg:relative bg-gray-800 flex flex-col lg:border-l lg:border-gray-700 overflow-hidden">
              {/* Mobile close button */}
              <button onClick={() => setShowChat(false)} className="lg:hidden absolute top-4 right-4 text-white text-2xl z-50">✕</button>
              
              <div className="p-4 border-b border-gray-700 lg:border-b">
                <h2 className="font-semibold mb-3 text-sm">Participants ({participantCount})</h2>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {participants.map((p: any) => (
                    <div key={p._id || p.user?._id} className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold">{(p.name || p.user?.name || 'U')?.[0]}</div>
                      <span className="text-sm">{p.name || p.user?.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col flex-1 p-4 overflow-hidden">
                <h2 className="font-semibold mb-3 text-sm">Chat</h2>
                <div className="flex-1 overflow-y-auto space-y-2 mb-3">
                  {messages.map((msg: any, index) => (
                    <div key={index} className={`flex ${msg.sender?._id === user?._id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-2 rounded-lg text-sm ${msg.sender?._id === user?._id ? 'bg-blue-600' : 'bg-gray-700'}`}>
                        <p className="text-xs text-gray-300 mb-1">{msg.sender?.name}</p>
                        <p>{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()} placeholder="Type a message..." className="flex-1 bg-gray-700 text-white p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={handleSendMessage} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm transition">Send</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-gray-400">You are not in the meeting yet. Click Join to enter.</div>
        </div>
      )}
    </div>
  );
};

const SpeakingIndicator = ({ stream }: { stream: MediaStream | null }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!stream) {
      setIsSpeaking(false);
      return;
    }

    const audioContext = new window.AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let rafId = 0;

    const tick = () => {
      analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length / 255;
      setIsSpeaking(average > 0.08);
      rafId = window.requestAnimationFrame(tick);
    };

    tick();

    return () => {
      window.cancelAnimationFrame(rafId);
      source.disconnect();
      analyser.disconnect();
      audioContext.close();
    };
  }, [stream]);

  if (!stream) return null;

  return (
    <span className={`inline-flex gap-1 ${isSpeaking ? 'text-green-400' : 'text-gray-400'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isSpeaking ? 'animate-pulse bg-green-400' : 'bg-gray-500'}`} />
      <span className={`h-1.5 w-1.5 rounded-full ${isSpeaking ? 'animate-pulse bg-green-400' : 'bg-gray-500'}`} />
      <span className={`h-1.5 w-1.5 rounded-full ${isSpeaking ? 'animate-pulse bg-green-400' : 'bg-gray-500'}`} />
    </span>
  );
};

const RemoteVideo = ({ stream, name }: { stream: MediaStream; name: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="bg-black rounded-lg relative overflow-hidden flex items-center justify-center min-h-[200px] sm:min-h-[240px]">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <span className="absolute bottom-2 left-2 bg-black/60 text-xs px-2 py-1 rounded">{name}</span>
    </div>
  );
};

const PlaceholderTile = ({ name }: { name: string }) => {
  const initial = (name || 'U')[0].toUpperCase();
  return (
    <div className="bg-black rounded-lg relative overflow-hidden flex items-center justify-center min-h-[200px] sm:min-h-[240px]">
      <div className="flex flex-col items-center gap-2">
        <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl">{initial}</div>
        <div className="text-xs text-gray-300">{name}</div>
      </div>
      <span className="absolute bottom-2 left-2 bg-black/60 text-xs px-2 py-1 rounded">{name}</span>
    </div>
  );
};

export default MeetingRoom;