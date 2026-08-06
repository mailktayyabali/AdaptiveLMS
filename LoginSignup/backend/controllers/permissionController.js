import Permission from '../models/Permission.js';
import Role from '../models/Role.js';
import User from '../models/User.js';

// Helper function to resolve dynamic permissions for a user via their Role in MongoDB
export const getOrCreateUserPermission = async (user) => {
    // 1. Check if user has explicit per-user custom permission override
    let userPermission = await Permission.findOne({ user: user._id || user.id });
    if (userPermission) {
        return userPermission;
    }

    // 2. Resolve dynamic permissions from the User's Role referenced in DB
    const userRoleName = (user.role || 'user').toLowerCase();
    const role = await Role.findOne({ name: userRoleName }).populate('permissions');

    if (role && role.permissions) {
        return role.permissions;
    }

    // Fallback defaults
    return {
        canCreateTicket: ['admin', 'manager'].includes(userRoleName),
        canReadTicket: true,
        canUpdateTicket: ['admin', 'manager'].includes(userRoleName),
        canDeleteTicket: ['admin', 'manager'].includes(userRoleName)
    };
};

// 1. Get logged-in user's own dynamic permissions
export const getMyPermissions = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const permission = await getOrCreateUserPermission(user);

        res.json({ success: true, permission, role: user.role });
    } catch (error) {
        console.error('Get my permissions error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Get permissions for a specific user (Admin only)
export const getUserPermission = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const permission = await getOrCreateUserPermission(user);

        res.json({ success: true, permission });
    } catch (error) {
        console.error('Get user permission error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Get permissions for all users (Admin only)
export const getAllPermissions = async (req, res) => {
    try {
        const users = await User.find({}).select('_id role name username email');
        const permissionsMap = {};

        for (const u of users) {
            const perm = await getOrCreateUserPermission(u);
            permissionsMap[u._id.toString()] = perm;
        }

        res.json({ success: true, permissions: permissionsMap });
    } catch (error) {
        console.error('Get all permissions error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Update permissions for a user (Admin only)
export const updateUserPermission = async (req, res) => {
    try {
        const { userId } = req.params;
        const { canCreateTicket, canReadTicket, canUpdateTicket, canDeleteTicket } = req.body;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        let permission = await Permission.findOne({ user: userId });

        if (!permission) {
            permission = new Permission({ user: userId });
        }

        if (typeof canCreateTicket === 'boolean') permission.canCreateTicket = canCreateTicket;
        if (typeof canReadTicket === 'boolean') permission.canReadTicket = canReadTicket;
        if (typeof canUpdateTicket === 'boolean') permission.canUpdateTicket = canUpdateTicket;
        if (typeof canDeleteTicket === 'boolean') permission.canDeleteTicket = canDeleteTicket;
        permission.updatedAt = new Date();

        await permission.save();

        res.json({
            success: true,
            message: 'User permissions updated successfully',
            permission
        });
    } catch (error) {
        console.error('Update user permission error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
