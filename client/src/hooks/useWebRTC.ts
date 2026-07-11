import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

interface PeerConnection {
  userId: string;
  connection: RTCPeerConnection;
}

interface RemoteUser {
  userId: string;
  name: string;
  stream: MediaStream;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const useWebRTC = (socket: Socket | null, meetingId: string, userId: string) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<Map<string, RemoteUser>>(new Map());
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const namesRef = useRef<Map<string, string>>(new Map());
  const streamRef = useRef<MediaStream | null>(null);

  const updateLocalVideo = () => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = streamRef.current?.getVideoTracks().length ? streamRef.current : null;
    }
  };

  const stopTrack = (kind: 'audio' | 'video') => {
    const stream = streamRef.current;
    if (!stream) return;

    const track = stream.getTracks().find((t) => t.kind === kind);
    if (!track) return;

    track.stop();
    stream.removeTrack(track);

    if (kind === 'audio') {
      setIsMicOn(false);
      socket?.emit('meeting:mute', { meetingId, userId, isMuted: true });
    }

    if (kind === 'video') {
      setIsCameraOn(false);
      updateLocalVideo();
    }

    if (!stream.getAudioTracks().length && !stream.getVideoTracks().length) {
      setLocalStream(null);
      streamRef.current = null;
      updateLocalVideo();
    }
  };

  const requestTrack = async (kind: 'audio' | 'video') => {
    try {
      // On mobile, request both audio and video together for better compatibility
      const isAudio = kind === 'audio';
      const isVideo = kind === 'video';
      
      const constraints = {
        audio: isAudio || isVideo ? true : false,
        video: isVideo ? true : false,
      };

      if (isVideo) {
        (constraints.video as any) = {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        };
      }

      const trackStream = await navigator.mediaDevices.getUserMedia(constraints);
      const tracks = trackStream.getTracks();
      
      if (tracks.length === 0) {
        throw new Error(`Unable to get ${kind} track`);
      }

      let stream = streamRef.current;
      if (!stream) {
        stream = new MediaStream();
        streamRef.current = stream;
      }

      for (const track of tracks) {
        const existing = stream.getTracks().find((t) => t.kind === track.kind);
        if (existing) {
          stream.removeTrack(existing);
          existing.stop();
        }
        stream.addTrack(track);
      }

      streamRef.current = stream;
      setLocalStream(new MediaStream(stream.getTracks()));
      setIsMediaReady(true);

      // Update state based on what tracks we have
      const hasVideo = stream.getVideoTracks().length > 0;
      const hasAudio = stream.getAudioTracks().length > 0;

      if (hasVideo) {
        updateLocalVideo();
        setIsCameraOn(true);
      }
      if (hasAudio) {
        setIsMicOn(true);
        socket?.emit('meeting:mute', { meetingId, userId, isMuted: false });
      }

      // Add all new tracks to peers
      for (const track of tracks) {
        await addTrackToPeers(track);
      }

      console.log(`✅ Successfully requested ${kind} track - Video: ${hasVideo}, Audio: ${hasAudio}`);
    } catch (err: any) {
      console.error(`Error requesting ${kind} track:`, err.name, err.message);
      setMediaError(err.message || `Failed to access ${kind}`);
      throw err;
    }
  };

  const addTrackToPeers = async (track: MediaStreamTrack) => {
    if (!socket || !streamRef.current) return;
    for (const [remoteUserId, peer] of peersRef.current.entries()) {
      const sender = peer.connection.getSenders().find((s) => s.track?.kind === track.kind);
      if (sender) {
        await sender.replaceTrack(track);
      } else {
        peer.connection.addTrack(track, streamRef.current);
      }

      const offer = await peer.connection.createOffer();
      await peer.connection.setLocalDescription(offer);
      socket.emit('webrtc:offer', {
        meetingId,
        offer,
        from: userId,
        to: remoteUserId,
      });
    }
  };

  const cleanupMedia = () => {
    stopTrack('audio');
    stopTrack('video');
    peersRef.current.forEach((peer) => peer.connection.close());
    peersRef.current.clear();
    namesRef.current.clear();
    setRemoteUsers(new Map());
    setIsMediaReady(false);
    setIsMicOn(false);
    setIsCameraOn(false);
  };

  const prepareMedia = async (options: { audio?: boolean; video?: boolean } = {}) => {
    const { audio = false, video = false } = options;
    setIsMediaLoading(true);
    setMediaError(null);

    try {
      if (audio && !streamRef.current?.getAudioTracks().length) {
        await requestTrack('audio');
      }
      if (video && !streamRef.current?.getVideoTracks().length) {
        await requestTrack('video');
      }
      setIsMediaReady(true);
      return true;
    } catch (err: any) {
      console.error('Error accessing camera/mic:', err);
      setMediaError('Camera and microphone access was denied or unavailable.');
      return false;
    } finally {
      setIsMediaLoading(false);
    }
  };

  const removePeer = (remoteUserId: string) => {
    const peer = peersRef.current.get(remoteUserId);
    peer?.connection.close();
    peersRef.current.delete(remoteUserId);
    namesRef.current.delete(remoteUserId);
    setRemoteUsers((prev) => {
      const updated = new Map(prev);
      updated.delete(remoteUserId);
      return updated;
    });
  };

  const createPeerConnection = (remoteUserId: string, remoteName: string, stream: MediaStream | null) => {
    if (peersRef.current.has(remoteUserId)) {
      peersRef.current.get(remoteUserId)?.connection.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    namesRef.current.set(remoteUserId, remoteName);

    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    pc.ontrack = (event) => {
      setRemoteUsers((prev) => {
        const updated = new Map(prev);
        updated.set(remoteUserId, {
          userId: remoteUserId,
          name: namesRef.current.get(remoteUserId) || 'Guest',
          stream: event.streams[0],
        });
        return updated;
      });
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket?.emit('webrtc:ice-candidate', {
          meetingId,
          candidate: event.candidate,
          from: userId,
          to: remoteUserId,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        removePeer(remoteUserId);
      }
    };

    peersRef.current.set(remoteUserId, { userId: remoteUserId, connection: pc });
    return pc;
  };

  useEffect(() => {
    if (!socket) return;

    const handleUserJoined = async ({ user: remoteUser }: any) => {
      if (remoteUser._id === userId) return;
      const pc = createPeerConnection(remoteUser._id, remoteUser.name, streamRef.current);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc:offer', {
        meetingId,
        offer,
        from: userId,
        to: remoteUser._id,
      });
    };

    const handleOffer = async ({ offer, from, fromName }: any) => {
      if (from === userId) return;
      const pc = createPeerConnection(from, fromName || 'Guest', streamRef.current);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc:answer', { meetingId, answer, from: userId, to: from });
    };

    const handleAnswer = async ({ answer, from }: any) => {
      const peer = peersRef.current.get(from);
      if (peer && peer.connection.signalingState !== 'stable') {
        await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const handleICE = async ({ candidate, from }: any) => {
      const peer = peersRef.current.get(from);
      if (peer) {
        try {
          await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    };

    const handleUserLeft = ({ user: remoteUser }: any) => {
      removePeer(remoteUser._id);
    };

    const handleExistingParticipants = async ({ participants }: any) => {
      for (const p of participants) {
        if (p._id === userId) continue;
        const pc = createPeerConnection(p._id, p.name, streamRef.current);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc:offer', {
          meetingId,
          offer,
          from: userId,
          to: p._id,
        });
      }
    };

    socket.on('meeting:user-joined', handleUserJoined);
    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleICE);
    socket.on('meeting:user-left', handleUserLeft);
    socket.on('meeting:existing-participants', handleExistingParticipants);

    return () => {
      socket.off('meeting:user-joined', handleUserJoined);
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleICE);
      socket.off('meeting:user-left', handleUserLeft);
      socket.off('meeting:existing-participants', handleExistingParticipants);
    };
  }, [socket]);

  useEffect(() => {
    return () => {
      cleanupMedia();
    };
  }, []);

  const toggleMic = async () => {
    if (isMicOn) {
      stopTrack('audio');
    } else {
      try {
        await requestTrack('audio');
      } catch (err) {
        console.error('Error enabling mic:', err);
      }
    }
  };

  const toggleCamera = async () => {
    if (isCameraOn) {
      stopTrack('video');
    } else {
      try {
        await requestTrack('video');
      } catch (err) {
        console.error('Error enabling camera:', err);
      }
    }
  };

  return {
    localVideoRef,
    localStream,
    remoteUsers,
    isMicOn,
    isCameraOn,
    isMediaLoading,
    isMediaReady,
    mediaError,
    toggleMic,
    toggleCamera,
    prepareMedia,
    cleanupMedia,
  };
};
