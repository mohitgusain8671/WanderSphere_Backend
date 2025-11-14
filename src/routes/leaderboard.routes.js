import express from 'express';
import {
  getDailyLeaderboard,
  getOverallLeaderboard,
  getContestLeaderboard,
  getMyRank,
} from '../controllers/leaderboard.controller.js';
import { authenticateToken } from '#middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Leaderboard Routes
router.get('/daily', getDailyLeaderboard);
router.get('/overall', getOverallLeaderboard);
router.get('/contest/:id', getContestLeaderboard);
router.get('/my-rank', getMyRank);

export default router;
