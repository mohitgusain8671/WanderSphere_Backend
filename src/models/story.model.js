import mongoose from "mongoose";

const StorySchema = mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    mediaFile: {
        url: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['image', 'video'],
            required: true
        },
        fileName: String,
        fileSize: Number
    },
    caption: {
        type: String,
        maxLength: 500
    },
    likes: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    viewers: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        viewedAt: {
            type: Date,
            default: Date.now
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    },
    expiresAt: {
        type: Date,
        required: true,
        default: function() {
            // Set expiry to 24 hours from now
            return new Date(Date.now() + 24 * 60 * 60 * 1000);
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for automatic expiry
StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Indexes for better query performance
StorySchema.index({ author: 1, createdAt: -1 });
StorySchema.index({ createdAt: -1 });
StorySchema.index({ isActive: 1, expiresAt: 1 });

const Story = mongoose.model('Story', StorySchema);

export default Story;