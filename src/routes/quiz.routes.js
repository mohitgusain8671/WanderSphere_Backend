import express from 'express';
import {
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getAllQuizzes,
  getQuizById,
  getTodayQuiz,
  submitQuizAttempt,
  getMyQuizHistory,
  checkTodayAttempt,
} from '../controllers/quiz.controller.js';
import { authenticateToken } from '#middleware/auth.middleware.js';
import { checkAdmin, checkPermission } from '#middleware/admin.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ==================== ADMIN ROUTES ====================
router.post('/admin/create', checkAdmin, checkPermission('quiz_contest_management'), createQuiz);
router.put('/admin/:id', checkAdmin, checkPermission('quiz_contest_management'), updateQuiz);
router.delete('/admin/:id', checkAdmin, checkPermission('quiz_contest_management'), deleteQuiz);
router.get('/admin/all', checkAdmin, checkPermission('quiz_contest_management'), getAllQuizzes);
router.get('/admin/:id', checkAdmin, checkPermission('quiz_contest_management'), getQuizById);

// ==================== USER ROUTES ====================
router.get('/today', getTodayQuiz);
router.post('/attempt', submitQuizAttempt);
router.get('/my-history', getMyQuizHistory);
router.get('/check-today', checkTodayAttempt);

export default router;
