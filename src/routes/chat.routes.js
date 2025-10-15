import express from 'express';
import {
    getUserChats,
    createChat,
    createGroupChat,
    searchUsersForChat,
    getChatDetails,
    deleteChat
} from '#controllers/chat.controller.js';
import { authenticateToken } from '#middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/chats - Get user's chats
router.get('/', getUserChats);

// POST /api/chats - Create new chat
router.post('/', createChat);

// POST /api/chats/group - Create group chat
router.post('/group', createGroupChat);

// GET /api/chats/search-users - Search users for new chat
router.get('/search-users', searchUsersForChat);

// GET /api/chats/:chatId - Get chat details
router.get('/:chatId', getChatDetails);

// DELETE /api/chats/:chatId - Delete chat
router.delete('/:chatId', deleteChat);

export default router;