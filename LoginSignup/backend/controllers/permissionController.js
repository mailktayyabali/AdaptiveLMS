import Permission from '../models/Permission.js';
import User from '../models/User.js';

export const getOrCreateUserPermission = async (user) => {
    let permission = await Permission.findOne({ user: user._id || user.id });

    if (!permission) {
        const isManagerOrAdmin = ['admin', 'manager'].includes(user.role);

        permission = new Permission({
            user: user._id || user.id,
            canCreateTicket: isManagerOrAdmin,
            canReadTicket: true,
            canUpdateTicket: isManagerOrAdmin,
            canDeleteTicket: isManagerOrAdmin
        });

        await permission.save();
    }

    return permission;
};

// 1. Get logged-in user's own permissions
export const getMyPermissions = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const permission = await getOrCreateUserPermission(user);

        res.json({ success: true, permission });
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
