import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { sendOTPEmail } from '../utils/sendOTPEmail.js';

// Send OTP to email
export const sendOtp = async (req, res) => {
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
};

// Verify OTP and Login
export const verifyOtpLogin = async (req, res) => {
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
};

// Reset Password using OTP
export const resetPasswordOtp = async (req, res) => {
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
};
