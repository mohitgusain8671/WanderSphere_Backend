import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true
    },
    isGroupChat: {
        type: Boolean,
        default: false
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }],
    groupAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    groupImage: {
        type: String
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for better performance
chatSchema.index({ participants: 1 });
chatSchema.index({ lastActivity: -1 });
chatSchema.index({ isActive: 1 });

// Virtual for participant count
chatSchema.virtual('participantCount').get(function() {
    return this.participants.length;
});

// Method to check if user is participant
chatSchema.methods.isParticipant = function(userId) {
    return this.participants.includes(userId);
};

// Method to add participant
chatSchema.methods.addParticipant = function(userId) {
    if (!this.isParticipant(userId)) {
        this.participants.push(userId);
    }
};

// Method to remove participant
chatSchema.methods.removeParticipant = function(userId) {
    this.participants = this.participants.filter(id => !id.equals(userId));
};

const Chat = mongoose.model('Chat', chatSchema);
export default Chat;