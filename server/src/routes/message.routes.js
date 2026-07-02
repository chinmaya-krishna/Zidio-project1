import express from 'express';
import {
  sendMessage,
  getMeetingMessages,
} from '../controllers/message.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// All message routes are protected
router.use(protect);

router.post('/:meetingId/send', sendMessage);
router.get('/:meetingId/messages', getMeetingMessages);

export default router;
