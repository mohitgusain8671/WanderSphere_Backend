import Notification from '#models/notification.model.js';

// Get user's notifications
export const getNotifications = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, unreadOnly = false } = req.query;
        const skip = (page - 1) * limit;

        // Build query
        const query = { recipient: userId };
        if (unreadOnly === 'true') {
            query.isRead = false;
        }

        const notifications = await Notification.find(query)
            .populate('sender', 'firstName lastName profilePicture')
            .populate('data.postId', 'description mediaFiles')
            .populate('data.storyId', 'mediaFile caption')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Get total count for pagination
        const totalNotifications = await Notification.countDocuments(query);
        const hasMore = skip + notifications.length < totalNotifications;

        // Get unread count
        const unreadCount = await Notification.countDocuments({
            recipient: userId,
            isRead: false
        });

        res.status(200).json({
            success: true,
            data: {
                notifications,
                unreadCount,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalNotifications / limit),
                    hasMore,
                    totalNotifications
                }
            }
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications',
            error: error.message
        });
    }
};

// Mark notification as read
export const markNotificationAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.id;

        const notification = await Notification.findOne({
            _id: notificationId,
            recipient: userId
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        notification.isRead = true;
        await notification.save();

        res.status(200).json({
            success: true,
            message: 'Notification marked as read',
            data: { notification }
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read',
            error: error.message
        });
    }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await Notification.updateMany(
            { recipient: userId, isRead: false },
            { isRead: true }
        );

        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} notifications marked as read`
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read',
            error: error.message
        });
    }
};

// Delete notification
export const deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.id;

        const notification = await Notification.findOneAndDelete({
            _id: notificationId,
            recipient: userId
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Notification deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete notification',
            error: error.message
        });
    }
};

// Clear all notifications
export const clearAllNotifications = async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await Notification.deleteMany({
            recipient: userId
        });

        res.status(200).json({
            success: true,
            message: `${result.deletedCount} notifications cleared`
        });
    } catch (error) {
        console.error('Error clearing notifications:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear notifications',
            error: error.message
        });
    }
};

// Get unread notifications count
export const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const unreadCount = await Notification.countDocuments({
            recipient: userId,
            isRead: false
        });

        res.status(200).json({
            success: true,
            data: { unreadCount }
        });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch unread count',
            error: error.message
        });
    }
};