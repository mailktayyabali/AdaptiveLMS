import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { OAuth2Client } from 'google-auth-library';
import connectDB from './db.js';
import User from './models/User.js';

dotenv.config();
connectDB();

const app = express();

app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(cors());
app.use(express.json());

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    }
});
app.use(generalLimiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many login/register attempts, please try again later.'
    }
});
app.use(['/login', '/register'], authLimiter);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '135726964521-piumqftcr3ik27spkvsi2jlcl2e4aos9.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
app.post('/api/google-login', async (req, res) => {
    try {

        const {idToken} = req.body;
        if(!idToken){
            return res.status(400).json({success: false, message: 'Google auth error. please try again'});
        }
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if(!payload) {
            return res.status(400).json({success: false, message: 'google login error'});
        }

        const {sub: googleId, email, name} = payload;

        let user = await User.findOne({
            $or: [
                {email: email},
                {googleId: googleId}
            ]
        });

        if (!user) {
            const baseUsername = email.split('@')[0];
            let username = baseUsername;
            let counter = 1;
            while (await User.findOne({username})) {
                username = `${baseUsername}${counter}`;
                counter++;
            }
            user = new User({
                name: name || 'Google User',
                username,
                email,
                googleId,
                authProvider: 'google',
            });
            await user.save();
        }else if(!user.googleId){
            // user exist but with email and google not linked yet
            user.googleId = googleId;
            user.authProvider = 'google';
            await user.save();
        }

        const token = jwt.sign(
            {
                id: user._id,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET || 'supersecretkeyforjwttokenauthandlogin',
            {
                expiresIn: '7d'
            }
        );
        res.json({ 
            success: true, 
            token, 
            user: { 
                id: user._id,
                name: user.name, 
                email: user.email, 
                username: user.username ,
                role: user.role 
            }
        });

    } catch (error) {
        console.error('Google login error detail:', error);
        res.status(400).json({ success: false, message: error.message || 'google login error'});
    }
});

// GitHub OAuth Login / Register Route
app.post('/api/github-login', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ success: false, message: 'GitHub authorization code is required.' });
        }

        const client_id = process.env.GITHUB_CLIENT_ID || 'Ov23liGsnv6UI0jTYHVx';
        const client_secret = process.env.GITHUB_CLIENT_SECRET || '1977896adb7c0f360a233b3a8db8b4d2b9cf04a6';

        // Exchange code for access_token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ client_id, client_secret, code })
        });

        const tokenData = await tokenResponse.json();
        if (!tokenData.access_token) {
            return res.status(400).json({ success: false, message: tokenData.error_description || 'Failed to obtain GitHub access token.' });
        }

        const accessToken = tokenData.access_token;

        // Fetch user profile from GitHub
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'LoginSignupApp'
            }
        });
        const githubUser = await userResponse.json();

        if (!githubUser || !githubUser.id) {
            console.error('GitHub user fetch error:', githubUser);
            return res.status(400).json({ success: false, message: githubUser?.message || 'Failed to fetch user profile from GitHub.' });
        }

        let email = githubUser.email;
        if (!email) {
            const emailResponse = await fetch('https://api.github.com/user/emails', {
                headers: {
                    'Authorization': `token ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'LoginSignupApp'
                }
            });
            const emails = await emailResponse.json();
            if (Array.isArray(emails)) {
                const primaryEmail = emails.find(e => e.primary && e.verified) || emails[0];
                if (primaryEmail) email = primaryEmail.email;
            }
        }

        if (!email) {
            email = `${githubUser.login}@users.noreply.github.com`;
        }

        const githubId = String(githubUser.id);
        const name = githubUser.name || githubUser.login || 'GitHub User';

        let user = await User.findOne({ $or: [{ githubId }, { email }] });

        if (!user) {
            const baseUsername = githubUser.login || email.split('@')[0];
            let username = baseUsername;
            let counter = 1;
            while (await User.findOne({ username })) {
                username = `${baseUsername}${counter}`;
                counter++;
            }
            user = new User({
                name,
                username,
                email,
                githubId,
                authProvider: 'github',
            });
            await user.save();
        } else if (!user.githubId) {
            user.githubId = githubId;
            user.authProvider = 'github';
            await user.save();
        }

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'supersecretkeyforjwttokenauthandlogin',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'GitHub login successful!',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('GitHub login error detail:', error);
        res.status(400).json({ success: false, message: error.message || 'GitHub login error' });
    }
});

app.get('/', (req, res) => {
    res.send('Backend is working');
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    console.log("check authentication");
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

// Role restricted verification endpoints for frontend
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

//get all users
app.get ('/api/users',authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try{
        const users = await User.find().select('-password');
        res.json({success: true, users});

    }catch (error){
        res.status(500).json({sucess: false, message: 'Server did not respond.'});
    }
});

//role assign api
app.put('/api/users/:id/role', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    console.log('role update');
    try {
        const { role } = req.body;

        if (!['user', 'manager', 'admin'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role specified' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: 'User role updated successfully', user });
    } catch (error) {
        console.error('Role update error:', error);
        res.status(500).json({ success: false, message: 'Server did not respond.' });
    }
});

// Nodemailer Helper for OTP Email Sending
const sendOTPEmail = async (toEmail, otp) => {
    const emailUser = process.env.EMAIL_USER?.trim();
    const emailPass = process.env.EMAIL_PASS?.trim();

    console.log('\n========================================');
    console.log(`[OTP SYSTEM] Sending OTP for ${toEmail}: ${otp}`);
    console.log(`[OTP SYSTEM] Using Email: ${emailUser}`);
    console.log('========================================\n');

    // If default / placeholder credentials are set, log to console instead of attempting real SMTP error
    if (!emailUser || emailUser === 'your-email@gmail.com' || !emailPass || emailPass === 'your-app-password') {
        console.log('[Nodemailer WARNING] Using console log mode for OTP because default email credentials were found in .env');
        return { success: true, simulated: true };
    }

    try {
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true, // TLS 465
            auth: {
                user: emailUser,
                pass: emailPass
            },
            tls: {
                rejectUnauthorized: false // Prevents local SSL cert blocking issues
            }
        });

        const mailOptions = {
            from: `"Auth Security" <${emailUser}>`,
            to: toEmail,
            subject: 'Your Verification Code (OTP)',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                    <h2 style="color: #4f46e5; text-align: center; margin-bottom: 8px;">Verification Code</h2>
                    <p style="color: #4b5563; font-size: 15px;">Hello,</p>
                    <p style="color: #4b5563; font-size: 15px;">Use the following One-Time Password (OTP) code to verify your account or reset your password:</p>
                    <div style="background-color: #f3f4f6; padding: 18px; text-align: center; border-radius: 8px; margin: 24px 0;">
                        <span style="font-size: 34px; font-weight: 800; letter-spacing: 6px; color: #1e1b4b;">${otp}</span>
                    </div>
                    <p style="color: #6b7280; font-size: 13px;">This OTP will expire in <strong>10 minutes</strong>. If you did not request this code, please ignore this email.</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[Nodemailer SUCCESS] Email sent successfully! MessageId: ${info.messageId}`);
        return { success: true };
    } catch (err) {
        console.error('[Nodemailer ERROR] Failed to send email via SMTP:');
        console.error(err);
        return { success: false, error: err.message };
    }
};

//Send OTP to email
app.post('/api/send-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Please provide an email address.' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(404).json({ success: false, message: 'No account found with this email.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        user.otpCode = otp;
        user.otpExpire = otpExpire;
        await user.save();

        const emailResult = await sendOTPEmail(user.email, otp);
        if (emailResult && emailResult.success === false) {
            return res.status(500).json({ success: false, message: `Email Delivery Failed: ${emailResult.error}` });
        }

        res.json({ success: true, message: 'OTP sent to your email successfully!' });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ success: false, message: 'Server error while sending OTP.' });
    }
});

// Route: Verify OTP and Login
app.post('/api/verify-otp-login', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: 'Please provide email and OTP.' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (!user.otpCode || user.otpCode !== otp.toString().trim()) {
            return res.status(400).json({ success: false, message: 'Invalid OTP code.' });
        }

        if (new Date() > new Date(user.otpExpire)) {
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
        }

        // Clear OTP after successful use
        user.otpCode = null;
        user.otpExpire = null;
        await user.save();

        const payload = {
            username: user.username,
            email: user.email,
            name: user.name,
            role: user.role
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET || 'supersecretkeyforjwttokenauthandlogin', {
            expiresIn: '7d'
        });

        res.json({ success: true, message: 'Logged in with OTP successfully!', token, role: user.role });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ success: false, message: 'Server error verifying OTP.' });
    }
});

// Route: Reset Password using OTP
app.post('/api/reset-password-otp', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ success: false, message: 'Please fill in all required fields.' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (!user.otpCode || user.otpCode !== otp.toString().trim()) {
            return res.status(400).json({ success: false, message: 'Invalid OTP code.' });
        }

        if (new Date() > new Date(user.otpExpire)) {
            return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.otpCode = null;
        user.otpExpire = null;
        await user.save();

        res.json({ success: true, message: 'Password reset successfully! You can now sign in with your new password.' });
    } catch (error) {
        console.error('Reset Password OTP error:', error);
        res.status(500).json({ success: false, message: 'Server error resetting password.' });
    }
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
