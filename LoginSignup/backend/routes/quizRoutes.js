import express from 'express';
import {
  createQuiz,
  getQuizzesByCourse,
  getQuizById,
  runCodeSandbox,
  submitQuiz,
  getStudentMastery,
  getPlagiarismReport
} from '../controllers/quizController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Quiz Creation & Management (Instructors & Admins)
router.post('/quizzes', authenticateToken, authorizeRoles('manager', 'admin'), createQuiz);
router.get('/quizzes/course/:courseId', getQuizzesByCourse);
router.get('/quizzes/:id', getQuizById);

// Student Code Sandbox Execution & Submission
router.post('/quizzes/sandbox', authenticateToken, runCodeSandbox);
router.post('/quizzes/submit', authenticateToken, submitQuiz);
router.get('/quizzes/mastery/student', authenticateToken, getStudentMastery);

// Instructor / Admin Plagiarism Audit Report
router.get('/quizzes/:quizId/plagiarism-report', authenticateToken, authorizeRoles('manager', 'admin'), getPlagiarismReport);

export default router;
