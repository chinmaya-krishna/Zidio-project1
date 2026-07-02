import express from 'express';
import { 
  signup, 
  login, 
  logout, 
  getMe 
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected routes (need to be logged in)
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

export default router;
