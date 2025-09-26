import express from 'express';
import {
    sendFriendRequest,
    respondToFriendRequest,
    getFriendRequests,
    getSentFriendRequests,
    getFriends,
    removeFriend,
    searchUsers,
    getFriendshipStatus
} from '#controllers/friends.controller.js';
import { authenticateToken } from '#middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// POST /api/friends/request - Send friend request
router.post('/request', sendFriendRequest);

// PUT /api/friends/request/:friendshipId - Respond to friend request (accept/decline)
router.put('/request/:friendshipId', respondToFriendRequest);

// GET /api/friends/requests - Get received friend requests
router.get('/requests', getFriendRequests);

// GET /api/friends/requests/sent - Get sent friend requests
router.get('/requests/sent', getSentFriendRequests);

// GET /api/friends - Get friends list
router.get('/', getFriends);

// DELETE /api/friends/:friendId - Remove friend
router.delete('/:friendId', removeFriend);

// GET /api/friends/search - Search users
router.get('/search', searchUsers);

// GET /api/friends/status/:userId - Get friendship status with a user
router.get('/status/:userId', getFriendshipStatus);

export default router;