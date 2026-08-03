import Notification from "../models/Notification";

export const getNotifications = async(req, res)=> {
    try {
        const userId = req.user._id;
        const notifications = await Notification.find({
            recipient: userId
        })
        .populate('sender', 'name email')
        .sort({createdAt: -1})
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
        return res.status(500).json({success: false, message:error.message});
    }
};

export const markAsRead = async(req, res)=> {
    try {
        const userId = req.user._id;
        await Notification.updateMany({recipient: userId, isRead: false}, {isRead: true});
        return res.status(200).json({success:true, message:'All notifications marked as read'})
    } catch (error) {
        return res.status(500).json({success:false, message:error.message});
    }
}