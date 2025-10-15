import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '#models/users.model.js';
import Chat from '#models/chat.model.js';
import Message from '#models/message.model.js';

class SocketManager {
    constructor(server) {
        this.io = new Server(server, {
            cors: {
                origin: process.env.FRONTEND_URL || "http://localhost:3000",
                methods: ["GET", "POST"],
                credentials: true
            }
        });

        this.connectedUsers = new Map(); // userId -> socketId
        this.userSockets = new Map(); // socketId -> userId

        this.setupMiddleware();
        this.setupEventHandlers();
    }

    setupMiddleware() {
        // Authentication middleware
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token) {
                    return next(new Error('Authentication error'));
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.userId);
                
                if (!user) {
                    return next(new Error('User not found'));
                }

                socket.userId = user._id.toString();
                socket.user = user;
                next();
            } catch (error) {
                next(new Error('Authentication error'));
            }
        });
    }

    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            console.log(`User ${socket.userId} connected`);
            
            // Store user connection
            this.connectedUsers.set(socket.userId, socket.id);
            this.userSockets.set(socket.id, socket.userId);

            // Update user online status
            this.updateUserOnlineStatus(socket.userId, true);

            // Join user to their chat rooms
            this.joinUserChats(socket);

            // Handle events
            this.handleJoinChat(socket);
            this.handleLeaveChat(socket);
            this.handleSendMessage(socket);
            this.handleMessageRead(socket);
            this.handleMessageDelivered(socket);
            this.handleTyping(socket);
            this.handleStopTyping(socket);
            this.handleDisconnect(socket);
        });
    }

    async joinUserChats(socket) {
        try {
            const chats = await Chat.find({
                participants: socket.userId,
                isActive: true
            }).select('_id');

            chats.forEach(chat => {
                socket.join(chat._id.toString());
            });
        } catch (error) {
            console.error('Error joining user chats:', error);
        }
    }

    handleJoinChat(socket) {
        socket.on('join_chat', async (chatId) => {
            try {
                const chat = await Chat.findOne({
                    _id: chatId,
                    participants: socket.userId
                });

                if (chat) {
                    socket.join(chatId);
                    socket.emit('joined_chat', { chatId });
                }
            } catch (error) {
                socket.emit('error', { message: 'Failed to join chat' });
            }
        });
    }

    handleLeaveChat(socket) {
        socket.on('leave_chat', (chatId) => {
            socket.leave(chatId);
            socket.emit('left_chat', { chatId });
        });
    }

    handleSendMessage(socket) {
        socket.on('send_message', async (data) => {
            try {
                const { chatId, content, messageType, replyToId } = data;

                // Verify user is participant
                const chat = await Chat.findOne({
                    _id: chatId,
                    participants: socket.userId
                });

                if (!chat) {
                    socket.emit('error', { message: 'Chat not found' });
                    return;
                }

                // Create message
                const message = new Message({
                    chat: chatId,
                    sender: socket.userId,
                    content,
                    messageType: messageType || 'text',
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

                // Update chat
                chat.lastMessage = message._id;
                chat.lastActivity = new Date();
                await chat.save();

                // Mark as delivered to online participants
                const otherParticipants = chat.participants.filter(p => !p.equals(socket.userId));
                otherParticipants.forEach(participantId => {
                    const participantSocketId = this.connectedUsers.get(participantId.toString());
                    if (participantSocketId) {
                        message.markAsDelivered(participantId);
                    }
                });
                await message.save();

                // Emit to all participants in the chat
                this.io.to(chatId).emit('new_message', {
                    message,
                    chatId
                });

                // Emit chat update to all participants
                this.io.to(chatId).emit('chat_updated', {
                    chatId,
                    lastMessage: message,
                    lastActivity: chat.lastActivity
                });

            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });
    }

    handleMessageRead(socket) {
        socket.on('message_read', async (data) => {
            try {
                const { messageId, chatId } = data;

                const message = await Message.findById(messageId);
                if (message && !message.sender.equals(socket.userId)) {
                    message.markAsRead(socket.userId);
                    await message.save();

                    // Notify sender about read receipt
                    const senderSocketId = this.connectedUsers.get(message.sender.toString());
                    if (senderSocketId) {
                        this.io.to(senderSocketId).emit('message_read_receipt', {
                            messageId,
                            chatId,
                            readBy: socket.userId,
                            readAt: new Date()
                        });
                    }
                }
            } catch (error) {
                console.error('Error marking message as read:', error);
            }
        });
    }

    handleMessageDelivered(socket) {
        socket.on('message_delivered', async (data) => {
            try {
                const { messageId, chatId } = data;

                const message = await Message.findById(messageId);
                if (message && !message.sender.equals(socket.userId)) {
                    message.markAsDelivered(socket.userId);
                    await message.save();

                    // Notify sender about delivery receipt
                    const senderSocketId = this.connectedUsers.get(message.sender.toString());
                    if (senderSocketId) {
                        this.io.to(senderSocketId).emit('message_delivered_receipt', {
                            messageId,
                            chatId,
                            deliveredTo: socket.userId,
                            deliveredAt: new Date()
                        });
                    }
                }
            } catch (error) {
                console.error('Error marking message as delivered:', error);
            }
        });
    }

    handleTyping(socket) {
        socket.on('typing', (data) => {
            const { chatId } = data;
            socket.to(chatId).emit('user_typing', {
                userId: socket.userId,
                chatId,
                user: {
                    _id: socket.userId,
                    firstName: socket.user.firstName,
                    lastName: socket.user.lastName
                }
            });
        });
    }

    handleStopTyping(socket) {
        socket.on('stop_typing', (data) => {
            const { chatId } = data;
            socket.to(chatId).emit('user_stop_typing', {
                userId: socket.userId,
                chatId
            });
        });
    }

    handleDisconnect(socket) {
        socket.on('disconnect', () => {
            console.log(`User ${socket.userId} disconnected`);
            
            // Remove from connected users
            this.connectedUsers.delete(socket.userId);
            this.userSockets.delete(socket.id);

            // Update user offline status
            this.updateUserOnlineStatus(socket.userId, false);
        });
    }

    async updateUserOnlineStatus(userId, isOnline) {
        try {
            await User.findByIdAndUpdate(userId, {
                isOnline,
                lastSeen: isOnline ? null : new Date()
            });

            // Notify all connected users about status change
            this.io.emit('user_status_changed', {
                userId,
                isOnline,
                lastSeen: isOnline ? null : new Date()
            });
        } catch (error) {
            console.error('Error updating user online status:', error);
        }
    }

    // Method to send notification to specific user
    sendNotificationToUser(userId, notification) {
        const socketId = this.connectedUsers.get(userId.toString());
        if (socketId) {
            this.io.to(socketId).emit('notification', notification);
        }
    }

    // Method to get online users count
    getOnlineUsersCount() {
        return this.connectedUsers.size;
    }

    // Method to check if user is online
    isUserOnline(userId) {
        return this.connectedUsers.has(userId.toString());
    }
}

export default SocketManager;