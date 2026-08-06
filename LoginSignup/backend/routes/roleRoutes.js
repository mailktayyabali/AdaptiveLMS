import express from 'express';
import { getAllRoles, updateRolePermissions, createRole } from '../controllers/roleController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authenticateToken);

// Admin routes for managing Roles & Role Permissions dynamically
router.get('/', authorizeRoles('admin'), getAllRoles);
router.post('/', authorizeRoles('admin'), createRole);
router.put('/:roleName/permissions', authorizeRoles('admin'), updateRolePermissions);

export default router;
