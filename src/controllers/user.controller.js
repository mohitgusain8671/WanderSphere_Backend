import UserService from '#services/user.service.js';
import { deleteFromS3 } from '#config/s3.js';

class UserController {
    // Get user profile
    async getProfile(req, res) {
        try {
            const userId = req.user._id;
            const user = await UserService.findUserById(userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Remove sensitive information
            const { password, refreshToken, ...userProfile } = user.toObject();

            res.status(200).json({
                success: true,
                message: 'Profile retrieved successfully',
                data: { user: userProfile }
            });

        } catch (error) {
            console.error('Get profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Update user profile
    async updateProfile(req, res) {
        try {
            const userId = req.user._id;
            const allowedUpdates = [
                'firstName',
                'lastName',
                'bio',
                'travelStatus',
                'statusColor',
                'badges',
                'profilePicture'
            ];

            // Filter only allowed fields
            const updates = {};
            Object.keys(req.body).forEach(key => {
                if (allowedUpdates.includes(key)) {
                    updates[key] = req.body[key];
                }
            });

            // Check if trying to update email (not allowed)
            if (req.body.email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email cannot be updated'
                });
            }

            // Check if user is authorized (only own profile or admin)
            const targetUserId = req.params.userId || userId;
            if (targetUserId.toString() !== userId.toString() && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this profile'
                });
            }

            const updatedUser = await UserService.updateUser(targetUserId, updates);
            
            if (!updatedUser) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Remove sensitive information
            const { password, refreshToken, ...userProfile } = updatedUser.toObject();

            res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                data: { user: userProfile }
            });

        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Upload profile picture
    async uploadProfilePicture(req, res) {
        try {
            const userId = req.user._id;

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No image file provided'
                });
            }

            // Check if user is authorized (only own profile or admin)
            const targetUserId = req.params.userId || userId;
            if (targetUserId.toString() !== userId.toString() && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this profile picture'
                });
            }

            // Get current user to check for existing profile picture
            const currentUser = await UserService.findUserById(targetUserId);
            if (!currentUser) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Get the file URL from S3 (multer-s3 provides the location)
            const profilePictureUrl = req.file.location;

            // Delete old profile picture from S3 if exists
            if (currentUser.profilePicture) {
                await deleteFromS3(currentUser.profilePicture);
            }

            // Update user profile with new picture
            const updatedUser = await UserService.updateUser(targetUserId, {
                profilePicture: profilePictureUrl
            });

            res.status(200).json({
                success: true,
                message: 'Profile picture updated successfully',
                data: {
                    profilePicture: profilePictureUrl,
                    user: {
                        _id: updatedUser._id,
                        firstName: updatedUser.firstName,
                        lastName: updatedUser.lastName,
                        profilePicture: updatedUser.profilePicture
                    }
                }
            });

        } catch (error) {
            console.error('Upload profile picture error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Remove profile picture
    async removeProfilePicture(req, res) {
        try {
            const userId = req.user._id;

            // Check if user is authorized (only own profile or admin)
            const targetUserId = req.params.userId || userId;
            if (targetUserId.toString() !== userId.toString() && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to update this profile picture'
                });
            }

            // Get current user to check for existing profile picture
            const currentUser = await UserService.findUserById(targetUserId);
            if (!currentUser) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Delete profile picture from S3 if exists
            if (currentUser.profilePicture) {
                await deleteFromS3(currentUser.profilePicture);
            }

            // Remove profile picture from database
            const updatedUser = await UserService.updateUser(targetUserId, {
                profilePicture: null
            });

            res.status(200).json({
                success: true,
                message: 'Profile picture removed successfully',
                data: {
                    user: {
                        _id: updatedUser._id,
                        firstName: updatedUser.firstName,
                        lastName: updatedUser.lastName,
                        profilePicture: updatedUser.profilePicture
                    }
                }
            });

        } catch (error) {
            console.error('Remove profile picture error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Get user by ID (public profile)
    async getUserById(req, res) {
        try {
            const { userId } = req.params;
            const user = await UserService.findUserById(userId);
            
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Return only public information
            const publicProfile = {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                profilePicture: user.profilePicture,
                bio: user.bio,
                travelStatus: user.travelStatus,
                statusColor: user.statusColor,
                badges: user.badges,
                createdAt: user.createdAt,
                isVerified: user.isVerified
            };

            res.status(200).json({
                success: true,
                message: 'User profile retrieved successfully',
                data: { user: publicProfile }
            });

        } catch (error) {
            console.error('Get user by ID error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }

    // Search users
    async searchUsers(req, res) {
        try {
            const { query, limit = 10, page = 1 } = req.query;
            
            if (!query) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query is required'
                });
            }

            const users = await UserService.searchUsers(query, parseInt(limit), parseInt(page));

            res.status(200).json({
                success: true,
                message: 'Users found successfully',
                data: { users }
            });

        } catch (error) {
            console.error('Search users error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    }
}

export default new UserController();