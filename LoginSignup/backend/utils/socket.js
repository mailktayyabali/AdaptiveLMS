import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import Notification from '../models/Notification.js';
import { setupDocumentSocketHandlers } from './documentSocket.js';

let io;

export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: true,
            credentials: true
        }
    });

    // Middleware to authenticate JWT token from Socket Handshake
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || 
                      (socket.handshake.headers?.authorization && socket.handshake.headers.authorization.split(' ')[1]);

        if (!token) {
            return next(new Error('Authentication Error: No token provided'));
        }

        try {
            const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || 'supersecretkeyforjwttokenauthandlogin';
            const decoded = jwt.verify(token, secret);
            socket.user = decoded;
            next();
        } catch (err) {
            return next(new Error('Authentication Error: Invalid or expired token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.user.id || socket.user._id;
        console.log(` User connected to Socket: ${userId} (Socket ID: ${socket.id})`);

        // User joins private room keyed by their user ID
        socket.join(userId.toString());

        // Attach Yjs CRDT Document socket handlers
        setupDocumentSocketHandlers(io, socket);

        socket.on('disconnect', () => {
            console.log(`User disconnected from Socket: ${userId}`);
        });
    });

    return io;
};

// Function to save notification to MongoDB & emit real-time event
export const createAndSendNotification = async ({ recipientId, senderId, type, message, relatedTicket }) => {
    try {
        const notification = new Notification({
            recipient: recipientId,
            sender: senderId,
            type,
            message,
            relatedTicket
        });

        await notification.save();
        await notification.populate('sender', 'username name email');

        if (io) {
            io.to(recipientId.toString()).emit('notification', notification);
        }

        return notification;
    } catch (error) {
        console.error('Error creating and sending notification:', error);
    }
};

export const getIO = () => io;
