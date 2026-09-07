import express from 'express';
import multer from 'multer';
import { 
    getAdminData, 
    getManagerData, 
    getUserData, 
    getAllUsers, 
    updateUserRole,
    getMyProfile,
    updateMyProfile,
    uploadAvatar,
    changeMyPassword
} from '../controllers/userController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

const avatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed as avatars.'), false);
        }
    }
});

// User Profile Endpoints (Accessible to ALL authenticated users)
router.get('/api/user/profile', authenticateToken, getMyProfile);
router.put('/api/user/profile', authenticateToken, updateMyProfile);
router.post('/api/user/avatar', authenticateToken, avatarUpload.single('avatar'), uploadAvatar);
router.post('/api/user/change-password', authenticateToken, changeMyPassword);

// Role-restricted verification endpoints
router.get('/api/admin-data', authenticateToken, authorizeRoles('admin'), getAdminData);
router.get('/api/manager-data', authenticateToken, authorizeRoles('admin', 'manager'), getManagerData);
router.get('/api/user-data', authenticateToken, getUserData);

// Admin User Management Routes
router.get('/api/users', authenticateToken, authorizeRoles('admin'), getAllUsers);
router.put('/api/users/:id/role', authenticateToken, authorizeRoles('admin'), updateUserRole);

export default router;

