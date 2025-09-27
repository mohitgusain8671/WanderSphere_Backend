import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  time: {
    type: String,
    required: true
  },
  activity: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  estimatedCost: {
    type: String,
    required: false
  },
  tips: {
    type: String,
    required: false
  }
});

const daySchema = new mongoose.Schema({
  day: {
    type: Number,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  theme: {
    type: String,
    required: true
  },
  activities: [activitySchema]
});

const itinerarySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  destination: {
    type: String,
    required: true,
    trim: true
  },
  
  // User input parameters
  preferences: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    duration: {
      type: Number,
      required: true
    },
    budget: {
      type: String,
      required: true,
      enum: ['budget', 'mid-range', 'luxury']
    },
    travelStyle: {
      type: String,
      required: true,
      enum: ['adventure', 'relaxation', 'cultural', 'family', 'romantic', 'business', 'backpacking']
    },
    interests: [{
      type: String,
      required: true
    }],
    accommodation: {
      type: String,
      required: true,
      enum: ['hotel', 'hostel', 'airbnb', 'resort', 'guesthouse']
    },
    transportation: {
      type: String,
      required: true,
      enum: ['flight', 'train', 'bus', 'car', 'mixed']
    },
    groupSize: {
      type: Number,
      required: true,
      min: 1
    },
    specialRequirements: {
      type: String,
      default: ''
    }
  },

  // AI Generated Content
  overview: {
    type: String,
    required: true
  },
  highlights: [{
    type: String,
    required: true
  }],
  
  dailyPlan: [daySchema],
  
  recommendations: {
    restaurants: [{
      name: String,
      cuisine: String,
      priceRange: String,
      location: String,
      speciality: String
    }],
    hotels: [{
      name: String,
      type: String,
      priceRange: String,
      location: String,
      amenities: [String]
    }],
    tips: [{
      category: String,
      tip: String
    }]
  },

  estimatedBudget: {
    total: String,
    breakdown: {
      accommodation: String,
      food: String,
      activities: String,
      transportation: String,
      miscellaneous: String
    }
  },

  // Metadata
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes for better performance
itinerarySchema.index({ userId: 1, createdAt: -1 });
itinerarySchema.index({ destination: 1 });
itinerarySchema.index({ 'preferences.startDate': 1 });
itinerarySchema.index({ tags: 1 });

// Static methods
itinerarySchema.statics.getUserItineraries = async function(userId, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  
  const itineraries = await this.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select('-dailyPlan -recommendations') // Exclude heavy fields for listing
    .lean();
    
  const total = await this.countDocuments({ userId });
  
  return {
    itineraries,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total
    }
  };
};

itinerarySchema.statics.getByIdAndUser = async function(itineraryId, userId) {
  return await this.findOne({ _id: itineraryId, userId }).lean();
};

// Instance methods
itinerarySchema.methods.updateRating = async function(rating) {
  this.rating = rating;
  return await this.save();
};

itinerarySchema.methods.addNotes = async function(notes) {
  this.notes = notes;
  return await this.save();
};

const Itinerary = mongoose.model('Itinerary', itinerarySchema);

export default Itinerary;