import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import meetingRoutes from './routes/meeting.routes.js';
import taskRoutes from './routes/task.routes.js';
import messageRoutes from './routes/message.routes.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';

const app = express();

// Security & Middleware
app.use(helmet());
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://localhost:5173',
  process.env.CLIENT_URL,
  process.env.RENDER_CLIENT_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;

  return allowedOrigins.includes(origin) ||
    /\.vercel\.app$/i.test(origin) ||
    /\.vercel\.dev$/i.test(origin) ||
    /\.onrender\.com$/i.test(origin);
};

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'IntellMeet API running 🚀' 
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/messages', messageRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;