import 'dotenv/config';
import http from 'http';
import app from './app.js';
import connectDB from './config/db.js';
import configureSocket from './socket/socket.js';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Configure Socket.io
configureSocket(server);

const startServer = async () => {
  await connectDB();
  
  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

startServer();