import express from 'express';
import multer from 'multer';
import {
  initiateUpload,
  uploadChunk,
  getUploadStatus,
  completeUpload,
  streamVideo,
  saveProgress,
  getStudentProgress,
  createCourse,
  getCourses,
  getCourseById,
  getInstructors,
  assignInstructor,
  addLessonToCourse
} from '../controllers/videoController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // Max 20MB per chunk
});

// Instructor List Route (Admin & Manager)
router.get('/instructors', authenticateToken, getInstructors);

// Course Routes
router.get('/courses', getCourses);
router.get('/courses/:id', getCourseById);
router.post('/courses', authenticateToken, authorizeRoles('manager', 'admin'), createCourse);
router.put('/courses/:id/assign-instructor', authenticateToken, authorizeRoles('admin'), assignInstructor);
router.post('/courses/:id/add-lesson', authenticateToken, authorizeRoles('manager', 'admin'), addLessonToCourse);

// Resumable Video Upload Routes (Instructors & Admins)
router.post('/videos/initiate-upload', authenticateToken, authorizeRoles('manager', 'admin'), initiateUpload);
router.post('/videos/upload-chunk', authenticateToken, authorizeRoles('manager', 'admin'), chunkUpload.single('chunk'), uploadChunk);
router.get('/videos/upload-status/:uploadId', authenticateToken, authorizeRoles('manager', 'admin'), getUploadStatus);
router.post('/videos/complete-upload', authenticateToken, authorizeRoles('manager', 'admin'), completeUpload);

// HTTP 206 Range Request Streaming Route
router.get('/videos/:id/stream', streamVideo);

// Student Playback Progress Routes
router.post('/videos/progress', authenticateToken, saveProgress);
router.get('/videos/progress/:courseId', authenticateToken, getStudentProgress);

export default router;
