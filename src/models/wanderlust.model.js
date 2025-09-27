import mongoose from 'mongoose';

const wanderlustSchema = new mongoose.Schema({
    date: {
        type: String,
        required: true,
        unique: true,
        index: true // For faster queries
    },
    destinations: [{
        destination: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true
        },
        emoji: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        highlights: [{
            type: String
        }],
        bestTime: {
            type: String,
            required: true
        },
        activities: [{
            type: String
        }],
        article: {
            type: String,
            required: true
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
wanderlustSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Static method to get today's date in YYYY-MM-DD format
wanderlustSchema.statics.getTodayDate = function() {
    return new Date().toISOString().split('T')[0];
};

// Static method to find or create today's wanderlust
wanderlustSchema.statics.findOrCreateToday = async function(destinations) {
    const today = this.getTodayDate();
    
    let wanderlust = await this.findOne({ date: today });
    
    if (!wanderlust) {
        wanderlust = new this({
            date: today,
            destinations: destinations
        });
        await wanderlust.save();
    }
    
    return wanderlust;
};

const Wanderlust = mongoose.model('Wanderlust', wanderlustSchema);

export default Wanderlust;