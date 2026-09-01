import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import path from 'path';

import connectDB from './config/db.js';
import { generalLimiter } from './middleware/rateLimiter.js';

import authRoutes from './routes/authRoutes.js';
import otpRoutes from './routes/otpRoutes.js';
import userRoutes from './routes/userRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import permissionRoutes from './routes/permissionRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import videoRoutes from './routes/videoRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import liveSessionRoutes from './routes/liveSessionRoutes.js';

import { initSocket } from './utils/socket.js';

dotenv.config();

// Connect Database
connectDB();

const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
initSocket(httpServer);

// Configure Helmet Security Headers with Video Stream & Byte Range CORS support
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
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
app.use('/api/notifications', notificationRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api', uploadRoutes);
app.use('/api', videoRoutes);
app.use('/api', quizRoutes);
app.use('/api/live-sessions', liveSessionRoutes);

// Health Check Route
app.get('/', (req, res) => {
    res.send('Backend is working');
});

// Start Server using httpServer
const port = process.env.PORT || 5000;
httpServer.listen(port, () => {
    console.log(`Server is running on port ${port} [S3 Bucket: ${process.env.AWS_S3_BUCKET_NAME}]`);
});
