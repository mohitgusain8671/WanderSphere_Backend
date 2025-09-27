import express from 'express';
import UserController from '#controllers/user.controller.js';
import { authenticateToken } from '#middleware/auth.middleware.js';
import { upload } from '#config/s3.js';

const router = express.Router();

// Protected routes (require authentication)
router.use(authenticateToken);

// Get current user profile
router.get('/profile', UserController.getProfile);

// Update current user profile
router.put('/profile', UserController.updateProfile);

// Upload profile picture for current user
router.post('/profile/picture', upload.single('profilePicture'), UserController.uploadProfilePicture);

// Remove profile picture for current user
router.delete('/profile/picture', UserController.removeProfilePicture);

// Get public user profile by ID
router.get('/:userId', UserController.getUserById);

// Update specific user profile (admin only)
router.put('/:userId/profile', UserController.updateProfile);

// Upload profile picture for specific user (admin only)
router.post('/:userId/profile/picture', upload.single('profilePicture'), UserController.uploadProfilePicture);

// Remove profile picture for specific user (admin only)
router.delete('/:userId/profile/picture', UserController.removeProfilePicture);

// Search users
router.get('/search/users', UserController.searchUsers);

export default router;