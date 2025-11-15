import Quiz from '../models/quiz.model.js';
import { QuizAttempt, UserStats } from '../models/userPerformance.model.js';
import User from '#models/users.model.js';

// ==================== ADMIN FUNCTIONS ====================

// Create Quiz
export const createQuiz = async (req, res) => {
  try {
    const { title, description, date, questions } = req.body;
    const adminId = req.user.id;

    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Title and questions are required' 
      });
    }

    const quiz = new Quiz({
      title,
      description,
      date: date || new Date(),
      questions,
      createdBy: adminId,
    });

    await quiz.save();

    res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      data: { quiz },
    });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error creating quiz' 
    });
  }
};

// Update Quiz
export const updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ 
        success: false,
        message: 'Quiz not found' 
      });
    }

    Object.assign(quiz, updates);
    await quiz.save();

    res.status(200).json({
      success: true,
      message: 'Quiz updated successfully',
      data: { quiz },
    });
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating quiz' 
    });
  }
};

// Delete Quiz
export const deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await Quiz.findByIdAndDelete(id);
    if (!quiz) {
      return res.status(404).json({ 
        success: false,
        message: 'Quiz not found' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Quiz deleted successfully',
    });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting quiz' 
    });
  }
};

// Get All Quizzes (Admin)
export const getAllQuizzes = async (req, res) => {
  try {
    const { page = 1, limit = 20, sortOrder = 'desc' } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { date: sortOrder === 'asc' ? 1 : -1 };

    const [quizzes, total] = await Promise.all([
      Quiz.find()
        .populate('createdBy', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Quiz.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        quizzes,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get all quizzes error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching quizzes' 
    });
  }
};

// Get Quiz by ID (Admin)
export const getQuizById = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await Quiz.findById(id).populate('createdBy', 'firstName lastName email');
    if (!quiz) {
      return res.status(404).json({ 
        success: false,
        message: 'Quiz not found' 
      });
    }

    // Get attempt count
    const attemptCount = await QuizAttempt.countDocuments({ quizId: id });

    res.status(200).json({
      success: true,
      data: { 
        quiz,
        attemptCount,
      },
    });
  } catch (error) {
    console.error('Get quiz by ID error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching quiz' 
    });
  }
};

// ==================== USER FUNCTIONS ====================

// Get Today's Quiz
export const getTodayQuiz = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find today's quiz
    const quiz = await Quiz.findOne({
      date: { $gte: today, $lt: tomorrow },
      isActive: true,
    });

    if (!quiz) {
      return res.status(404).json({ 
        success: false,
        message: 'No quiz available for today' 
      });
    }

    // Check if user already attempted
    const attempt = await QuizAttempt.findOne({
      userId,
      quizId: quiz._id,
    });

    // Return quiz without correct answers
    const quizData = quiz.toObject();
    quizData.questions = quizData.questions.map(q => ({
      question: q.question,
      options: q.options,
      points: q.points,
      timeLimit: q.timeLimit,
      bonusTimeThreshold: q.bonusTimeThreshold,
      bonusPoints: q.bonusPoints,
    }));

    res.status(200).json({
      success: true,
      data: { 
        quiz: quizData,
        hasAttempted: !!attempt,
      },
    });
  } catch (error) {
    console.error('Get today quiz error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching today\'s quiz' 
    });
  }
};

// Submit Quiz Attempt
export const submitQuizAttempt = async (req, res) => {
  try {
    const userId = req.user.id;
    const { quizId, answers } = req.body;

    if (!quizId || !answers || answers.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Quiz ID and answers are required' 
      });
    }

    // Check if already attempted
    const existingAttempt = await QuizAttempt.findOne({ userId, quizId });
    if (existingAttempt) {
      return res.status(400).json({ 
        success: false,
        message: 'You have already attempted this quiz' 
      });
    }

    // Get quiz
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ 
        success: false,
        message: 'Quiz not found' 
      });
    }

    // Calculate score
    let totalScore = 0;
    let correctAnswers = 0;
    let totalTimeTaken = 0;

    const processedAnswers = answers.map((answer, index) => {
      const question = quiz.questions[index];
      const isCorrect = answer.selectedAnswer === question.correctAnswer;
      let pointsEarned = 0;
      let bonusEarned = 0;

      if (isCorrect) {
        correctAnswers++;
        pointsEarned = question.points;
        
        // Check for bonus
        if (answer.timeTaken <= question.bonusTimeThreshold) {
          bonusEarned = question.bonusPoints;
        }
      }

      totalScore += pointsEarned + bonusEarned;
      totalTimeTaken += answer.timeTaken;

      return {
        questionIndex: index,
        selectedAnswer: answer.selectedAnswer,
        isCorrect,
        timeTaken: answer.timeTaken,
        pointsEarned,
        bonusEarned,
      };
    });

    // Create attempt
    const attempt = new QuizAttempt({
      userId,
      quizId,
      answers: processedAnswers,
      totalScore,
      totalTimeTaken,
      correctAnswers,
    });

    await attempt.save();

    // Update user stats
    await updateUserStatsAfterQuiz(userId, totalScore, correctAnswers, answers.length, totalTimeTaken);

    res.status(201).json({
      success: true,
      message: 'Quiz submitted successfully',
      data: { 
        attempt,
        totalScore,
        correctAnswers,
        totalQuestions: answers.length,
      },
    });
  } catch (error) {
    console.error('Submit quiz attempt error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error submitting quiz' 
    });
  }
};

// Get My Quiz History
export const getMyQuizHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [attempts, total] = await Promise.all([
      QuizAttempt.find({ userId })
        .populate('quizId') // Populate full quiz with questions
        .sort({ completedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      QuizAttempt.countDocuments({ userId }),
    ]);

    // Process attempts to include full question details with user's answers
    const processedAttempts = attempts.map(attempt => {
      const attemptObj = attempt.toObject();
      
      if (attemptObj.quizId && attemptObj.quizId.questions) {
        // Transform questions to have proper option objects
        attemptObj.quizId.questions = attemptObj.quizId.questions.map((question, qIndex) => {
          return {
            ...question,
            options: question.options.map((optionText, optIndex) => ({
              _id: `${qIndex}-${optIndex}`, // Generate a unique ID
              text: optionText,
              isCorrect: optIndex === question.correctAnswer,
            })),
          };
        });
        
        // Map answers to include full question details
        attemptObj.answers = attemptObj.answers.map(answer => {
          const question = attemptObj.quizId.questions[answer.questionIndex];
          const selectedOptionId = `${answer.questionIndex}-${answer.selectedAnswer}`;
          
          return {
            ...answer,
            selectedOption: selectedOptionId,
            timeTaken: answer.timeTaken,
            pointsAwarded: answer.pointsEarned + answer.bonusEarned,
            isCorrect: answer.isCorrect,
          };
        });
      }
      
      // Calculate bonus points
      attemptObj.bonusPoints = attemptObj.answers.reduce((sum, ans) => sum + (ans.bonusEarned || 0), 0);
      
      return attemptObj;
    });

    res.status(200).json({
      success: true,
      data: {
        attempts: processedAttempts,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get quiz history error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching quiz history' 
    });
  }
};

// Check Today's Attempt
export const checkTodayAttempt = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find today's quiz
    const quiz = await Quiz.findOne({
      date: { $gte: today, $lt: tomorrow },
      isActive: true,
    });

    if (!quiz) {
      return res.status(200).json({ 
        success: true,
        data: { hasAttempted: false, quizAvailable: false },
      });
    }

    // Check if attempted
    const attempt = await QuizAttempt.findOne({
      userId,
      quizId: quiz._id,
    });

    res.status(200).json({
      success: true,
      data: { 
        hasAttempted: !!attempt,
        quizAvailable: true,
        quizId: quiz._id,
      },
    });
  } catch (error) {
    console.error('Check today attempt error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error checking attempt' 
    });
  }
};

// Get Quiz Attempts (Admin)
export const getQuizAttempts = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [attempts, total] = await Promise.all([
      QuizAttempt.find({ quizId: id })
        .populate('userId', 'firstName lastName email')
        .sort({ completedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      QuizAttempt.countDocuments({ quizId: id }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        attempts,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get quiz attempts error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching quiz attempts' 
    });
  }
};

// Get Quiz Statistics (Admin)
export const getQuizStats = async (req, res) => {
  try {
    const { id } = req.params;

    const quiz = await Quiz.findById(id);
    if (!quiz) {
      return res.status(404).json({ 
        success: false,
        message: 'Quiz not found' 
      });
    }

    // Get all attempts for this quiz
    const attempts = await QuizAttempt.find({ quizId: id });

    // Calculate statistics for each question
    const questionStats = quiz.questions.map((question, index) => {
      const questionAttempts = attempts.filter(a => a.answers[index]);
      const correctCount = questionAttempts.filter(a => a.answers[index]?.isCorrect).length;

      return {
        questionIndex: index,
        attempts: questionAttempts.length,
        correct: correctCount,
        incorrect: questionAttempts.length - correctCount,
        accuracy: questionAttempts.length > 0 ? (correctCount / questionAttempts.length) * 100 : 0,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        questionStats,
        totalAttempts: attempts.length,
        averageScore: attempts.length > 0 
          ? attempts.reduce((sum, a) => sum + a.totalScore, 0) / attempts.length 
          : 0,
      },
    });
  } catch (error) {
    console.error('Get quiz stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching quiz statistics' 
    });
  }
};

// Helper function to update user stats
async function updateUserStatsAfterQuiz(userId, points, correct, total, timeTaken) {
  try {
    let stats = await UserStats.findOne({ userId });

    if (!stats) {
      stats = new UserStats({ userId });
    }

    stats.totalPoints += points;
    stats.quizzesTaken += 1;
    stats.totalQuestionsAnswered += total;
    stats.correctAnswers += correct;
    stats.totalTimePlayed += timeTaken;
    stats.averageScore = stats.totalPoints / (stats.quizzesTaken + stats.contestsParticipated);
    stats.averageTimePerQuestion = stats.totalTimePlayed / stats.totalQuestionsAnswered;
    stats.lastQuizDate = new Date();
    stats.updatedAt = new Date();

    await stats.save();
  } catch (error) {
    console.error('Update user stats error:', error);
  }
}
