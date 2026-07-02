import express from 'express';
import {
  createTask,
  getMyTasks,
  getAllTasks,
  updateTaskStatus,
  deleteTask,
} from '../controllers/task.controller.js';
import { protect, adminOnly } from '../middleware/auth.middleware.js';

const router = express.Router();

// All task routes are protected
router.use(protect);

router.post('/create', createTask);
router.get('/my-tasks', getMyTasks);
router.get('/all', adminOnly, getAllTasks);
router.put('/:id/status', updateTaskStatus);
router.delete('/:id', deleteTask);

export default router;
