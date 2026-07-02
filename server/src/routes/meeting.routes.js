import express from 'express';
import {
  createMeeting,
  joinMeeting,
  getMyMeetings,
  getMeeting,
  endMeeting,
  deleteMeeting,
} from '../controllers/meeting.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// All meeting routes are protected (must be logged in)
router.use(protect);

router.post('/create', createMeeting);
router.get('/my-meetings', getMyMeetings);
router.get('/:id', getMeeting);
router.post('/join/:meetingCode', joinMeeting);
router.put('/end/:id', endMeeting);
router.delete('/:id', deleteMeeting);

export default router;
