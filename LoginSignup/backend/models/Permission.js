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

// Create partial indexes so null user/role fields don't collide
PermissionSchema.index(
    { user: 1 },
    { unique: true, partialFilterExpression: { user: { $type: 'objectId' } } }
);

PermissionSchema.index(
    { role: 1 },
    { unique: true, partialFilterExpression: { role: { $type: 'objectId' } } }
);

const Permission = mongoose.model('Permission', PermissionSchema);

// Safely drop legacy strict user_1 index if present in MongoDB
Permission.syncIndexes().catch(() => {});

export default Permission;
