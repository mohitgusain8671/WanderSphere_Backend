import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  options: [{
    type: String,
    required: true,
  }],
  correctAnswer: {
    type: Number, // Index of correct option (0-3)
    required: true,
  },
  points: {
    type: Number,
    default: 10,
  },
  timeLimit: {
    type: Number, // Time limit in seconds
    default: 30,
  },
  bonusTimeThreshold: {
    type: Number, // Time in seconds to get bonus points
    default: 10,
  },
  bonusPoints: {
    type: Number,
    default: 2,
  },
});

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
  },
  questions: [questionSchema],
  totalPoints: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
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
quizSchema.pre('save', function(next) {
  if (this.questions && this.questions.length > 0) {
    this.totalPoints = this.questions.reduce((sum, q) => sum + q.points + q.bonusPoints, 0);
  }
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
quizSchema.index({ date: -1 });
quizSchema.index({ isActive: 1, date: -1 });

const Quiz = mongoose.model('Quiz', quizSchema);

export default Quiz;
