import Chat from '#models/chat.model.js';
import Message from '#models/message.model.js';
import User from '#models/users.model.js';
import Friendship from '#models/friendship.model.js';

// Get all chats for a user
export const getUserChats = async (req, res) => {
    try {
        const { page = 1, limit = 20, filter = 'all' } = req.query;
        const userId = req.user._id;
        const skip = (page - 1) * limit;

        let matchCondition = {
            participants: userId,
            isActive: true
        };

        // Apply filters
        if (filter === 'groups') {
            matchCondition.isGroupChat = true;
        } else if (filter === 'friends') {
            matchCondition.isGroupChat = false;
        } else if (filter === 'unread') {
            // Will be handled in aggregation
        }

        const chats = await Chat.find(matchCondition)
            .populate('participants', 'firstName lastName profilePicture isOnline lastSeen')
            .populate('groupAdmin', 'firstName lastName profilePicture')
            .populate({
                path: 'lastMessage',
                populate: {
                    path: 'sender',
                    select: 'firstName lastName'
                }
            })
            .sort({ lastActivity: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Get unread count for each chat
        const chatsWithUnreadCount = await Promise.all(
            chats.map(async (chat) => {
                const unreadCount = await Message.countDocuments({
                    chat: chat._id,
                    sender: { $ne: userId },
                    'readBy.user': { $ne: userId },
                    isDeleted: false
                });

                // Filter for unread if requested
                if (filter === 'unread' && unreadCount === 0) {
                    return null;
                }

                return {
                    ...chat,
                    unreadCount,
                    chatName: chat.isGroupChat ? chat.name : 
                        chat.participants.find(p => !p._id.equals(userId))?.firstName + ' ' +
                        chat.participants.find(p => !p._id.equals(userId))?.lastName
                };
            })
        );

        const filteredChats = chatsWithUnreadCount.filter(chat => chat !== null);

        const totalChats = await Chat.countDocuments(matchCondition);

        res.status(200).json({
            success: true,
            data: {
                chats: filteredChats,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalChats / limit),
                    totalChats,
                    hasMore: skip + filteredChats.length < totalChats
                }
            }
        });
    } catch (error) {
        console.error('Error getting user chats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get chats',
            error: error.message
        });
    }
};

// Create new chat (one-on-one)
export const createChat = async (req, res) => {
    try {
        const { participantId } = req.body;
        const userId = req.user._id;

        if (participantId === userId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot create chat with yourself'
            });
        }

        // Check if participant exists
        const participant = await User.findById(participantId);
        if (!participant) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if chat already exists
        const existingChat = await Chat.findOne({
            isGroupChat: false,
            participants: { $all: [userId, participantId], $size: 2 }
        });

        if (existingChat) {
            return res.status(200).json({
                success: true,
                data: { chat: existingChat },
                message: 'Chat already exists'
            });
        }

        // Create new chat
        const newChat = new Chat({
            participants: [userId, participantId],
            isGroupChat: false
        });

        await newChat.save();
        await newChat.populate('participants', 'firstName lastName profilePicture isOnline lastSeen');

        res.status(201).json({
            success: true,
            data: { chat: newChat },
            message: 'Chat created successfully'
        });
    } catch (error) {
        console.error('Error creating chat:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create chat',
            error: error.message
        });
    }
};

// Create group chat
export const createGroupChat = async (req, res) => {
    try {
        const { name, participantIds } = req.body;
        const userId = req.user._id;

        if (!name || !participantIds || participantIds.length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Group name and at least 2 participants are required'
            });
        }

        // Verify all participants are friends
        const friendships = await Friendship.find({
            $or: [
                { requester: userId, recipient: { $in: participantIds }, status: 'accepted' },
                { recipient: userId, requester: { $in: participantIds }, status: 'accepted' }
            ]
        });

        const friendIds = friendships.map(f => 
            (f.requester.equals(userId) ? f.recipient : f.requester).toString()
        );

        const invalidParticipants = participantIds.filter(id => !friendIds.includes(id.toString()));
        if (invalidParticipants.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Can only add friends to group chat'
            });
        }

        // Create group chat
        const participants = [userId, ...participantIds];
        const newGroupChat = new Chat({
            name,
            participants,
            isGroupChat: true,
            groupAdmin: userId
        });

        await newGroupChat.save();
        await newGroupChat.populate('participants', 'firstName lastName profilePicture');
        await newGroupChat.populate('groupAdmin', 'firstName lastName profilePicture');

        res.status(201).json({
            success: true,
            data: { chat: newGroupChat },
            message: 'Group chat created successfully'
        });
    } catch (error) {
        console.error('Error creating group chat:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create group chat',
            error: error.message
        });
    }
};

// Search users for new chat
export const searchUsersForChat = async (req, res) => {
    try {
        const { query } = req.query;
        const userId = req.user._id;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: 'Search query must be at least 2 characters'
            });
        }

        const searchRegex = new RegExp(query.trim(), 'i');
        
        const users = await User.find({
            _id: { $ne: userId },
            $or: [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { email: searchRegex }
            ]
        })
        .select('firstName lastName email profilePicture')
        .limit(20)
        .lean();

        res.status(200).json({
            success: true,
            data: { users }
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

// Get chat details
export const getChatDetails = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user._id;

        const chat = await Chat.findOne({
            _id: chatId,
            participants: userId
        })
        .populate('participants', 'firstName lastName profilePicture isOnline lastSeen')
        .populate('groupAdmin', 'firstName lastName profilePicture');

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        res.status(200).json({
            success: true,
            data: { chat }
        });
    } catch (error) {
        console.error('Error getting chat details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get chat details',
            error: error.message
        });
    }
};

// Delete chat
export const deleteChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const userId = req.user._id;

        const chat = await Chat.findOne({
            _id: chatId,
            participants: userId
        });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        if (chat.isGroupChat && !chat.groupAdmin.equals(userId)) {
            return res.status(403).json({
                success: false,
                message: 'Only group admin can delete group chat'
            });
        }

        chat.isActive = false;
        await chat.save();

        res.status(200).json({
            success: true,
            message: 'Chat deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting chat:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete chat',
            error: error.message
        });
    }
};