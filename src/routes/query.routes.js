import express from 'express';
import {
  createQuery,
  getMyQueries,
  getQueryById,
  getAllQueries,
  updateQueryStatus,
  getQueryStatistics,
} from '#controllers/query.controller.js';
import { authenticateToken } from '#middleware/auth.middleware.js';
import { checkAdmin, checkPermission } from '#middleware/admin.middleware.js';

const router = express.Router();

// User Routes (require authentication)
router.post('/', authenticateToken, createQuery);
router.get('/my-queries', authenticateToken, getMyQueries);
router.get('/:id', authenticateToken, getQueryById);

// Admin Routes (require admin with query_management permission)
router.get('/admin/all', authenticateToken, checkAdmin, checkPermission('query_management'), getAllQueries);
router.put('/admin/:id/status', authenticateToken, checkAdmin, checkPermission('query_management'), updateQueryStatus);
router.get('/admin/statistics/overview', authenticateToken, checkAdmin, getQueryStatistics);

export default router;
