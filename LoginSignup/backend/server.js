import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

import path from 'path';

import connectDB from './config/db.js';
import { generalLimiter } from './middleware/rateLimiter.js';

import authRoutes from './routes/authRoutes.js';
import otpRoutes from './routes/otpRoutes.js';
import userRoutes from './routes/userRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';

dotenv.config();

// Connect Database
connectDB();

const app = express();

// Global Middlewares
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(generalLimiter);

// Serve Uploaded Files Statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Mount Modular Routes
app.use(authRoutes);
app.use(otpRoutes);
app.use(userRoutes);
app.use('/api/tickets', ticketRoutes);

// Health Check Route
app.get('/', (req, res) => {
    res.send('Backend is working');
});

// Start Server
const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
