import mongoose from "mongoose";

const NotificationSchema = mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    type: {
        type: String,
        enum: [
            'friend_request',
            'friend_accepted',
            'post_like',
            'post_comment',
            'story_like',
            'tagged_in_post'
        ],
        required: true
    },
    message: {
        type: String,
        required: true
    },
    data: {
        // Additional data for the notification
        postId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Post'
        },
        storyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Story'
        },
        friendshipId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Friendship'
        },
        commentId: String
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Indexes for better query performance
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', NotificationSchema);

export default Notification;