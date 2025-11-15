import mongoose from 'mongoose';
const answerSchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true },

  type: {
    type: String,
    required: true,
    enum: ["mcq", "task"]
  },

  // MCQ
  selectedAnswer: { type: Number },

  // MCQ result (set during final submission)
  isCorrect: { type: Boolean, default: null },

  // Task submissions (text/trivia/photo url)
  taskSubmission: { type: String },
  taskSubmissionType: { type: String }, // 'text' | 'photo' | 'trivia'

  // Scoring
  pointsEarned: { type: Number, default: 0 },

  // Admin review for tasks
  adminComment: { type: String, default: "" }
});

// Quiz Attempt Schema
const quizAttemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  answers: [{
    questionIndex: Number,
    selectedAnswer: Number,
    isCorrect: Boolean,
    timeTaken: Number, // in seconds
    pointsEarned: Number,
    bonusEarned: Number,
  }],
  totalScore: {
    type: Number,
    default: 0,
  },
  totalTimeTaken: {
    type: Number, // in seconds
    default: 0,
  },
  correctAnswers: {
    type: Number,
    default: 0,
  },
  completedAt: {
    type: Date,
    default: Date.now,
  },
});

// Contest Submission Schema
const contestSubmissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  contestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    required: true,
  },
  answers: [answerSchema],
  totalScore: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['in_progress', 'submitted'],
    default: 'in_progress',
  },
  submittedAt: {
    type: Date,
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// User Stats Schema (Overall Performance)
const userStatsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  totalPoints: {
    type: Number,
    default: 0,
  },
  quizzesTaken: {
    type: Number,
    default: 0,
  },
  contestsParticipated: {
    type: Number,
    default: 0,
  },
  totalQuestionsAnswered: {
    type: Number,
    default: 0,
  },
  correctAnswers: {
    type: Number,
    default: 0,
  },
  averageScore: {
    type: Number,
    default: 0,
  },
  averageTimePerQuestion: {
    type: Number, // in seconds
    default: 0,
  },
  totalTimePlayed: {
    type: Number, // in seconds
    default: 0,
  },
  rank: {
    type: Number,
    default: 0,
  },
  lastQuizDate: {
    type: Date,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes for efficient queries
quizAttemptSchema.index({ userId: 1, quizId: 1 }, { unique: true });
quizAttemptSchema.index({ completedAt: -1 });
quizAttemptSchema.index({ totalScore: -1 });

contestSubmissionSchema.index({ userId: 1, contestId: 1 }, { unique: true });
contestSubmissionSchema.index({ contestId: 1, totalScore: -1 });
contestSubmissionSchema.index({ submittedAt: -1 });

userStatsSchema.index({ totalPoints: -1 });
userStatsSchema.index({ rank: 1 });

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);
const ContestSubmission = mongoose.model('ContestSubmission', contestSubmissionSchema);
const UserStats = mongoose.model('UserStats', userStatsSchema);

export { QuizAttempt, ContestSubmission, UserStats };
