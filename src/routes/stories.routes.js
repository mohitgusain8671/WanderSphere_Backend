import express from 'express';
import {
    createStory,
    getStories,
    getStoryById,
    getMyStories,
    deleteStory,
    toggleLikeStory,
    getStoryViewers,
    getUserStories
} from '#controllers/stories.controller.js';
import { authenticateToken } from '#middleware/auth.middleware.js';
import { upload } from '#config/s3.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// POST /api/stories - Create a new story (with media file)
router.post('/', upload.single('mediaFile'), createStory);

// GET /api/stories - Get stories from friends and self
router.get('/', getStories);

// GET /api/stories/my - Get user's own stories
router.get('/my', getMyStories);

// GET /api/stories/user/:userId - Get stories by specific user
router.get('/user/:userId', getUserStories);

// GET /api/stories/:storyId - Get a specific story
router.get('/:storyId', getStoryById);

// DELETE /api/stories/:storyId - Delete a story
router.delete('/:storyId', deleteStory);

// POST /api/stories/:storyId/like - Toggle like on a story
router.post('/:storyId/like', toggleLikeStory);

// GET /api/stories/:storyId/viewers - Get story viewers (author only)
router.get('/:storyId/viewers', getStoryViewers);

export default router;