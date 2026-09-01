import express from 'express';
import {
  createLiveSession,
  getLiveSessionsByCourse,
  getLiveSessionById,
  updateLiveSessionStatus,
  getLiveSessionAttendance
} from '../controllers/liveSessionController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public / Authenticated Routes
router.post('/create', authenticateToken, createLiveSession);
router.get('/course/:courseId', authenticateToken, getLiveSessionsByCourse);
router.get('/:sessionId', authenticateToken, getLiveSessionById);
router.patch('/:sessionId/status', authenticateToken, updateLiveSessionStatus);
router.get('/:sessionId/attendance', authenticateToken, getLiveSessionAttendance);

export default router;
