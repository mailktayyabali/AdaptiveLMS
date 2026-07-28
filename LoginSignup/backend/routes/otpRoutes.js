import express from 'express';
import { sendOtp, verifyOtpLogin, resetPasswordOtp } from '../controllers/otpController.js';

const router = express.Router();

// OTP Routes
router.post('/api/send-otp', sendOtp);
router.post('/api/verify-otp-login', verifyOtpLogin);
router.post('/api/reset-password-otp', resetPasswordOtp);

export default router;
