import mongoose from 'mongoose';

const PermissionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role',
        default: null
    },
    canCreateTicket: {
        type: Boolean,
        default: false
    },
    canReadTicket: {
        type: Boolean,
        default: true
    },
    canUpdateTicket: {
        type: Boolean,
        default: false
    },
    canDeleteTicket: {
        type: Boolean,
        default: false
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Permission', PermissionSchema);
