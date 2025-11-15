import express from 'express';
import {
  createContest,
  updateContest,
  deleteContest,
  getAllContests,
  getContestByIdAdmin,
  getContestSubmissions,
  getActiveContests,
  getContestById,
  startContest,
  saveContestProgress,
  submitContest,
  getMyContestHistory,
  getContestStats,
  reviewTaskSubmission,
} from '../controllers/contest.controller.js';
import { authenticateToken } from '#middleware/auth.middleware.js';
import { checkAdmin, checkPermission } from '#middleware/admin.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ==================== ADMIN ROUTES ====================
router.post('/admin/create', checkAdmin, checkPermission('quiz_contest_management'), createContest);
router.put('/admin/:id', checkAdmin, checkPermission('quiz_contest_management'), updateContest);
router.delete('/admin/:id', checkAdmin, checkPermission('quiz_contest_management'), deleteContest);
router.get('/admin/all', checkAdmin, checkPermission('quiz_contest_management'), getAllContests);
router.get('/admin/:id', checkAdmin, checkPermission('quiz_contest_management'), getContestByIdAdmin);
router.get('/admin/:id/submissions', checkAdmin, checkPermission('quiz_contest_management'), getContestSubmissions);
router.get('/admin/:id/stats', checkAdmin, checkPermission('quiz_contest_management'), getContestStats);
router.put('/admin/:id/submissions/:submissionId/review', checkAdmin, checkPermission('quiz_contest_management'), reviewTaskSubmission);

// ==================== USER ROUTES ====================
router.get('/active', getActiveContests);
router.get('/:id', getContestById);
router.post('/:id/start', startContest);
router.put('/:id/progress', saveContestProgress);
router.post('/:id/submit', submitContest);
router.get('/my/history', getMyContestHistory);

export default router;
