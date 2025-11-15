import Contest from '../models/contest.model.js';
import { ContestSubmission, UserStats } from '../models/userPerformance.model.js';
import User from '#models/users.model.js';

// ==================== ADMIN FUNCTIONS ====================

// Create Contest
export const createContest = async (req, res) => {
  try {
    const { title, description, startTime, endTime, questions, prize, hasLeaderboard } = req.body;
    const adminId = req.user.id;

    if (!title || !startTime || !endTime || !questions || questions.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Title, start time, end time, and questions are required' 
      });
    }

    const contest = new Contest({
      title,
      description,
      startTime,
      endTime,
      questions,
      prize,
      hasLeaderboard,
      createdBy: adminId,
    });

    await contest.save();

    res.status(201).json({
      success: true,
      message: 'Contest created successfully',
      data: { contest },
    });
  } catch (error) {
    console.error('Create contest error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error creating contest' 
    });
  }
};

// Update Contest
export const updateContest = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ 
        success: false,
        message: 'Contest not found' 
      });
    }

    Object.assign(contest, updates);
    await contest.save();

    res.status(200).json({
      success: true,
      message: 'Contest updated successfully',
      data: { contest },
    });
  } catch (error) {
    console.error('Update contest error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error updating contest' 
    });
  }
};

// Delete Contest
export const deleteContest = async (req, res) => {
  try {
    const { id } = req.params;

    const contest = await Contest.findByIdAndDelete(id);
    if (!contest) {
      return res.status(404).json({ 
        success: false,
        message: 'Contest not found' 
      });
    }

    res.status(200).json({
      success: true,
      message: 'Contest deleted successfully',
    });
  } catch (error) {
    console.error('Delete contest error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error deleting contest' 
    });
  }
};

// Get All Contests (Admin)
export const getAllContests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, sortOrder = 'desc' } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { startTime: sortOrder === 'asc' ? 1 : -1 };

    const [contests, total] = await Promise.all([
      Contest.find(filter)
        .populate('createdBy', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Contest.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        contests,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get all contests error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching contests' 
    });
  }
};

// Get Contest Submissions (Admin)
export const getContestSubmissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [submissions, total] = await Promise.all([
      ContestSubmission.find({ contestId: id, status: 'submitted' })
        .populate('userId', 'firstName lastName email profilePicture')
        .sort({ totalScore: -1, submittedAt: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ContestSubmission.countDocuments({ contestId: id, status: 'submitted' }),
    ]);

    // Add rank
    const submissionsWithRank = submissions.map((sub, index) => ({
      ...sub.toObject(),
      rank: skip + index + 1,
    }));

    res.status(200).json({
      success: true,
      data: {
        submissions: submissionsWithRank,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get contest submissions error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching submissions' 
    });
  }
};

// ==================== USER FUNCTIONS ====================

// Get Active Contests
export const getActiveContests = async (req, res) => {
  try {
    const now = new Date();

    const contests = await Contest.find({
      $or: [
        { status: 'active' },
        { status: 'upcoming', startTime: { $lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) } }
      ]
    }).sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      data: { contests },
    });
  } catch (error) {
    console.error('Get active contests error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching contests' 
    });
  }
};

// Get Contest by ID
export const getContestById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ 
        success: false,
        message: 'Contest not found' 
      });
    }

    // Check if user has submission
    const submission = await ContestSubmission.findOne({
      userId,
      contestId: id,
    });

    // Return contest without correct answers for MCQs
    const contestData = contest.toObject();
    contestData.questions = contestData.questions.map(q => {
      const question = {
        type: q.type,
        question: q.question,
        points: q.points,
        order: q.order,
      };

      if (q.type === 'mcq') {
        question.options = q.options;
      } else {
        question.taskDescription = q.taskDescription;
        question.taskType = q.taskType;
      }

      return question;
    });

    res.status(200).json({
      success: true,
      data: { 
        contest: contestData,
        hasSubmission: !!submission,
        submission: submission || null,
      },
    });
  } catch (error) {
    console.error('Get contest by ID error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching contest' 
    });
  }
};

// Start Contest
export const startContest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ 
        success: false,
        message: 'Contest not found' 
      });
    }

    // Check if contest is active
    if (contest.status !== 'active') {
      return res.status(400).json({ 
        success: false,
        message: 'Contest is not active' 
      });
    }

    // Check if already started
    let submission = await ContestSubmission.findOne({
      userId,
      contestId: id,
    });

    if (submission) {
      return res.status(200).json({
        success: true,
        message: 'Contest already started',
        data: { submission },
      });
    }

    // Create new submission
    submission = new ContestSubmission({
      userId,
      contestId: id,
      answers: [],
      status: 'in_progress',
    });

    await submission.save();

    // Update participant count
    contest.participantCount += 1;
    await contest.save();

    res.status(201).json({
      success: true,
      message: 'Contest started successfully',
      data: { submission },
    });
  } catch (error) {
    console.error('Start contest error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error starting contest' 
    });
  }
};

// Save Contest Progress
export const saveContestProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    let { answers } = req.body;

    // Handle case where answers might be sent as a string
    if (typeof answers === 'string') {
      try {
        answers = JSON.parse(answers);
      } catch (e) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid answers format' 
        });
      }
    }

    console.log('Save progress - Contest ID:', id);
    console.log('Save progress - User ID:', userId);
    console.log('Save progress - Answers count:', answers?.length);
    console.log('Save progress - Answers type:', typeof answers);

    // First check if any submission exists
    let submission = await ContestSubmission.findOne({
      userId,
      contestId: id,
    });

    if (!submission) {
      console.log('Save progress - No submission found');
      return res.status(404).json({ 
        success: false,
        message: 'Contest not started. Please start the contest first.' 
      });
    }

    console.log('Save progress - Submission found, status:', submission.status);

    // Check if already submitted
    if (submission.status === 'submitted') {
      return res.status(400).json({ 
        success: false,
        message: 'Contest already submitted. Cannot save progress.' 
      });
    }

    submission.answers = answers;
    submission.updatedAt = new Date();
    await submission.save();

    console.log('Save progress - Successfully saved');

    return res.status(200).json({
      success: true,
      message: 'Progress saved successfully',
      data: { submission },
    });
  } catch (error) {
    console.error('Save contest progress error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error saving progress',
      error: error.message 
    });
  }
};

// Submit Contest
export const submitContest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    let { answers } = req.body;

    // Handle case where answers might be sent as a string
    if (typeof answers === 'string') {
      try {
        answers = JSON.parse(answers);
      } catch (e) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid answers format' 
        });
      }
    }

    console.log('Submit contest - Contest ID:', id);
    console.log('Submit contest - User ID:', userId);
    console.log('Submit contest - Answers count:', answers?.length);
    console.log('Submit contest - Answers type:', typeof answers);

    // First check if any submission exists
    let submission = await ContestSubmission.findOne({
      userId,
      contestId: id,
    });

    if (!submission) {
      console.log('Submit contest - No submission found');
      return res.status(404).json({ 
        success: false,
        message: 'Contest not started. Please start the contest first.' 
      });
    }

    console.log('Submit contest - Submission found, status:', submission.status);

    // Check if already submitted
    if (submission.status === 'submitted') {
      return res.status(400).json({ 
        success: false,
        message: 'Contest already submitted.' 
      });
    }

    // Get contest
    const contest = await Contest.findById(id);
    if (!contest) {
      console.log('Submit contest - Contest not found');
      return res.status(404).json({ 
        success: false,
        message: 'Contest not found' 
      });
    }

    console.log('Submit contest - Contest found, questions:', contest.questions.length);

    // Check if contest is still active
    if (new Date() > contest.endTime) {
      return res.status(400).json({ 
        success: false,
        message: 'Contest has ended' 
      });
    }

    // Calculate score
    let totalScore = 0;
    const processedAnswers = answers.map((answer, index) => {
      const question = contest.questions[index];
      let pointsEarned = 0;

      if (question.type === 'mcq') {
        const isCorrect = answer.selectedAnswer === question.correctAnswer;
        if (isCorrect) {
          pointsEarned = question.points;
        }
        return {
          questionIndex: index,
          type: 'mcq',
          selectedAnswer: answer.selectedAnswer,
          isCorrect,
          pointsEarned,
        };
      } else {
        // Task type - admin will review later
        return {
          questionIndex: index,
          type: 'task',
          taskSubmission: answer.taskSubmission,
          taskSubmissionType: answer.taskSubmissionType,
          pointsEarned: 0, // Will be updated by admin
        };
      }
    });

    totalScore = processedAnswers.reduce((sum, a) => sum + a.pointsEarned, 0);

    console.log('Submit contest - Processed answers:', processedAnswers.length);
    console.log('Submit contest - Total score:', totalScore);

    submission.answers = processedAnswers;
    submission.totalScore = totalScore;
    submission.status = 'submitted';
    submission.submittedAt = new Date();
    await submission.save();

    console.log('Submit contest - Submission saved successfully');

    // Update user stats
    await updateUserStatsAfterContest(userId, totalScore);

    console.log('Submit contest - User stats updated');

    return res.status(200).json({
      success: true,
      message: 'Contest submitted successfully',
      data: { 
        submission,
        totalScore,
      },
    });
  } catch (error) {
    console.error('Submit contest error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      success: false,
      message: 'Error submitting contest',
      error: error.message 
    });
  }
};

// Get My Contest History
export const getMyContestHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [submissions, total] = await Promise.all([
      ContestSubmission.find({ userId, status: 'submitted' })
        .populate('contestId') // Populate full contest with questions
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ContestSubmission.countDocuments({ userId, status: 'submitted' }),
    ]);

    // Process submissions to include full question details
    const processedSubmissions = submissions.map(submission => {
      const submissionObj = submission.toObject();
      
      if (submissionObj.contestId && submissionObj.contestId.questions) {
        // Map answers to include question type and details
        submissionObj.answers = submissionObj.answers.map(answer => {
          const question = submissionObj.contestId.questions[answer.questionIndex];
          
          if (answer.type === 'mcq') {
            return {
              ...answer,
              questionId: question?._id,
              questionType: 'mcq',
              selectedOption: question?.options?.[answer.selectedAnswer]?._id,
              isCorrect: answer.isCorrect,
              pointsAwarded: answer.pointsEarned || 0,
            };
          } else {
            // Task type
            return {
              ...answer,
              questionId: question?._id,
              questionType: 'task',
              textAnswer: answer.taskSubmission,
              photoUrl: answer.taskSubmissionType === 'photo' ? answer.taskSubmission : null,
              pointsAwarded: answer.pointsEarned || 0,
            };
          }
        });
      }
      
      return submissionObj;
    });

    res.status(200).json({
      success: true,
      data: {
        submissions: processedSubmissions,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error('Get contest history error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching contest history' 
    });
  }
};

// Get Contest Statistics (Admin)
export const getContestStats = async (req, res) => {
  try {
    const { id } = req.params;

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ 
        success: false,
        message: 'Contest not found' 
      });
    }

    // Get all submissions for this contest
    const submissions = await ContestSubmission.find({ contestId: id, status: 'submitted' });

    // Calculate statistics for each question
    const questionStats = contest.questions.map((question, index) => {
      const questionAnswers = submissions
        .map(s => s.answers.find(a => a.questionIndex === index))
        .filter(a => a);

      const correctCount = questionAnswers.filter(a => a.isCorrect).length;

      return {
        questionIndex: index,
        attempts: questionAnswers.length,
        correct: correctCount,
        incorrect: questionAnswers.length - correctCount,
        accuracy: questionAnswers.length > 0 ? (correctCount / questionAnswers.length) * 100 : 0,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        questionStats,
        totalSubmissions: submissions.length,
        averageScore: submissions.length > 0 
          ? submissions.reduce((sum, s) => sum + s.totalScore, 0) / submissions.length 
          : 0,
      },
    });
  } catch (error) {
    console.error('Get contest stats error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching contest statistics' 
    });
  }
};

// Review Task Submission (Admin)
export const reviewTaskSubmission = async (req, res) => {
  try {
    const { id, submissionId } = req.params;
    const { questionIndex, points, comment } = req.body;

    const submission = await ContestSubmission.findOne({
      _id: submissionId,
      contestId: id,
    });

    if (!submission) {
      return res.status(404).json({ 
        success: false,
        message: 'Submission not found' 
      });
    }

    const contest = await Contest.findById(id);
    if (!contest) {
      return res.status(404).json({ 
        success: false,
        message: 'Contest not found' 
      });
    }

    // Find the answer for this question
    const answerIndex = submission.answers.findIndex(a => a.questionIndex === questionIndex);
    if (answerIndex === -1) {
      return res.status(404).json({ 
        success: false,
        message: 'Answer not found' 
      });
    }

    const question = contest.questions[questionIndex];
    const maxPoints = question.points;

    // Validate points
    if (points < 0 || points > maxPoints) {
      return res.status(400).json({ 
        success: false,
        message: `Points must be between 0 and ${maxPoints}` 
      });
    }

    // Update the answer
    const oldPoints = submission.answers[answerIndex].pointsEarned;
    submission.answers[answerIndex].pointsEarned = points;
    submission.answers[answerIndex].adminComment = comment;

    // Recalculate total score
    submission.totalScore = submission.totalScore - oldPoints + points;

    await submission.save();

    // Update user stats if points changed
    if (oldPoints !== points) {
      await updateUserStatsAfterContest(submission.userId, points - oldPoints);
    }

    res.status(200).json({
      success: true,
      message: 'Review submitted successfully',
      data: { submission },
    });
  } catch (error) {
    console.error('Review task submission error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error reviewing submission' 
    });
  }
};

// Helper function to update user stats
async function updateUserStatsAfterContest(userId, points) {
  try {
    let stats = await UserStats.findOne({ userId });

    if (!stats) {
      stats = new UserStats({ userId });
    }

    stats.totalPoints += points;
    stats.contestsParticipated += 1;
    stats.averageScore = stats.totalPoints / (stats.quizzesTaken + stats.contestsParticipated);
    stats.updatedAt = new Date();

    await stats.save();
  } catch (error) {
    console.error('Update user stats error:', error);
  }
}
