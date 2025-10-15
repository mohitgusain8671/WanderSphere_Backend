import 'dotenv/config';
import { createServer } from 'http';
import app from './app.js';
import connectToDB from '#config/database.js';
import SocketManager from './socket.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Connect to database
        await connectToDB();
        console.log('✅ Database connected successfully');

        // Create HTTP server
        const server = createServer(app);

        // Initialize Socket.IO
        const socketManager = new SocketManager(server);
        console.log('✅ Socket.IO initialized');

        // Start server
        server.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
            console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔌 Socket.IO ready for connections`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

