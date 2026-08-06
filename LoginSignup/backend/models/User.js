import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true
    },
    username: {
        type: String,
        required: [true, 'Please provide a username'],
        unique: true,
        trim: true,
        minlength: [3, 'Username must be at least 3 characters long']
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: function(){
            return !this.googleId && !this.githubId;
        },
        minlength: [6, 'Password must be at least 6 characters long']
    },
    googleId: {
        type: String
    },
    githubId: {
        type: String
    },
    authProvider: {
        type: String,
        enum: ['local', 'google', 'github'],
        default: 'local'
    },
    role: {
        type: String,
        default: 'user',
        trim: true,
        lowercase: true
    },
    otpCode: {
        type: String,
        default: null
    },
    otpExpire: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

UserSchema.index(
    { googleId: 1 },
    { unique: true, partialFilterExpression: { googleId: { $type: 'string' } } }
);

UserSchema.index(
    { githubId: 1 },
    { unique: true, partialFilterExpression: { githubId: { $type: 'string' } } }
);

export default mongoose.model('User', UserSchema);
