import express from 'express';
import {
  getDashboardAnalytics,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changeUserRole,
  updateUserPermissions,
  getAllPosts,
  deletePost,
  getAllStories,
  deleteStory,
  exportData,
  sendBroadcastEmail,
  getSystemHealth,
} from '#controllers/admin.controller.js';
import { authenticateToken } from '#middleware/auth.middleware.js';
import { checkAdmin, checkSuperAdmin, checkPermission } from '#middleware/admin.middleware.js';

const router = express.Router();

// All admin routes require authentication
router.use(authenticateToken);

// Dashboard Analytics - All admins can view
router.get('/dashboard', checkAdmin, getDashboardAnalytics);

// System Health - All admins can view
router.get('/system-health', checkAdmin, getSystemHealth);

// User Management Routes
router.get('/users', checkAdmin, checkPermission('user_management'), getAllUsers);
router.get('/users/:id', checkAdmin, checkPermission('user_management'), getUserById);
router.post('/users', checkAdmin, checkPermission('user_management'), createUser);
router.put('/users/:id', checkAdmin, checkPermission('user_management'), updateUser);
router.delete('/users/:id', checkAdmin, checkPermission('user_management'), deleteUser);

// Role Management - Only Super Admin
router.put('/users/:id/role', checkSuperAdmin, changeUserRole);
router.put('/users/:id/permissions', checkSuperAdmin, updateUserPermissions);

// Post Management Routes
router.get('/posts', checkAdmin, checkPermission('post_management'), getAllPosts);
router.delete('/posts/:id', checkAdmin, checkPermission('post_management'), deletePost);

// Story Management Routes
router.get('/stories', checkAdmin, checkPermission('story_management'), getAllStories);
router.delete('/stories/:id', checkAdmin, checkPermission('story_management'), deleteStory);

// Data Export - All admins
router.get('/export/:type', checkAdmin, exportData);

// Email Management
router.post('/broadcast-email', checkAdmin, checkPermission('email_management'), sendBroadcastEmail);

export default router;
