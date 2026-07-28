import User from '../models/User.js';

// Admin Data Endpoint
export const getAdminData = (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to the Secure Admin Panel!',
        stats: {
            totalUsers: 142,
            activeSessions: 18,
            serverStatus: 'Optimal',
            lastBackup: new Date().toISOString()
        }
    });
};

// Manager Data Endpoint
export const getManagerData = (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to the Manager Dashboard!',
        tasks: [
            { id: 1, title: 'Review Q3 Performance Reports', status: 'Pending' },
            { id: 2, title: 'Approve Pending Time-off Requests', status: 'In Progress' },
            { id: 3, title: 'Sync with Admin on Resource Allocation', status: 'Completed' }
        ]
    });
};

// Regular User Data Endpoint
export const getUserData = (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to your Account Space!',
        announcements: [
            'System maintenance scheduled for this Sunday at 2 AM EST.',
            'New premium security features rolled out today.'
        ]
    });
};

// Get All Users (Admin Panel with Pagination, Sorting & Search)
export const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        const search = req.query.search ? req.query.search.trim() : '';

        const searchQuery = search ? {
            $or: [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ]
        } : {};

        const totalUsers = await User.countDocuments(searchQuery);
        const totalPages = Math.ceil(totalUsers / limit) || 1;
        const currentPage = Math.min(Math.max(1, page), totalPages);
        const skip = (currentPage - 1) * limit;

        const users = await User.find(searchQuery)
            .select('-password')
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(limit);

        res.json({
            success: true,
            users,
            totalUsers,
            totalPages,
            currentPage,
            limit
        });

    } catch (error) {
        console.error('Fetch users error:', error);
        res.status(500).json({ success: false, message: 'Server did not respond.' });
    }
};

// Update User Role (Admin Only)
export const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;

        if (!['user', 'manager', 'admin'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role specified' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: 'User role updated successfully', user });
    } catch (error) {
        console.error('Role update error:', error);
        res.status(500).json({ success: false, message: 'Server did not respond.' });
    }
};
