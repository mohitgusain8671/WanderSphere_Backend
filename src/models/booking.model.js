import mongoose from 'mongoose';

// Location Schema
const locationSchema = new mongoose.Schema({
  city: String,
  state: String,
  country: String,
}, { _id: false });

// Duration Schema
const durationSchema = new mongoose.Schema({
  hours: Number,
  days: Number,
}, { _id: false });

// Buddy Response Schema
const buddyResponseSchema = new mongoose.Schema({
  message: {
    type: String,
    maxLength: 500,
  },
  respondedAt: Date,
}, { _id: false });

// Rating Schema
const ratingSchema = new mongoose.Schema({
  score: {
    type: Number,
    min: 1,
    max: 5,
  },
  review: {
    type: String,
    maxLength: 1000,
  },
  ratedAt: Date,
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true,
    // Not required here since it's auto-generated in pre-save hook
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  buddyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LocalBuddy',
    required: true,
  },
  serviceType: {
    type: String,
    required: true,
  },
  location: locationSchema,
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
  },
  duration: durationSchema,
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentMode: {
    type: String,
    enum: ['cash'],
    default: 'cash',
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'ongoing', 'completed', 'cancelled'],
    default: 'pending',
  },
  message: {
    type: String,
    maxLength: 500,
  },
  buddyResponse: buddyResponseSchema,
  initiatedBy: {
    type: String,
    enum: ['user', 'buddy'],
    required: true,
  },
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
  },
  rating: ratingSchema,
  cancellationReason: {
    type: String,
    maxLength: 500,
  },
  cancelledBy: {
    type: String,
    enum: ['user', 'buddy', 'admin'],
  },
  cancelledAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes
// Note: bookingId already has unique index from field definition
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ buddyId: 1, status: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ createdAt: -1 });

// Generate unique booking ID
bookingSchema.pre('save', async function(next) {
  if (!this.bookingId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    this.bookingId = `BK-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
