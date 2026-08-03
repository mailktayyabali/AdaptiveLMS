import{server, Socket} from 'socket.io';
import jwt from jsonwebtoken;
import Notification from '../models/Notification';

let io;

export const initSocket = (httpServer) =>{
    io = new Server(httpServer, {
        cors: {
            origin: true,
            credentials: true
        }
    });
    io.use((socket, next)=>{
        const token = socket.handshake.auth?.split('')[1];
        if (!token) {
            return next(new Error('Authentication Error: No token provided'));
        }

        try {
            const secret = process.env.JWT_SECRET || 'supersecretkeyforjwttokenauthandlogin';
            next();
        } catch (err) {
            return next(new Error('Authentication error: expire token'));
        }
    });
    io.on('connection', (socket)=>{
        const userId = socket.user.id || socket.user._id;
        socket.join(userId.toString());
        socket.on('disconnect', ()=>{
            console.log('user disconnected: ${userId}')
        });
    });
    return io;
};
export const createAndSendNotification = async({recipientId, senderId, type, message, relatedTicket})=>{
    try{
    const notification = new Notification({
        recipient: recipientId,
        sender: senderId,
        type,
        message,
        relatedTicket
    });
    await notification.populate('sender', 'name email');
    if(io){
        io.to(recipientId.toString()).emit('notification', notification);
    }
    return notification;
    }catch(error){
        console.error("Error creating and sending notification:", error);
    }
}