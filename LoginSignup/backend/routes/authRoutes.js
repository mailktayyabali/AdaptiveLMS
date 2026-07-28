import express from 'express';
import { register, login, googleLogin, githubLogin } from '../controllers/authController.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Public Authentication Routes
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/api/google-login', googleLogin);
router.post('/api/github-login', githubLogin);

export default router;
