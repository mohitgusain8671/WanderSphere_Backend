import Story from '#models/story.model.js';
import Friendship from '#models/friendship.model.js';
import Notification from '#models/notification.model.js';
import { deleteFromS3 } from '#config/s3.js';

// Create a new story
export const createStory = async (req, res) => {
    try {
        const { caption } = req.body;
        const authorId = req.user.id;

        // Validate if media file is provided
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Media file is required for story'
            });
        }

        const mediaFile = {
            url: req.file.location,
            type: req.file.mimetype.startsWith('image/') ? 'image' : 'video',
            fileName: req.file.originalname,
            fileSize: req.file.size
        };

        const story = new Story({
            author: authorId,
            mediaFile,
            caption: caption || ''
        });

        await story.save();

        // Populate author information
        await story.populate('author', 'firstName lastName profilePicture');

        res.status(201).json({
            success: true,
            message: 'Story created successfully',
            data: { story }
        });
    } catch (error) {
        console.error('Error creating story:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create story',
            error: error.message
        });
    }
};

// Get stories (friends' stories + own stories)
export const getStories = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user's friends
        const friendships = await Friendship.find({
            $or: [
                { requester: userId, status: 'accepted' },
                { recipient: userId, status: 'accepted' }
            ]
        });

        // Extract friend IDs
        const friendIds = friendships.map(friendship => 
            friendship.requester.toString() === userId 
                ? friendship.recipient 
                : friendship.requester
        );

        // Include current user to see their own stories
        const userIds = [...friendIds, userId];

        // Get active stories from friends and self
        const stories = await Story.find({
            author: { $in: userIds },
            isActive: true,
            expiresAt: { $gt: new Date() }
        })
        .populate('author', 'firstName lastName profilePicture')
        .populate('likes.user', 'firstName lastName profilePicture')
        .populate('viewers.user', 'firstName lastName profilePicture')
        .sort({ createdAt: -1 });

        // Group stories by author
        const groupedStories = {};
        stories.forEach(story => {
            const authorId = story.author._id.toString();
            if (!groupedStories[authorId]) {
                groupedStories[authorId] = {
                    author: story.author,
                    stories: [],
                    hasUnviewed: false
                };
            }
            
            // Check if current user has viewed this story
            const hasViewed = story.viewers.some(
                viewer => viewer.user._id.toString() === userId
            );
            
            if (!hasViewed && authorId !== userId) {
                groupedStories[authorId].hasUnviewed = true;
            }

            const storyObj = story.toObject();
            storyObj.likesCount = story.likes.length;
            storyObj.viewersCount = story.viewers.length;
            storyObj.isLikedByCurrentUser = story.likes.some(
                like => like.user._id.toString() === userId
            );
            storyObj.hasViewed = hasViewed;

            groupedStories[authorId].stories.push(storyObj);
        });

        // Convert to array and sort (current user first, then by most recent activity)
        const storyGroups = Object.values(groupedStories).sort((a, b) => {
            // Current user's stories first
            if (a.author._id.toString() === userId) return -1;
            if (b.author._id.toString() === userId) return 1;
            
            // Then by unviewed status
            if (a.hasUnviewed && !b.hasUnviewed) return -1;
            if (!a.hasUnviewed && b.hasUnviewed) return 1;
            
            // Finally by most recent story
            const aLatest = Math.max(...a.stories.map(s => new Date(s.createdAt)));
            const bLatest = Math.max(...b.stories.map(s => new Date(s.createdAt)));
            return bLatest - aLatest;
        });

        res.status(200).json({
            success: true,
            data: { storyGroups }
        });
    } catch (error) {
        console.error('Error fetching stories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch stories',
            error: error.message
        });
    }
};

// Get a specific story by ID
export const getStoryById = async (req, res) => {
    try {
        const { storyId } = req.params;
        const userId = req.user.id;

        const story = await Story.findOne({ 
            _id: storyId, 
            isActive: true,
            expiresAt: { $gt: new Date() }
        })
        .populate('author', 'firstName lastName profilePicture')
        .populate('likes.user', 'firstName lastName profilePicture')
        .populate('viewers.user', 'firstName lastName profilePicture');

        if (!story) {
            return res.status(404).json({
                success: false,
                message: 'Story not found or expired'
            });
        }

        // Check if user can view this story (friends or own story)
        const canView = story.author._id.toString() === userId || 
                       await Friendship.findOne({
                           $or: [
                               { requester: userId, recipient: story.author._id, status: 'accepted' },
                               { requester: story.author._id, recipient: userId, status: 'accepted' }
                           ]
                       });

        if (!canView) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to view this story'
            });
        }

        // Add user to viewers if not already viewed and not own story
        if (story.author._id.toString() !== userId) {
            const hasViewed = story.viewers.some(
                viewer => viewer.user.toString() === userId
            );

            if (!hasViewed) {
                story.viewers.push({ user: userId });
                await story.save();
                await story.populate('viewers.user', 'firstName lastName profilePicture');
            }
        }

        const storyObj = story.toObject();
        storyObj.likesCount = story.likes.length;
        storyObj.viewersCount = story.viewers.length;
        storyObj.isLikedByCurrentUser = story.likes.some(
            like => like.user._id.toString() === userId
        );

        res.status(200).json({
            success: true,
            data: { story: storyObj }
        });
    } catch (error) {
        console.error('Error fetching story:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch story',
            error: error.message
        });
    }
};

// Get user's own stories
export const getMyStories = async (req, res) => {
    try {
        const userId = req.user.id;

        const stories = await Story.find({
            author: userId,
            isActive: true,
            expiresAt: { $gt: new Date() }
        })
        .populate('likes.user', 'firstName lastName profilePicture')
        .populate('viewers.user', 'firstName lastName profilePicture')
        .sort({ createdAt: -1 });

        const storiesWithCounts = stories.map(story => {
            const storyObj = story.toObject();
            storyObj.likesCount = story.likes.length;
            storyObj.viewersCount = story.viewers.length;
            return storyObj;
        });

        res.status(200).json({
            success: true,
            data: { stories: storiesWithCounts }
        });
    } catch (error) {
        console.error('Error fetching my stories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch your stories',
            error: error.message
        });
    }
};

// Delete story
export const deleteStory = async (req, res) => {
    try {
        const { storyId } = req.params;
        const userId = req.user.id;

        const story = await Story.findOne({ 
            _id: storyId, 
            isActive: true 
        });

        if (!story) {
            return res.status(404).json({
                success: false,
                message: 'Story not found'
            });
        }

        // Check if user is the author or admin
        if (story.author.toString() !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this story'
            });
        }

        // Delete media file from S3
        await deleteFromS3(story.mediaFile.url);

        // Soft delete (mark as inactive)
        story.isActive = false;
        await story.save();

        res.status(200).json({
            success: true,
            message: 'Story deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting story:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete story',
            error: error.message
        });
    }
};

// Like/Unlike story
export const toggleLikeStory = async (req, res) => {
    try {
        const { storyId } = req.params;
        const userId = req.user.id;

        const story = await Story.findOne({ 
            _id: storyId, 
            isActive: true,
            expiresAt: { $gt: new Date() }
        });

        if (!story) {
            return res.status(404).json({
                success: false,
                message: 'Story not found or expired'
            });
        }

        // Check if user can interact with this story (friends or own story)
        const canInteract = story.author.toString() === userId || 
                           await Friendship.findOne({
                               $or: [
                                   { requester: userId, recipient: story.author, status: 'accepted' },
                                   { requester: story.author, recipient: userId, status: 'accepted' }
                               ]
                           });

        if (!canInteract) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to interact with this story'
            });
        }

        const existingLikeIndex = story.likes.findIndex(
            like => like.user.toString() === userId
        );

        let isLiked = false;
        let message = '';

        if (existingLikeIndex > -1) {
            // Unlike the story
            story.likes.splice(existingLikeIndex, 1);
            message = 'Story unliked successfully';
        } else {
            // Like the story
            story.likes.push({ user: userId });
            isLiked = true;
            message = 'Story liked successfully';

            // Create notification for story author (if not liking own story)
            if (story.author.toString() !== userId) {
                const notification = new Notification({
                    recipient: story.author,
                    sender: userId,
                    type: 'story_like',
                    message: `${req.user.firstName} ${req.user.lastName} liked your story`,
                    data: { storyId: story._id }
                });
                await notification.save();
            }
        }

        await story.save();

        res.status(200).json({
            success: true,
            message,
            data: {
                isLiked,
                likesCount: story.likes.length
            }
        });
    } catch (error) {
        console.error('Error toggling story like:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle story like',
            error: error.message
        });
    }
};

// Get story viewers
export const getStoryViewers = async (req, res) => {
    try {
        const { storyId } = req.params;
        const userId = req.user.id;

        const story = await Story.findOne({ 
            _id: storyId, 
            isActive: true 
        })
        .populate('viewers.user', 'firstName lastName profilePicture');

        if (!story) {
            return res.status(404).json({
                success: false,
                message: 'Story not found'
            });
        }

        // Only story author can see viewers
        if (story.author.toString() !== userId) {
            return res.status(403).json({
                success: false,
                message: 'Only story author can view story viewers'
            });
        }

        const viewers = story.viewers.map(viewer => ({
            user: viewer.user,
            viewedAt: viewer.viewedAt
        }));

        res.status(200).json({
            success: true,
            data: { 
                viewers,
                totalViewers: viewers.length 
            }
        });
    } catch (error) {
        console.error('Error fetching story viewers:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch story viewers',
            error: error.message
        });
    }
};

// Get stories by specific user (for viewing someone else's stories)
export const getUserStories = async (req, res) => {
    try {
        const { userId: targetUserId } = req.params;
        const currentUserId = req.user.id;

        // Check if users are friends or if it's the current user's own stories
        if (targetUserId !== currentUserId) {
            const friendship = await Friendship.findOne({
                $or: [
                    { requester: currentUserId, recipient: targetUserId, status: 'accepted' },
                    { requester: targetUserId, recipient: currentUserId, status: 'accepted' }
                ]
            });

            if (!friendship) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to view these stories'
                });
            }
        }

        const stories = await Story.find({
            author: targetUserId,
            isActive: true,
            expiresAt: { $gt: new Date() }
        })
        .populate('author', 'firstName lastName profilePicture')
        .populate('likes.user', 'firstName lastName profilePicture')
        .sort({ createdAt: 1 }); // Chronological order for story viewing

        const storiesWithCounts = stories.map(story => {
            const storyObj = story.toObject();
            storyObj.likesCount = story.likes.length;
            storyObj.viewersCount = story.viewers.length;
            storyObj.isLikedByCurrentUser = story.likes.some(
                like => like.user._id.toString() === currentUserId
            );
            storyObj.hasViewed = story.viewers.some(
                viewer => viewer.user.toString() === currentUserId
            );
            return storyObj;
        });

        res.status(200).json({
            success: true,
            data: { stories: storiesWithCounts }
        });
    } catch (error) {
        console.error('Error fetching user stories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user stories',
            error: error.message
        });
    }
};