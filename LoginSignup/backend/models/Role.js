import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    description: {
        type: String,
        default: ''
    },
    permissions: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permission',
        required: true
    },
    isSystem: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model('Role', RoleSchema);
