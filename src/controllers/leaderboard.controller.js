import { QuizAttempt, ContestSubmission, UserStats } from '../models/userPerformance.model.js';
import User from '#models/users.model.js';

// Get Daily Leaderboard
export const getDailyLeaderboard = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's quiz attempts
    const attempts = await QuizAttempt.find({
      completedAt: { $gte: today, $lt: tomorrow }
    })
      .populate('userId', 'firstName lastName profilePicture')
      .sort({ totalScore: -1, totalTimeTaken: 1 })
      .limit(parseInt(limit));

    // Add rank
    const leaderboard = attempts.map((attempt, index) => ({
      rank: index + 1,
      user: attempt.userId,
      score: attempt.totalScore,
      correctAnswers: attempt.correctAnswers,
      totalTimeTaken: attempt.totalTimeTaken,
      averageTimePerQuestion: attempt.totalTimeTaken / attempt.answers.length,
      completedAt: attempt.completedAt,
    }));

    res.status(200).json({
      success: true,
      data: { leaderboard },
    });
  } catch (error) {
    console.error('Get daily leaderboard error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching daily leaderboard' 
    });
  }
};

// Get Overall Leaderboard
export const getOverallLeaderboard = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const stats = await UserStats.find()
      .populate('userId', 'firstName lastName profilePicture')
      .sort({ totalPoints: -1, averageScore: -1 })
      .limit(parseInt(limit));

    // Add rank and update if needed
    const leaderboard = await Promise.all(stats.map(async (stat, index) => {
      const rank = index + 1;
      
      // Update rank if changed
      if (stat.rank !== rank) {
        stat.rank = rank;
        await stat.save();
      }

      return {
        rank,
        user: stat.userId,
        totalPoints: stat.totalPoints,
        quizzesTaken: stat.quizzesTaken,
        contestsParticipated: stat.contestsParticipated,
        totalQuestionsAnswered: stat.totalQuestionsAnswered,
        correctAnswers: stat.correctAnswers,
        averageScore: stat.averageScore,
        averageTimePerQuestion: stat.averageTimePerQuestion,
      };
    }));

    res.status(200).json({
      success: true,
      data: { leaderboard },
    });
  } catch (error) {
    console.error('Get overall leaderboard error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching overall leaderboard' 
    });
  }
};

// Get Contest Leaderboard
export const getContestLeaderboard = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const submissions = await ContestSubmission.find({
      contestId: id,
      status: 'submitted'
    })
      .populate('userId', 'firstName lastName profilePicture')
      .sort({ totalScore: -1, submittedAt: 1 })
      .limit(parseInt(limit));

    // Add rank
    const leaderboard = submissions.map((submission, index) => ({
      rank: index + 1,
      user: submission.userId,
      score: submission.totalScore,
      submittedAt: submission.submittedAt,
    }));

    res.status(200).json({
      success: true,
      data: { leaderboard },
    });
  } catch (error) {
    console.error('Get contest leaderboard error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching contest leaderboard' 
    });
  }
};

// Get My Rank
export const getMyRank = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user stats
    const userStats = await UserStats.findOne({ userId })
      .populate('userId', 'firstName lastName profilePicture');

    if (!userStats) {
      return res.status(200).json({
        success: true,
        data: { 
          rank: null,
          stats: null,
        },
      });
    }

    // Get rank (count users with higher points)
    const rank = await UserStats.countDocuments({
      totalPoints: { $gt: userStats.totalPoints }
    }) + 1;

    // Update rank if changed
    if (userStats.rank !== rank) {
      userStats.rank = rank;
      await userStats.save();
    }

    // Get today's performance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttempt = await QuizAttempt.findOne({
      userId,
      completedAt: { $gte: today, $lt: tomorrow }
    });

    let dailyRank = null;
    if (todayAttempt) {
      dailyRank = await QuizAttempt.countDocuments({
        completedAt: { $gte: today, $lt: tomorrow },
        $or: [
          { totalScore: { $gt: todayAttempt.totalScore } },
          { 
            totalScore: todayAttempt.totalScore,
            totalTimeTaken: { $lt: todayAttempt.totalTimeTaken }
          }
        ]
      }) + 1;
    }

    res.status(200).json({
      success: true,
      data: { 
        overallRank: rank,
        dailyRank,
        stats: {
          totalPoints: userStats.totalPoints,
          quizzesTaken: userStats.quizzesTaken,
          contestsParticipated: userStats.contestsParticipated,
          totalQuestionsAnswered: userStats.totalQuestionsAnswered,
          correctAnswers: userStats.correctAnswers,
          averageScore: userStats.averageScore,
          averageTimePerQuestion: userStats.averageTimePerQuestion,
        },
        todayPerformance: todayAttempt ? {
          score: todayAttempt.totalScore,
          correctAnswers: todayAttempt.correctAnswers,
          timeTaken: todayAttempt.totalTimeTaken,
        } : null,
      },
    });
  } catch (error) {
    console.error('Get my rank error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching rank' 
    });
  }
};
