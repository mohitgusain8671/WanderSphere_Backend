import Message from '#models/message.model.js';
import Chat from '#models/chat.model.js';
import { deleteFromS3 } from '#config/s3.js';

// Get messages for a chat
export const getChatMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { page = 1, limit = 100 } = req.query;
        const userId = req.user._id;
        const skip = (page - 1) * limit;

        // Verify user is participant of the chat
        const chat = await Chat.findOne({
            _id: chatId,
            participants: userId
        });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found or access denied'
            });
        }

        const messages = await Message.find({
            chat: chatId,
            isDeleted: false,
            deletedFor: { $ne: userId }
        })
        .populate('sender', 'firstName lastName profilePicture')
        .populate({
            path: 'replyTo',
            populate: {
                path: 'sender',
                select: 'firstName lastName'
            }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean();

        // Group messages by date
        const groupedMessages = groupMessagesByDate(messages.reverse());

        const totalMessages = await Message.countDocuments({
            chat: chatId,
            isDeleted: false,
            deletedFor: { $ne: userId }
        });

        res.status(200).json({
            success: true,
            data: {
                messages: groupedMessages,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalMessages / limit),
                    totalMessages,
                    hasMore: skip + messages.length < totalMessages
                }
            }
        });
    } catch (error) {
        console.error('Error getting chat messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get messages',
            error: error.message
        });
    }
};

// Send message
export const sendMessage = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { content, messageType = 'text', replyToId } = req.body;
        const userId = req.user._id;

        // Verify user is participant of the chat
        const chat = await Chat.findOne({
            _id: chatId,
            participants: userId
        });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found or access denied'
            });
        }

        // Validate message content
        if (!content && (!req.files || req.files.length === 0)) {
            return res.status(400).json({
                success: false,
                message: 'Message content or media files are required'
            });
        }

        // Process media files if any
        let mediaFiles = [];
        if (req.files && req.files.length > 0) {
            mediaFiles = req.files.map(file => ({
                url: file.location,
                type: file.mimetype.startsWith('image/') ? 'image' : 
                      file.mimetype.startsWith('video/') ? 'video' :
                      file.mimetype.startsWith('audio/') ? 'audio' : 'document',
                fileName: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype
            }));
        }

        // Create message
        const message = new Message({
            chat: chatId,
            sender: userId,
            content: content || '',
            messageType,
            mediaFiles,
            replyTo: replyToId || null
        });

        await message.save();
        await message.populate('sender', 'firstName lastName profilePicture');
        
        if (replyToId) {
            await message.populate({
                path: 'replyTo',
                populate: {
                    path: 'sender',
                    select: 'firstName lastName'
                }
            });
        }

        // Update chat's last message and activity
        chat.lastMessage = message._id;
        chat.lastActivity = new Date();
        await chat.save();

        // Mark as delivered to all participants except sender
        const otherParticipants = chat.participants.filter(p => !p.equals(userId));
        otherParticipants.forEach(participantId => {
            message.markAsDelivered(participantId);
        });
        await message.save();

        res.status(201).json({
            success: true,
            data: { message },
            message: 'Message sent successfully'
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message',
            error: error.message
        });
    }
};

// Mark messages as read
export const markMessagesAsRead = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { messageIds } = req.body;
        const userId = req.user._id;

        // Verify user is participant of the chat
        const chat = await Chat.findOne({
            _id: chatId,
            participants: userId
        });

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found or access denied'
            });
        }

        // Mark messages as read
        await Message.updateMany(
            {
                _id: { $in: messageIds },
                chat: chatId,
                sender: { $ne: userId },
                'readBy.user': { $ne: userId }
            },
            {
                $push: {
                    readBy: {
                        user: userId,
                        readAt: new Date()
                    }
                }
            }
        );

        res.status(200).json({
            success: true,
            message: 'Messages marked as read'
        });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark messages as read',
            error: error.message
        });
    }
};

// Delete message
export const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { deleteForEveryone = false } = req.body;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        // Verify user is sender or has permission
        if (!message.sender.equals(userId)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to delete this message'
            });
        }

        if (deleteForEveryone) {
            // Delete for everyone (only within 24 hours)
            const hoursSinceCreated = (new Date() - message.createdAt) / (1000 * 60 * 60);
            if (hoursSinceCreated > 24) {
                return res.status(400).json({
                    success: false,
                    message: 'Can only delete for everyone within 24 hours'
                });
            }

            message.isDeleted = true;
            message.deletedAt = new Date();
            
            // Delete media files from S3
            if (message.mediaFiles && message.mediaFiles.length > 0) {
                for (const file of message.mediaFiles) {
                    await deleteFromS3(file.url);
                }
            }
        } else {
            // Delete for self only
            message.deletedFor.push(userId);
        }

        await message.save();

        res.status(200).json({
            success: true,
            message: 'Message deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete message',
            error: error.message
        });
    }
};

// Edit message
export const editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        const userId = req.user._id;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        // Verify user is sender
        if (!message.sender.equals(userId)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to edit this message'
            });
        }

        // Can only edit text messages
        if (message.messageType !== 'text') {
            return res.status(400).json({
                success: false,
                message: 'Can only edit text messages'
            });
        }

        message.content = content;
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();

        await message.populate('sender', 'firstName lastName profilePicture');

        res.status(200).json({
            success: true,
            data: { message },
            message: 'Message edited successfully'
        });
    } catch (error) {
        console.error('Error editing message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to edit message',
            error: error.message
        });
    }
};

// Helper function to group messages by date
function groupMessagesByDate(messages) {
    const grouped = {};
    
    messages.forEach(message => {
        const date = new Date(message.createdAt).toDateString();
        if (!grouped[date]) {
            grouped[date] = [];
        }
        grouped[date].push(message);
    });

    return Object.keys(grouped).map(date => ({
        date,
        messages: grouped[date]
    }));
}