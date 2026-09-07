import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { generateAccessToken } from './authController.js';
import { uploadToS3 } from '../config/s3.js';

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

        if (!role || typeof role !== 'string' || !role.trim()) {
            return res.status(400).json({ success: false, message: 'Please specify a valid role name' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role: role.trim().toLowerCase() },
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

// 1. Get Logged-In User Profile (Available to all authenticated users)
export const getMyProfile = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const user = await User.findById(userId).select('-password -otpCode -otpExpire');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve profile' });
    }
};

// 2. Update Logged-In User Profile (Available to all authenticated users)
export const updateMyProfile = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { name, username, title, bio, phone, socialLinks, avatar } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (name && typeof name === 'string') {
            user.name = name.trim();
        }

        if (username && typeof username === 'string' && username.trim() !== user.username) {
            const cleanUsername = username.trim();
            if (cleanUsername.length < 3) {
                return res.status(400).json({ success: false, message: 'Username must be at least 3 characters' });
            }
            const existing = await User.findOne({ username: cleanUsername });
            if (existing && existing._id.toString() !== userId.toString()) {
                return res.status(400).json({ success: false, message: 'Username is already taken' });
            }
            user.username = cleanUsername;
        }

        if (title !== undefined) user.title = typeof title === 'string' ? title.trim() : '';
        if (bio !== undefined) user.bio = typeof bio === 'string' ? bio.trim().slice(0, 500) : '';
        if (phone !== undefined) user.phone = typeof phone === 'string' ? phone.trim() : '';
        if (avatar !== undefined) user.avatar = typeof avatar === 'string' ? avatar.trim() : user.avatar;

        if (socialLinks && typeof socialLinks === 'object') {
            user.socialLinks = {
                github: socialLinks.github ? String(socialLinks.github).trim() : (user.socialLinks?.github || ''),
                linkedin: socialLinks.linkedin ? String(socialLinks.linkedin).trim() : (user.socialLinks?.linkedin || ''),
                twitter: socialLinks.twitter ? String(socialLinks.twitter).trim() : (user.socialLinks?.twitter || ''),
                website: socialLinks.website ? String(socialLinks.website).trim() : (user.socialLinks?.website || '')
            };
        }

        await user.save();

        const updatedUser = await User.findById(userId).select('-password -otpCode -otpExpire');
        const newAccessToken = generateAccessToken(updatedUser);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: updatedUser,
            accessToken: newAccessToken
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to update profile' });
    }
};

// 3. Upload User Profile Avatar
export const uploadAvatar = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image file uploaded' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        let avatarUrl = '';

        // Attempt S3 upload first
        try {
            const s3Result = await uploadToS3(
                req.file.buffer,
                `avatar-${userId}-${Date.now()}-${req.file.originalname}`,
                req.file.mimetype,
                'Tayyab/avatars'
            );
            avatarUrl = s3Result.s3Url || s3Result;
        } catch (s3Err) {
            console.warn('[Avatar S3 upload skipped/failed, using local fallback]:', s3Err.message);
            // Local fallback
            const uploadsDir = path.join(process.cwd(), 'uploads', 'avatars');
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            const localFileName = `avatar-${userId}-${Date.now()}${path.extname(req.file.originalname) || '.png'}`;
            const localFilePath = path.join(uploadsDir, localFileName);
            fs.writeFileSync(localFilePath, req.file.buffer);
            avatarUrl = `/uploads/avatars/${localFileName}`;
        }

        user.avatar = avatarUrl;
        await user.save();

        const updatedUser = await User.findById(userId).select('-password -otpCode -otpExpire');
        const newAccessToken = generateAccessToken(updatedUser);

        res.json({
            success: true,
            message: 'Avatar uploaded successfully',
            avatarUrl,
            user: updatedUser,
            accessToken: newAccessToken
        });
    } catch (error) {
        console.error('Upload avatar error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to upload avatar' });
    }
};

// 4. Change Password for Logged-In User
export const changeMyPassword = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const { currentPassword, newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // If user logged in via OAuth without a local password
        if (!user.password && (user.googleId || user.githubId)) {
            user.password = await bcrypt.hash(newPassword, 10);
            await user.save();
            return res.json({ success: true, message: 'Password set successfully for your account' });
        }

        if (!currentPassword) {
            return res.status(400).json({ success: false, message: 'Current password is required' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Current password is incorrect' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ success: false, message: error.message || 'Failed to change password' });
    }
};
