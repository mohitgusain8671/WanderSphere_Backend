import 'dotenv/config';
import app from './app.js';
import connectToDB from '#config/database.js';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Connect to database
        await connectToDB();
        console.log('✅ Database connected successfully');

        // Start server
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
            console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

