import mongoose from 'mongoose';
import User from '../models/User.js';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/loginsignup');
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Clean up existing null fields and synchronize indexes to avoid E11000 duplicate key error on googleId/githubId
        try {
            await User.updateMany({ googleId: null }, { $unset: { googleId: 1 } });
            await User.updateMany({ githubId: null }, { $unset: { githubId: 1 } });
            await User.syncIndexes();
            console.log('User model indexes synchronized.');
        } catch (idxErr) {
            console.error('Index sync notice:', idxErr.message);
        }
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
