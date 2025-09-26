import express from 'express';
import { 
    createPost,
    getPosts,
    getPostById,
    updatePost,
    deletePost,
    toggleLikePost,
    addComment,
    getComments
} from '#controllers/posts.controller.js';
import { authenticateToken } from '#middleware/auth.middleware.js';
import { upload } from '#config/s3.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// POST /api/posts - Create a new post (with media files)
router.post('/', upload.array('mediaFiles', 5), createPost);

// GET /api/posts - Get posts with pagination
router.get('/', getPosts);

// GET /api/posts/:postId - Get a specific post
router.get('/:postId', getPostById);

// PUT /api/posts/:postId - Update a post
router.put('/:postId', updatePost);

// DELETE /api/posts/:postId - Delete a post
router.delete('/:postId', deletePost);

// POST /api/posts/:postId/like - Toggle like on a post
router.post('/:postId/like', toggleLikePost);

// POST /api/posts/:postId/comments - Add a comment to a post
router.post('/:postId/comments', addComment);

// GET /api/posts/:postId/comments - Get comments for a post
router.get('/:postId/comments', getComments);

export default router;