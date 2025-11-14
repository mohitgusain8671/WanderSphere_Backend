import mongoose from 'mongoose';

const QuerySchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['post', 'comment', 'story', 'account', 'itinerary', 'other'],
    required: true,
  },
  subject: {
    type: String,
    required: true,
    maxLength: 200,
  },
  description: {
    type: String,
    required: true,
    maxLength: 2000,
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'rejected'],
    default: 'pending',
  },
  adminResponse: {
    message: {
      type: String,
      maxLength: 1000,
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    respondedAt: {
      type: Date,
    },
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium',
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

// Indexes for better query performance
QuerySchema.index({ userId: 1, createdAt: -1 });
QuerySchema.index({ status: 1, createdAt: -1 });
QuerySchema.index({ type: 1, status: 1 });

const Query = mongoose.model('Query', QuerySchema);

export default Query;
