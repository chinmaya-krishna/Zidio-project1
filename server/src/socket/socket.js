import { Server } from 'socket.io';

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  return origin === 'http://localhost:5173' ||
    origin === 'http://localhost:3000' ||
    origin === 'https://localhost:5173' ||
    origin === process.env.CLIENT_URL ||
    origin === process.env.RENDER_CLIENT_URL ||
    /\.vercel\.app$/i.test(origin) ||
    /\.vercel\.dev$/i.test(origin) ||
    /\.onrender\.com$/i.test(origin);
};

const configureSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new Error('CORS not allowed'));
        }
      },
      credentials: true,
    },
  });

  const onlineUsers = new Map();
  const meetingRooms = new Map();

  const broadcastParticipants = (meetingId) => {
    const participants = meetingRooms.get(meetingId) || [];
    io.to(meetingId).emit('meeting:participants-updated', { participants });
  };

  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    socket.on('user:online', (userId) => {
      onlineUsers.set(userId, socket.id);
      io.emit('users:online', Array.from(onlineUsers.keys()));
    });

    socket.on('meeting:join', ({ meetingId, user }) => {
      socket.join(meetingId);
      socket.data.user = user;

      if (!meetingRooms.has(meetingId)) {
        meetingRooms.set(meetingId, []);
      }

      const participants = meetingRooms.get(meetingId);
      const existingIndex = participants.findIndex((participant) => participant._id === user._id);
      if (existingIndex === -1) {
        participants.push({ ...user, socketId: socket.id });
      } else {
        participants[existingIndex] = { ...user, socketId: socket.id };
      }

      const roomParticipants = meetingRooms.get(meetingId) || [];
      socket.emit('meeting:existing-participants', { participants: roomParticipants });
      socket.to(meetingId).emit('meeting:user-joined', { user });
      broadcastParticipants(meetingId);
      console.log(`👤 ${user.name} joined meeting ${meetingId}`);
    });

    socket.on('meeting:leave', ({ meetingId, user }) => {
      if (!meetingId) return;

      socket.leave(meetingId);
      if (meetingRooms.has(meetingId)) {
        const participants = meetingRooms.get(meetingId);
        const filtered = participants.filter((participant) => participant._id !== user?._id);
        if (filtered.length > 0) {
          meetingRooms.set(meetingId, filtered);
        } else {
          meetingRooms.delete(meetingId);
        }
        broadcastParticipants(meetingId);
      }

      socket.to(meetingId).emit('meeting:user-left', { user });
      console.log(`👤 ${user?.name || 'A user'} left meeting ${meetingId}`);
    });

    socket.on('message:send', ({ meetingId, message }) => {
      io.to(meetingId).emit('message:received', message);
    });

    socket.on('message:typing', ({ meetingId, user }) => {
      socket.to(meetingId).emit('message:typing', { user });
    });

    socket.on('webrtc:offer', ({ meetingId, offer, from, to }) => {
      socket.to(to).emit('webrtc:offer', { offer, from, fromName: socket.handshake.query.userName });
    });

    socket.on('webrtc:answer', ({ meetingId, answer, from, to }) => {
      socket.to(to).emit('webrtc:answer', { answer, from });
    });

    socket.on('webrtc:ice-candidate', ({ meetingId, candidate, from, to }) => {
      socket.to(to).emit('webrtc:ice-candidate', { candidate, from });
    });

    socket.on('meeting:mute', ({ meetingId, userId, isMuted }) => {
      socket.to(meetingId).emit('meeting:mute', { userId, isMuted });
    });

    socket.on('screen:share-started', ({ meetingId, userId }) => {
      socket.to(meetingId).emit('screen:share-started', { userId });
      console.log(`📺 ${userId} started screen sharing in meeting ${meetingId}`);
    });

    socket.on('screen:share-stopped', ({ meetingId, userId }) => {
      socket.to(meetingId).emit('screen:share-stopped', { userId });
      console.log(`📺 ${userId} stopped screen sharing in meeting ${meetingId}`);
    });

    socket.on('disconnect', () => {
      onlineUsers.forEach((socketId, userId) => {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
        }
      });
      io.emit('users:online', Array.from(onlineUsers.keys()));

      const currentUser = socket.data.user;
      meetingRooms.forEach((participants, meetingId) => {
        const filtered = participants.filter((participant) => participant.socketId !== socket.id && participant._id !== currentUser?._id);
        if (filtered.length > 0) {
          meetingRooms.set(meetingId, filtered);
        } else {
          meetingRooms.delete(meetingId);
        }

        if (filtered.length !== participants.length) {
          io.to(meetingId).emit('meeting:user-left', { user: currentUser });
          broadcastParticipants(meetingId);
        }
      });

      console.log(`❌ User disconnected: ${socket.id}`);
    });
  });

  return io;
};

export default configureSocket;
