import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    content: {
        type: String,
        trim: true
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'video', 'audio', 'document', 'location'],
        default: 'text'
    },
    mediaFiles: [{
        url: String,
        type: {
            type: String,
            enum: ['image', 'video', 'audio', 'document']
        },
        fileName: String,
        fileSize: Number,
        mimeType: String
    }],
    replyTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    readBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }],
    deliveredTo: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        deliveredAt: {
            type: Date,
            default: Date.now
        }
    }],
    isEdited: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date
    },
    deletedFor: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

// Indexes for better performance
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ 'readBy.user': 1 });

// Virtual for read status
messageSchema.virtual('isRead').get(function() {
    return this.readBy.length > 0;
});

// Method to mark as read by user
messageSchema.methods.markAsRead = function(userId) {
    const existingRead = this.readBy.find(read => read.user.equals(userId));
    if (!existingRead) {
        this.readBy.push({ user: userId, readAt: new Date() });
    }
};

// Method to mark as delivered to user
messageSchema.methods.markAsDelivered = function(userId) {
    const existingDelivered = this.deliveredTo.find(delivered => delivered.user.equals(userId));
    if (!existingDelivered) {
        this.deliveredTo.push({ user: userId, deliveredAt: new Date() });
    }
};

// Method to check if message is deleted for user
messageSchema.methods.isDeletedForUser = function(userId) {
    return this.deletedFor.includes(userId);
};

const Message = mongoose.model('Message', messageSchema);
export default Message;