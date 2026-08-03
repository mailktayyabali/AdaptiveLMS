import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    type: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    relatedTicket: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ticket'
    },
    isRead: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);