import express from 'express';
import { getNotifications, markAsRead, markSingleAsRead } from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all notification routes with JWT Auth
router.use(authenticateToken);

router.get('/', getNotifications);
router.patch('/read-all', markAsRead);
router.patch('/:id/read', markSingleAsRead);

export default router;
