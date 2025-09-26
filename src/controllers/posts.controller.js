import Post from '#models/posts.model.js';
import User from '#models/users.model.js';
import Notification from '#models/notification.model.js';
import { deleteFromS3 } from '#config/s3.js';

// Create a new post
export const createPost = async (req, res) => {
    try {
        const { description, location, taggedFriends } = req.body;
        const authorId = req.user.id;

        // Validate if media files are provided
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one media file is required'
            });
        }

        // Process uploaded files
        const mediaFiles = req.files.map(file => ({
            url: file.location,
            type: file.mimetype.startsWith('image/') ? 'image' : 'video',
            fileName: file.originalname,
            fileSize: file.size
        }));

        // Parse location if provided
        let locationData = null;
        if (location) {
            try {
                locationData = typeof location === 'string' ? JSON.parse(location) : location;
            } catch (error) {
                console.error('Error parsing location:', error);
            }
        }

        // Parse tagged friends if provided
        let taggedFriendsArray = [];
        if (taggedFriends) {
            try {
                taggedFriendsArray = typeof taggedFriends === 'string' ? JSON.parse(taggedFriends) : taggedFriends;
            } catch (error) {
                console.error('Error parsing tagged friends:', error);
            }
        }

        const post = new Post({
            author: authorId,
            description,
            mediaFiles,
            location: locationData,
            taggedFriends: taggedFriendsArray
        });

        await post.save();

        // Populate author information
        await post.populate('author', 'firstName lastName profilePicture');
        await post.populate('taggedFriends', 'firstName lastName profilePicture');

        // Create notifications for tagged friends
        if (taggedFriendsArray.length > 0) {
            const notifications = taggedFriendsArray.map(friendId => ({
                recipient: friendId,
                sender: authorId,
                type: 'tagged_in_post',
                message: `${req.user.firstName} ${req.user.lastName} tagged you in a post`,
                data: { postId: post._id }
            }));

            await Notification.insertMany(notifications);
        }

        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            data: { post }
        });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create post',
            error: error.message
        });
    }
};

// Get posts with pagination (infinite scroll)
export const getPosts = async (req, res) => {
    try {
        const { page = 1, limit = 10, userId } = req.query;
        const skip = (page - 1) * limit;

        // Build query - if userId provided, get posts by specific user
        const query = { isActive: true };
        if (userId) {
            query.author = userId;
        }

        const posts = await Post.find(query)
            .populate('author', 'firstName lastName profilePicture')
            .populate('taggedFriends', 'firstName lastName profilePicture')
            .populate('likes.user', 'firstName lastName profilePicture')
            .populate('comments.user', 'firstName lastName profilePicture')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        // Add like and comment counts and check if current user liked the post
        const postsWithCounts = posts.map(post => {
            const postObj = post.toObject();
            postObj.likesCount = post.likes.length;
            postObj.commentsCount = post.comments.length;
            postObj.isLikedByCurrentUser = post.likes.some(
                like => like.user._id.toString() === req.user.id
            );
            return postObj;
        });

        // Check if there are more posts
        const totalPosts = await Post.countDocuments(query);
        const hasMore = skip + posts.length < totalPosts;

        res.status(200).json({
            success: true,
            data: {
                posts: postsWithCounts,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalPosts / limit),
                    hasMore,
                    totalPosts
                }
            }
        });
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch posts',
            error: error.message
        });
    }
};

// Get a single post by ID
export const getPostById = async (req, res) => {
    try {
        const { postId } = req.params;

        const post = await Post.findOne({ _id: postId, isActive: true })
            .populate('author', 'firstName lastName profilePicture')
            .populate('taggedFriends', 'firstName lastName profilePicture')
            .populate('likes.user', 'firstName lastName profilePicture')
            .populate('comments.user', 'firstName lastName profilePicture');

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        const postObj = post.toObject();
        postObj.likesCount = post.likes.length;
        postObj.commentsCount = post.comments.length;
        postObj.isLikedByCurrentUser = post.likes.some(
            like => like.user._id.toString() === req.user.id
        );

        res.status(200).json({
            success: true,
            data: { post: postObj }
        });
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch post',
            error: error.message
        });
    }
};

// Update post
export const updatePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { description, location, taggedFriends } = req.body;
        const userId = req.user.id;

        const post = await Post.findOne({ _id: postId, isActive: true });

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Check if user is the author or admin
        if (post.author.toString() !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this post'
            });
        }

        // Update fields
        if (description !== undefined) post.description = description;
        
        if (location) {
            try {
                post.location = typeof location === 'string' ? JSON.parse(location) : location;
            } catch (error) {
                console.error('Error parsing location:', error);
            }
        }

        if (taggedFriends) {
            try {
                post.taggedFriends = typeof taggedFriends === 'string' ? JSON.parse(taggedFriends) : taggedFriends;
            } catch (error) {
                console.error('Error parsing tagged friends:', error);
            }
        }

        post.updatedAt = new Date();
        await post.save();

        // Populate updated post
        await post.populate('author', 'firstName lastName profilePicture');
        await post.populate('taggedFriends', 'firstName lastName profilePicture');

        res.status(200).json({
            success: true,
            message: 'Post updated successfully',
            data: { post }
        });
    } catch (error) {
        console.error('Error updating post:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update post',
            error: error.message
        });
    }
};

// Delete post
export const deletePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id;

        const post = await Post.findOne({ _id: postId, isActive: true });

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Check if user is the author or admin
        if (post.author.toString() !== userId && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this post'
            });
        }

        // Delete media files from S3
        for (const mediaFile of post.mediaFiles) {
            await deleteFromS3(mediaFile.url);
        }

        // Soft delete (mark as inactive)
        post.isActive = false;
        post.updatedAt = new Date();
        await post.save();

        res.status(200).json({
            success: true,
            message: 'Post deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete post',
            error: error.message
        });
    }
};

// Like/Unlike post
export const toggleLikePost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id;

        const post = await Post.findOne({ _id: postId, isActive: true });

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        const existingLikeIndex = post.likes.findIndex(
            like => like.user.toString() === userId
        );

        let isLiked = false;
        let message = '';

        if (existingLikeIndex > -1) {
            // Unlike the post
            post.likes.splice(existingLikeIndex, 1);
            message = 'Post unliked successfully';
        } else {
            // Like the post
            post.likes.push({ user: userId });
            isLiked = true;
            message = 'Post liked successfully';

            // Create notification for post author (if not liking own post)
            if (post.author.toString() !== userId) {
                const notification = new Notification({
                    recipient: post.author,
                    sender: userId,
                    type: 'post_like',
                    message: `${req.user.firstName} ${req.user.lastName} liked your post`,
                    data: { postId: post._id }
                });
                await notification.save();
            }
        }

        post.updatedAt = new Date();
        await post.save();

        res.status(200).json({
            success: true,
            message,
            data: {
                isLiked,
                likesCount: post.likes.length
            }
        });
    } catch (error) {
        console.error('Error toggling like:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to toggle like',
            error: error.message
        });
    }
};

// Add comment to post
export const addComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { text } = req.body;
        const userId = req.user.id;

        if (!text || text.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Comment text is required'
            });
        }

        const post = await Post.findOne({ _id: postId, isActive: true });

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        const comment = {
            user: userId,
            text: text.trim(),
            createdAt: new Date()
        };

        post.comments.push(comment);
        post.updatedAt = new Date();
        await post.save();

        // Populate the new comment
        await post.populate('comments.user', 'firstName lastName profilePicture');
        
        const newComment = post.comments[post.comments.length - 1];

        // Create notification for post author (if not commenting on own post)
        if (post.author.toString() !== userId) {
            const notification = new Notification({
                recipient: post.author,
                sender: userId,
                type: 'post_comment',
                message: `${req.user.firstName} ${req.user.lastName} commented on your post`,
                data: { 
                    postId: post._id,
                    commentId: newComment._id.toString()
                }
            });
            await notification.save();
        }

        res.status(201).json({
            success: true,
            message: 'Comment added successfully',
            data: {
                comment: newComment,
                commentsCount: post.comments.length
            }
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add comment',
            error: error.message
        });
    }
};

// Get comments for a post
export const getComments = async (req, res) => {
    try {
        const { postId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        const post = await Post.findOne({ _id: postId, isActive: true })
            .populate('comments.user', 'firstName lastName profilePicture')
            .select('comments');

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        // Sort comments by creation date (newest first) and paginate
        const sortedComments = post.comments
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(skip, skip + parseInt(limit));

        const totalComments = post.comments.length;
        const hasMore = skip + sortedComments.length < totalComments;

        res.status(200).json({
            success: true,
            data: {
                comments: sortedComments,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalComments / limit),
                    hasMore,
                    totalComments
                }
            }
        });
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch comments',
            error: error.message
        });
    }
};