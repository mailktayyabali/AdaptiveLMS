import express from 'express';
import {
    getMyPermissions,
    getUserPermission,
    getAllPermissions,
    updateUserPermission
} from '../controllers/permissionController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Logged-in user fetches their own permission profile
router.get('/me', getMyPermissions);

// Admin fetches permission map for all users
router.get('/', authorizeRoles('admin'), getAllPermissions);

// Admin fetches or modifies specific user permissions
router.get('/:userId', authorizeRoles('admin'), getUserPermission);
router.put('/:userId', authorizeRoles('admin'), updateUserPermission);

export default router;
