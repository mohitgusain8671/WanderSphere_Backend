import express from 'express';
import {
    getChatMessages,
    sendMessage,
    markMessagesAsRead,
    deleteMessage,
    editMessage
} from '#controllers/message.controller.js';
import { authenticateToken } from '#middleware/auth.middleware.js';
import { upload } from '#config/s3.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/messages/:chatId - Get messages for a chat
router.get('/:chatId', getChatMessages);

// POST /api/messages/:chatId - Send message
router.post('/:chatId', upload.array('mediaFiles', 5), sendMessage);

// PUT /api/messages/:chatId/read - Mark messages as read
router.put('/:chatId/read', markMessagesAsRead);

// PUT /api/messages/edit/:messageId - Edit message
router.put('/edit/:messageId', editMessage);

// DELETE /api/messages/:messageId - Delete message
router.delete('/:messageId', deleteMessage);

export default router;