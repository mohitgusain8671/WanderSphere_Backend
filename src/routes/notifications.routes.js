import express from 'express';
import {
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    clearAllNotifications,
    getUnreadCount
} from '#controllers/notifications.controller.js';
import { authenticateToken } from '#middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/notifications - Get user's notifications
router.get('/', getNotifications);

// GET /api/notifications/unread-count - Get unread notifications count
router.get('/unread-count', getUnreadCount);

// PUT /api/notifications/mark-all-read - Mark all notifications as read
router.put('/mark-all-read', markAllNotificationsAsRead);

// DELETE /api/notifications/clear-all - Clear all notifications
router.delete('/clear-all', clearAllNotifications);

// PUT /api/notifications/:notificationId/read - Mark specific notification as read
router.put('/:notificationId/read', markNotificationAsRead);

// DELETE /api/notifications/:notificationId - Delete specific notification
router.delete('/:notificationId', deleteNotification);

export default router;