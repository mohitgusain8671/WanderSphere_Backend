import mongoose from 'mongoose';

// Location Schema
const locationSchema = new mongoose.Schema({
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
  },
  country: {
    type: String,
    required: true,
  },
  coordinates: {
    latitude: Number,
    longitude: Number,
  },
});

const localBuddySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  buddyName: {
    type: String,
    required: true,
    trim: true,
    minLength: 2,
    maxLength: 100,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  profilePicture: {
    type: String,
    default: null,
  },
  description: {
    type: String,
    required: true,
    maxLength: 1000,
  },
  documents: [{
    type: String, // URLs to uploaded documents
  }],
  services: [{
    type: String,
    required: true,
    enum: [
      'Tour Guide',
      'Transportation',
      'Accommodation Help',
      'Language Translation',
      'Photography',
      'Food Guide',
      'Adventure Activities',
      'Cultural Experience',
      'Shopping Assistant',
      'Event Planning',
      'Airport Pickup',
      'Custom Services',
    ],
  }],
  locations: [locationSchema],
  pricing: {
    hourlyRate: {
      type: Number,
      min: 0,
    },
    perDayCharge: {
      type: Number,
      min: 0,
    },
    customPackageCharge: {
      type: Number,
      min: 0,
    },
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'banned'],
    default: 'pending',
  },
  rejectionReason: {
    type: String,
    default: null,
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    count: {
      type: Number,
      default: 0,
    },
  },
  totalBookings: {
    type: Number,
    default: 0,
  },
  completedBookings: {
    type: Number,
    default: 0,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for better search performance
// Note: userId already has unique index from field definition
localBuddySchema.index({ status: 1 });
localBuddySchema.index({ 'locations.city': 1 });
localBuddySchema.index({ 'locations.country': 1 });
localBuddySchema.index({ services: 1 });
localBuddySchema.index({ 'rating.average': -1 });
localBuddySchema.index({ 'locations.coordinates': '2dsphere' });

const LocalBuddy = mongoose.model('LocalBuddy', localBuddySchema);
export default LocalBuddy;
