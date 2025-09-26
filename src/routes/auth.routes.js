import { Router } from "express";
import AuthController from '#controllers/auth.controller.js';
import { authenticateToken } from '#middleware/auth.middleware.js';
import { 
    validateRegister, 
    validateLogin, 
    validateForgotPassword, 
    validateResetPassword 
} from '#validations/auth.validation.js';

const authRoutes = Router();

// Public routes
authRoutes.post('/register', validateRegister, AuthController.register);
authRoutes.post('/login', validateLogin, AuthController.login);
authRoutes.get('/verify-email', AuthController.verifyEmail);
authRoutes.post('/forgot-password', validateForgotPassword, AuthController.forgotPassword);
authRoutes.post('/reset-password', validateResetPassword, AuthController.resetPassword);


// Protected routes
// authRoutes.post('/logout', authenticateToken, AuthController.logout);
authRoutes.get('/profile', authenticateToken, AuthController.getProfile);

export default authRoutes;
