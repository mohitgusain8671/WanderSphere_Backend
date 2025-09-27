import mongoose from 'mongoose';

const adventureTipSchema = new mongoose.Schema({
    date: {
        type: String,
        required: true,
        unique: true,
        index: true // For faster queries
    },
    tip: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
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

// Update the updatedAt field before saving
adventureTipSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Static method to get today's date in YYYY-MM-DD format
adventureTipSchema.statics.getTodayDate = function() {
    return new Date().toISOString().split('T')[0];
};

// Static method to find or create today's tip
adventureTipSchema.statics.findOrCreateToday = async function(tipData) {
    const today = this.getTodayDate();
    
    let adventureTip = await this.findOne({ date: today });
    
    if (!adventureTip) {
        adventureTip = new this({
            date: today,
            tip: tipData.tip,
            author: tipData.author
        });
        await adventureTip.save();
    }
    
    return adventureTip;
};

const AdventureTip = mongoose.model('AdventureTip', adventureTipSchema);

export default AdventureTip;