import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '135726964521-piumqftcr3ik27spkvsi2jlcl2e4aos9.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Standard User Registration
export const register = async (req, res) => {
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

        const userRole = role && ['user', 'manager', 'admin'].includes(role) ? role : 'user';

        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            if (existingUser.username === username) {
                return res.status(400).json({ success: false, message: 'Username already exists.' });
            }
            return res.status(400).json({ success: false, message: 'Email already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

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
};

// Standard Password Login
export const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Please provide username/email and password.' });
        }

        const user = await User.findOne({
            $or: [
                { username: username },
                { email: username.toLowerCase() }
            ]
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials.' });
        }

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
};

// Google OAuth Login / Register
export const googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) {
            return res.status(400).json({ success: false, message: 'Google auth error. Please try again.' });
        }
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload) {
            return res.status(400).json({ success: false, message: 'Google login error.' });
        }

        const { sub: googleId, email, name } = payload;

        let user = await User.findOne({
            $or: [
                { email: email },
                { googleId: googleId }
            ]
        });

        if (!user) {
            const baseUsername = email.split('@')[0];
            let username = baseUsername;
            let counter = 1;
            while (await User.findOne({ username })) {
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
        } else if (!user.googleId) {
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
                username: user.username,
                role: user.role 
            }
        });

    } catch (error) {
        console.error('Google login error detail:', error);
        res.status(400).json({ success: false, message: error.message || 'Google login error' });
    }
};

// GitHub OAuth Login / Register
export const githubLogin = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ success: false, message: 'GitHub authorization code is required.' });
        }

        const client_id = process.env.GITHUB_CLIENT_ID || 'Ov23liGsnv6UI0jTYHVx';
        const client_secret = process.env.GITHUB_CLIENT_SECRET || '1977896adb7c0f360a233b3a8db8b4d2b9cf04a6';

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
};
