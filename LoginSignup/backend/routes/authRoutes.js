import express from 'express';
import { register, login, googleLogin, githubLogin, refreshToken, logout } from '../controllers/authController.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public Authentication Routes
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/api/google-login', googleLogin);
router.post('/api/github-login', githubLogin);
router.post('/api/refresh-token', refreshToken);
router.post('/refresh-token', refreshToken);
router.post('/api/logout', logout);
router.post('/logout', logout);

export default router;
