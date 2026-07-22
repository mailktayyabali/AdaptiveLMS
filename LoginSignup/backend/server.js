import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from './db.js';
import User from './models/User.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
connectDB();

app.get('/', (req, res) => {
    res.send('Backend is working');
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkeyforjwttokenauthandlogin');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    }
};

// Role Authorization Middleware
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied. Unauthorized role.' });
        }
        next();
    };
};

// Register route
app.post('/register', async (req, res) => {
    try {
        const { username, password, email, name, role } = req.body;
        if (!username || !password || !email || !name) {
            return res.status(400).json({ success: false, message: 'Please provide name, username, email, and password.' });
        }
        
        if (username.length < 3) {
            return res.status(400).json({ success: false, message: 'Username must be at least 3 characters long.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
        }

        // Validate role if provided
        const userRole = role && ['user', 'manager', 'admin'].includes(role) ? role : 'user';

        // Check if user or email already exists
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            if (existingUser.username === username) {
                return res.status(400).json({ success: false, message: 'Username already exists.' });
            }
            return res.status(400).json({ success: false, message: 'Email already exists.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new MongoDB user
        const newUser = new User({
            name,
            username,
            email,
            password: hashedPassword,
            role: userRole
        });
        await newUser.save();

        res.status(201).json({ success: true, message: 'User registered successfully! Please login.' });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
});

// Login route
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body; // Can support username or email
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Please provide username/email and password.' });
        }

        // Find user by username or email
        const user = await User.findOne({
            $or: [
                { username: username },
                { email: username.toLowerCase() }
            ]
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid credentials.' });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials.' });
        }

        // Generate JWT with name, username, email, and role
        const payload = {
            username: user.username,
            email: user.email,
            name: user.name,
            role: user.role
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET || 'supersecretkeyforjwttokenauthandlogin', {
            expiresIn: '7d'
        });

        res.json({ success: true, message: 'Logged in successfully!', token, role: user.role });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

// Role-restricted verification endpoints for frontend
app.get('/api/admin-data', authenticateToken, authorizeRoles('admin'), (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to the Secure Admin Panel!',
        stats: {
            totalUsers: 142,
            activeSessions: 18,
            serverStatus: 'Optimal',
            lastBackup: new Date().toISOString()
        }
    });
});

app.get('/api/manager-data', authenticateToken, authorizeRoles('admin', 'manager'), (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to the Manager Dashboard!',
        tasks: [
            { id: 1, title: 'Review Q3 Performance Reports', status: 'Pending' },
            { id: 2, title: 'Approve Pending Time-off Requests', status: 'In Progress' },
            { id: 3, title: 'Sync with Admin on Resource Allocation', status: 'Completed' }
        ]
    });
});

app.get('/api/user-data', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to your Account Space!',
        announcements: [
            'System maintenance scheduled for this Sunday at 2 AM EST.',
            'New premium security features rolled out today.'
        ]
    });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
