import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from '#routes/auth.routes.js';
import postsRoutes from '#routes/posts.routes.js';
import friendsRoutes from '#routes/friends.routes.js';
import storiesRoutes from '#routes/stories.routes.js';
import notificationsRoutes from '#routes/notifications.routes.js';
import userRoutes from '#routes/user.routes.js';
import wanderlustRoutes from '#routes/wanderlust.routes.js';
import itineraryRoutes from '#routes/itinerary.routes.js';
import chatRoutes from '#routes/chat.routes.js';
import messageRoutes from '#routes/message.routes.js';
import adminRoutes from '#routes/admin.routes.js';
import queryRoutes from '#routes/query.routes.js';
import quizRoutes from '#routes/quiz.routes.js';
import contestRoutes from '#routes/contest.routes.js';
import leaderboardRoutes from '#routes/leaderboard.routes.js';
import localBuddyRoutes from '#routes/localBuddy.routes.js';

const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/stories', storiesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wanderlust', wanderlustRoutes);
app.use('/api/itinerary', itineraryRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/contest', contestRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/queries', queryRoutes);
app.use('/api/buddy', localBuddyRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});


// Global error handler
app.use((error, req, res, next) => {
    console.error('Global error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

export default app;