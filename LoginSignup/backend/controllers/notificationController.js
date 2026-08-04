import Notification from "../models/Notification.js";

// Get notification history and unread count for authenticated user
export const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const notifications = await Notification.find({
            recipient: userId
        })
        .populate('sender', 'username name email')
        .sort({ createdAt: -1 })
        .limit(50);

        const unreadCount = await Notification.countDocuments({
            recipient: userId,
            isRead: false
        });

        return res.status(200).json({
            success: true,
            notifications,
            unreadCount
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Mark single notification as read
export const markSingleAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id || req.user._id;

        const notification = await Notification.findOneAndUpdate(
            { _id: id, recipient: userId },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        return res.status(200).json({ success: true, notification });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Mark all notifications as read for logged in user
export const markAsRead = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
        return res.status(200).json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};