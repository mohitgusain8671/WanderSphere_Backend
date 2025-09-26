import Friendship from '#models/friendship.model.js';
import User from '#models/users.model.js';
import Notification from '#models/notification.model.js';

// Send friend request
export const sendFriendRequest = async (req, res) => {
    try {
        const { recipientId } = req.body;
        const requesterId = req.user.id;

        if (requesterId === recipientId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot send friend request to yourself'
            });
        }

        // Check if recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if friendship already exists
        const existingFriendship = await Friendship.findOne({
            $or: [
                { requester: requesterId, recipient: recipientId },
                { requester: recipientId, recipient: requesterId }
            ]
        });

        if (existingFriendship) {
            let message = '';
            switch (existingFriendship.status) {
                case 'pending':
                    message = 'Friend request already sent or received';
                    break;
                case 'accepted':
                    message = 'You are already friends';
                    break;
                case 'declined':
                    message = 'Friend request was previously declined';
                    break;
                case 'blocked':
                    message = 'Cannot send friend request';
                    break;
                default:
                    message = 'Friendship status unclear';
            }
            
            return res.status(409).json({
                success: false,
                message
            });
        }

        // Create new friend request
        const friendRequest = new Friendship({
            requester: requesterId,
            recipient: recipientId,
            status: 'pending'
        });

        await friendRequest.save();

        // Create notification for recipient
        const notification = new Notification({
            recipient: recipientId,
            sender: requesterId,
            type: 'friend_request',
            message: `${req.user.firstName} ${req.user.lastName} sent you a friend request`,
            data: { friendshipId: friendRequest._id }
        });
        await notification.save();

        res.status(201).json({
            success: true,
            message: 'Friend request sent successfully',
            data: { friendRequest }
        });
    } catch (error) {
        console.error('Error sending friend request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send friend request',
            error: error.message
        });
    }
};

// Respond to friend request (accept/decline)
export const respondToFriendRequest = async (req, res) => {
    try {
        const { friendshipId } = req.params;
        const { action } = req.body; // 'accept' or 'decline'
        const userId = req.user.id;

        if (!['accept', 'decline'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid action. Use "accept" or "decline"'
            });
        }

        const friendship = await Friendship.findOne({
            _id: friendshipId,
            recipient: userId,
            status: 'pending'
        });

        if (!friendship) {
            return res.status(404).json({
                success: false,
                message: 'Friend request not found'
            });
        }

        friendship.status = action === 'accept' ? 'accepted' : 'declined';
        friendship.respondedAt = new Date();
        friendship.updatedAt = new Date();
        await friendship.save();

        // If accepted, create notification for the requester
        if (action === 'accept') {
            const notification = new Notification({
                recipient: friendship.requester,
                sender: userId,
                type: 'friend_accepted',
                message: `${req.user.firstName} ${req.user.lastName} accepted your friend request`,
                data: { friendshipId: friendship._id }
            });
            await notification.save();
        }

        res.status(200).json({
            success: true,
            message: `Friend request ${action}ed successfully`,
            data: { friendship }
        });
    } catch (error) {
        console.error('Error responding to friend request:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to respond to friend request',
            error: error.message
        });
    }
};

// Get friend requests (received)
export const getFriendRequests = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status = 'pending' } = req.query;

        const friendRequests = await Friendship.find({
            recipient: userId,
            status: status
        })
        .populate('requester', 'firstName lastName profilePicture email')
        .sort({ requestedAt: -1 });

        res.status(200).json({
            success: true,
            data: { friendRequests }
        });
    } catch (error) {
        console.error('Error fetching friend requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch friend requests',
            error: error.message
        });
    }
};

// Get sent friend requests
export const getSentFriendRequests = async (req, res) => {
    try {
        const userId = req.user.id;
        const { status = 'pending' } = req.query;

        const sentRequests = await Friendship.find({
            requester: userId,
            status: status
        })
        .populate('recipient', 'firstName lastName profilePicture email')
        .sort({ requestedAt: -1 });

        res.status(200).json({
            success: true,
            data: { sentRequests }
        });
    } catch (error) {
        console.error('Error fetching sent friend requests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch sent friend requests',
            error: error.message
        });
    }
};

// Get friends list
export const getFriends = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20 } = req.query;
        const skip = (page - 1) * limit;

        // Get all accepted friendships where user is either requester or recipient
        const friendships = await Friendship.find({
            $or: [
                { requester: userId, status: 'accepted' },
                { recipient: userId, status: 'accepted' }
            ]
        })
        .populate('requester', 'firstName lastName profilePicture email bio')
        .populate('recipient', 'firstName lastName profilePicture email bio')
        .sort({ respondedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

        // Extract friend information
        const friends = friendships.map(friendship => {
            const friend = friendship.requester._id.toString() === userId 
                ? friendship.recipient 
                : friendship.requester;
            
            return {
                ...friend.toObject(),
                friendshipId: friendship._id,
                friendsSince: friendship.respondedAt
            };
        });

        // Get total count for pagination
        const totalFriends = await Friendship.countDocuments({
            $or: [
                { requester: userId, status: 'accepted' },
                { recipient: userId, status: 'accepted' }
            ]
        });

        const hasMore = skip + friends.length < totalFriends;

        res.status(200).json({
            success: true,
            data: {
                friends,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalFriends / limit),
                    hasMore,
                    totalFriends
                }
            }
        });
    } catch (error) {
        console.error('Error fetching friends:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch friends',
            error: error.message
        });
    }
};

// Remove friend (unfriend)
export const removeFriend = async (req, res) => {
    try {
        const { friendId } = req.params;
        const userId = req.user.id;

        const friendship = await Friendship.findOne({
            $or: [
                { requester: userId, recipient: friendId, status: 'accepted' },
                { requester: friendId, recipient: userId, status: 'accepted' }
            ]
        });

        if (!friendship) {
            return res.status(404).json({
                success: false,
                message: 'Friendship not found'
            });
        }

        await Friendship.deleteOne({ _id: friendship._id });

        res.status(200).json({
            success: true,
            message: 'Friend removed successfully'
        });
    } catch (error) {
        console.error('Error removing friend:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove friend',
            error: error.message
        });
    }
};

// Search users for adding friends
export const searchUsers = async (req, res) => {
    try {
        const { query, page = 1, limit = 20 } = req.query;
        const userId = req.user.id;
        const skip = (page - 1) * limit;

        if (!query || query.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        // Search users by name or email
        const searchRegex = new RegExp(query.trim(), 'i');
        
        const users = await User.find({
            _id: { $ne: userId }, // Exclude current user
            $or: [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { email: searchRegex },
                { 
                    $expr: {
                        $regexMatch: {
                            input: { $concat: ['$firstName', ' ', '$lastName'] },
                            regex: query.trim(),
                            options: 'i'
                        }
                    }
                }
            ]
        })
        .select('firstName lastName profilePicture email bio')
        .skip(skip)
        .limit(parseInt(limit));

        // Get existing friendships to determine status
        const userIds = users.map(user => user._id);
        const existingFriendships = await Friendship.find({
            $or: [
                { requester: userId, recipient: { $in: userIds } },
                { requester: { $in: userIds }, recipient: userId }
            ]
        });

        // Add friendship status to each user
        const usersWithStatus = users.map(user => {
            const userObj = user.toObject();
            
            const friendship = existingFriendships.find(f => 
                (f.requester.toString() === userId && f.recipient.toString() === user._id.toString()) ||
                (f.requester.toString() === user._id.toString() && f.recipient.toString() === userId)
            );

            if (friendship) {
                userObj.friendshipStatus = friendship.status;
                userObj.friendshipId = friendship._id;
                userObj.isRequester = friendship.requester.toString() === userId;
            } else {
                userObj.friendshipStatus = 'none';
                userObj.friendshipId = null;
                userObj.isRequester = false;
            }

            return userObj;
        });

        const totalUsers = await User.countDocuments({
            _id: { $ne: userId },
            $or: [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { email: searchRegex },
                { 
                    $expr: {
                        $regexMatch: {
                            input: { $concat: ['$firstName', ' ', '$lastName'] },
                            regex: query.trim(),
                            options: 'i'
                        }
                    }
                }
            ]
        });

        const hasMore = skip + users.length < totalUsers;

        res.status(200).json({
            success: true,
            data: {
                users: usersWithStatus,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalUsers / limit),
                    hasMore,
                    totalUsers
                }
            }
        });
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search users',
            error: error.message
        });
    }
};

// Get friendship status with a specific user
export const getFriendshipStatus = async (req, res) => {
    try {
        const { userId: targetUserId } = req.params;
        const currentUserId = req.user.id;

        if (currentUserId === targetUserId) {
            return res.status(200).json({
                success: true,
                data: { status: 'self' }
            });
        }

        const friendship = await Friendship.findOne({
            $or: [
                { requester: currentUserId, recipient: targetUserId },
                { requester: targetUserId, recipient: currentUserId }
            ]
        });

        let status = 'none';
        let isRequester = false;
        let friendshipId = null;

        if (friendship) {
            status = friendship.status;
            isRequester = friendship.requester.toString() === currentUserId;
            friendshipId = friendship._id;
        }

        res.status(200).json({
            success: true,
            data: {
                status,
                isRequester,
                friendshipId
            }
        });
    } catch (error) {
        console.error('Error getting friendship status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get friendship status',
            error: error.message
        });
    }
};