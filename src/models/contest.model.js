import mongoose from 'mongoose';

const contestQuestionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['mcq', 'task'],
    required: true,
  },
  question: {
    type: String,
    required: true,
  },
  // For MCQ type
  options: [{
    type: String,
  }],
  correctAnswer: {
    type: Number, // Index of correct option for MCQ
  },
  // For Task type
  taskDescription: {
    type: String,
  },
  taskType: {
    type: String,
    enum: ['photo', 'text', 'trivia'],
  },
  // Common fields
  points: {
    type: Number,
    default: 10,
  },
  order: {
    type: Number,
    default: 0,
  },
});

const contestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  questions: [contestQuestionSchema],
  totalPoints: {
    type: Number,
    default: 0,
  },
  prize: {
    description: String,
    value: String,
  },
  hasLeaderboard: {
    type: Boolean,
    default: true,
  },
  status: {
    type: String,
    enum: ['upcoming', 'active', 'completed'],
    default: 'upcoming',
  },
  participantCount: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
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

// Calculate total points before saving
contestSchema.pre('save', function(next) {
  if (this.questions && this.questions.length > 0) {
    this.totalPoints = this.questions.reduce((sum, q) => sum + q.points, 0);
  }
  
  // Update status based on time
  const now = new Date();
  if (now < this.startTime) {
    this.status = 'upcoming';
  } else if (now >= this.startTime && now <= this.endTime) {
    this.status = 'active';
  } else {
    this.status = 'completed';
  }
  
  this.updatedAt = Date.now();
  next();
});

// Indexes
contestSchema.index({ startTime: 1, endTime: 1 });
contestSchema.index({ status: 1 });

const Contest = mongoose.model('Contest', contestSchema);

export default Contest;
