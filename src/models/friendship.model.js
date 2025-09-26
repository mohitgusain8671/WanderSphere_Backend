import mongoose from "mongoose";

const FriendshipSchema = mongoose.Schema({
    requester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'blocked'],
        default: 'pending'
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    respondedAt: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to prevent duplicate friend requests
FriendshipSchema.index({ requester: 1, recipient: 1 }, { unique: true });

// Indexes for better query performance
FriendshipSchema.index({ requester: 1, status: 1 });
FriendshipSchema.index({ recipient: 1, status: 1 });

const Friendship = mongoose.model('Friendship', FriendshipSchema);

export default Friendship;