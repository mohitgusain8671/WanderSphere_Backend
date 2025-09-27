import express from 'express';
import WanderlustController from '#controllers/wanderlust.controller.js';
import { authenticateToken } from '#middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/destinations', WanderlustController.getTodaysWanderlust);
router.get('/tip', WanderlustController.getTodaysAdventureTip);

// Protected routes (require authentication)
router.use(authenticateToken);

// Get all wanderlust destinations with pagination
router.get('/destinations/all', WanderlustController.getAllWanderlust);

// Get all adventure tips with pagination
router.get('/tips/all', WanderlustController.getAllAdventureTips);

// Admin only routes (regenerate content)
router.post('/regenerate', (req, res, next) => {
    // Check if user is admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }
    next();
}, WanderlustController.regenerateTodaysContent);

export default router;