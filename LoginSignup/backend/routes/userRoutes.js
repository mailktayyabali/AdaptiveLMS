import express from 'express';
import { 
    getAdminData, 
    getManagerData, 
    getUserData, 
    getAllUsers, 
    updateUserRole 
} from '../controllers/userController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Role-restricted verification endpoints
router.get('/api/admin-data', authenticateToken, authorizeRoles('admin'), getAdminData);
router.get('/api/manager-data', authenticateToken, authorizeRoles('admin', 'manager'), getManagerData);
router.get('/api/user-data', authenticateToken, getUserData);

// Admin User Management Routes
router.get('/api/users', authenticateToken, authorizeRoles('admin'), getAllUsers);
router.put('/api/users/:id/role', authenticateToken, authorizeRoles('admin'), updateUserRole);

export default router;
