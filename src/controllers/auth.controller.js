import UserService from '#services/user.service.js';
import EmailService from '#services/email.service.js';

class AuthController {
    // Register new user
    async register(req, res) {
        try {
            const { firstName, lastName, email, password } = req.body;

            // Check if user already exists
            const existingUser = await UserService.findUserByEmail(email);
            
            if (existingUser) {
                if (existingUser.isVerified) {
                    return res.status(409).json({
                        success: false,
                        message: 'User already exists and is verified'
                    });
                } else {
                    // Update existing unverified user
                    const updatedUser = await UserService.updateUser(existingUser._id, {
                        firstName,
                        lastName,
                        password
                    });

                    // Generate new verification token
                    const verificationToken = await UserService.createVerificationToken(updatedUser._id);
                    
                    // Send verification email
                    await EmailService.sendVerificationEmail(email, verificationToken, firstName);

                    return res.status(200).json({
                        success: true,
                        message: 'User details updated. Please check your email for verification link.',
                        data: {
                            userId: updatedUser._id,
                            email: updatedUser.email,
                            isVerified: updatedUser.isVerified
                        }
                    });
                }
            }

            // Create new user
            const newUser = await UserService.createUser({
                firstName,
                lastName,
                email,
                password
            });

            // Generate verification token
            const verificationToken = await UserService.createVerificationToken(newUser._id);
            
            // Send verification email
            await EmailService.sendVerificationEmail(email, verificationToken, firstName);

            res.status(201).json({
                success: true,
                message: 'User registered successfully. Please check your email for verification link.',
                data: {
                    userId: newUser._id,
                    email: newUser.email,
                    isVerified: newUser.isVerified
                }
            });

        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }    
// Verify email
    async verifyEmail(req, res) {
        try {
            const { token } = req.query;

            if (!token) {
                // Redirect to mobile app with error
                const mobileAppUrl = `${process.env.MOBILE_APP_SCHEME}://email-verified?success=false&error=${encodeURIComponent('Verification token is required')}`;
                return res.redirect(mobileAppUrl);
            }

            const user = await UserService.verifyEmailToken(token);
            
            // Send welcome email
            try {
                await EmailService.sendWelcomeEmail(user.email, user.firstName);
            } catch (emailError) {
                console.warn('Welcome email failed:', emailError);
                // Continue with verification even if welcome email fails
            }

            // Redirect to mobile app with success
            const mobileAppUrl = `${process.env.MOBILE_APP_SCHEME}://email-verified?success=true&message=${encodeURIComponent('Email verified successfully! You can now login to your account.')}`;
            
            res.redirect(mobileAppUrl);

        } catch (error) {
            console.error('Email verification error:', error);
            let errorMessage = 'Email verification failed';
            
            if (error.message.includes('Invalid or expired')) {
                errorMessage = 'Verification link has expired or is invalid. Please request a new verification email.';
            }
            
            const mobileAppUrl = `${process.env.MOBILE_APP_SCHEME}://email-verified?success=false&error=${encodeURIComponent(errorMessage)}`;
            res.redirect(mobileAppUrl);
        }
    }

    // Login user
    async login(req, res) {
        try {
            const { email, password } = req.body;

            // Find user by email
            const user = await UserService.findUserByEmail(email);
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Check if user is verified
            if (!user.isVerified) {
                return res.status(401).json({
                    success: false,
                    message: 'Please verify your email before logging in'
                });
            }

            // Verify password
            const isPasswordValid = await UserService.verifyPassword(password, user.password);
            
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Generate tokens
            const { accessToken, refreshToken } = await UserService.generateAuthTokens(user);

            // Remove password from response
            const { password: _, ...userWithoutPassword } = user.toObject();

            res.status(200).json({
                success: true,
                message: 'Login successful',
                data: {
                    user: userWithoutPassword,
                    accessToken,
                    refreshToken
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }    
    // Forgot password
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;

            const user = await UserService.findUserByEmail(email);
            
            if (!user) {
                // Don't reveal if user exists or not
                return res.status(200).json({
                    success: true,
                    message: 'If the email exists, you will receive a password reset OTP'
                });
            }

            if (!user.isVerified) {
                return res.status(400).json({
                    success: false,
                    message: 'Please verify your email first'
                });
            }

            // Generate OTP
            const otp = await UserService.createPasswordResetOTP(user._id);
            
            // Send OTP email
            await EmailService.sendPasswordResetOTP(email, otp, user.firstName);

            res.status(200).json({
                success: true,
                message: 'Password reset OTP sent to your email',
                data: {
                    userId: user._id
                }
            });

        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Reset password
    async resetPassword(req, res) {
        try {
            const { userId, otp, newPassword } = req.body;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID is required'
                });
            }

            // Verify OTP
            await UserService.verifyPasswordResetOTP(userId, otp);
            
            // Reset password
            const user = await UserService.resetPassword(userId, newPassword);

            res.status(200).json({
                success: true,
                message: 'Password reset successfully',
                data: {
                    userId: user._id
                }
            });

        } catch (error) {
            console.error('Reset password error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to reset password'
            });
        }
    }


    // Get current user profile
    async getProfile(req, res) {
        try {
            res.status(200).json({
                success: true,
                data: {
                    user: req.user
                }
            });

        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

export default new AuthController();