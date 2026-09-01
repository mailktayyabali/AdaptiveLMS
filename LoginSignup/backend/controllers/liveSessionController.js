import mongoose from 'mongoose';
import LiveSession from '../models/LiveSession.js';
import LiveAttendance from '../models/LiveAttendance.js';
import Course from '../models/Course.js';
import StudentProgress from '../models/StudentProgress.js';
import { getIO } from '../utils/socket.js';
import { clearActiveStreamHost } from '../utils/liveClassSocket.js';

/**
 * Instructor / Admin: Create or schedule a new Live Session & attach to Course
 */
export const createLiveSession = async (req, res) => {
  try {
    const { title, description, courseId, scheduledStartTime, moduleIndex = 0 } = req.body;
    const instructorId = req.user.id || req.user._id;

    if (!title || !courseId) {
      return res.status(400).json({ success: false, message: 'Title and courseId are required' });
    }

    const liveSession = new LiveSession({
      title,
      description: description || '',
      courseId,
      instructorId,
      scheduledStartTime: scheduledStartTime ? new Date(scheduledStartTime) : new Date(),
      status: 'scheduled'
    });

    await liveSession.save();

    // Attach lesson entry of type 'live' to the Course
    const course = await Course.findById(courseId);
    if (course) {
      if (!course.modules || course.modules.length === 0) {
        course.modules = [{ title: 'Module 1: Core Lessons & Live Classes', order: 0, lessons: [] }];
      }
      const targetModIndex = Math.min(moduleIndex, course.modules.length - 1);
      const mod = course.modules[targetModIndex];

      mod.lessons.push({
        title: `Live Class: ${title}`,
        type: 'live',
        liveSessionId: liveSession._id,
        order: mod.lessons.length
      });

      await course.save();
    }

    return res.status(201).json({
      success: true,
      message: 'Live session created and attached to course module',
      liveSession
    });
  } catch (error) {
    console.error('Create live session error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create live session', error: error.message });
  }
};

/**
 * Fetch all Live Sessions for a Course
 */
export const getLiveSessionsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const sessions = await LiveSession.find({ courseId })
      .populate('instructorId', 'name email username')
      .sort({ scheduledStartTime: -1 });

    return res.status(200).json({ success: true, sessions });
  } catch (error) {
    console.error('Fetch live sessions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch live sessions', error: error.message });
  }
};

/**
 * Fetch a single Live Session by ID (with auto-healing fallback if lesson ID was passed)
 */
export const getLiveSessionById = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id || req.user._id;

    if (!mongoose.Types.ObjectId.isValid(sessionId)) {
      return res.status(400).json({ success: false, message: 'Invalid session ID format' });
    }

    let session = await LiveSession.findById(sessionId)
      .populate('instructorId', 'name email username');

    // Auto-healing fallback: If not found by direct _id, search if a Course lesson has this ID as lesson._id
    if (!session) {
      const course = await Course.findOne({ 'modules.lessons._id': sessionId });
      if (course) {
        let matchingLesson = null;
        for (const mod of course.modules) {
          const found = mod.lessons.id(sessionId);
          if (found) {
            matchingLesson = found;
            break;
          }
        }

        if (matchingLesson) {
          if (matchingLesson.liveSessionId) {
            session = await LiveSession.findById(matchingLesson.liveSessionId)
              .populate('instructorId', 'name email username');
          }

          if (!session) {
            const instructorId = course.instructor || (course.instructors && course.instructors[0]) || userId;
            session = new LiveSession({
              _id: sessionId,
              title: matchingLesson.title || 'Live Class Masterclass',
              description: 'Live interactive stream session',
              courseId: course._id,
              instructorId,
              scheduledStartTime: new Date(),
              status: 'scheduled'
            });

            await session.save();

            matchingLesson.liveSessionId = session._id;
            await course.save();
          }
        }
      }
    }

    // Final fallback: If still not found, create a generic LiveSession record for this ID to prevent 404s
    if (!session) {
      session = new LiveSession({
        _id: sessionId,
        title: 'Interactive Live Class',
        description: 'Real-time live learning session',
        courseId: new mongoose.Types.ObjectId(),
        instructorId: userId,
        scheduledStartTime: new Date(),
        status: 'scheduled'
      });
      await session.save().catch(() => {});
    }

    return res.status(200).json({ success: true, session });
  } catch (error) {
    console.error('Fetch live session by id error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch live session', error: error.message });
  }
};

/**
 * Instructor: Update Live Session Status (scheduled -> live -> ended)
 */
export const updateLiveSessionStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { status } = req.body;

    if (!['scheduled', 'live', 'ended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status transition' });
    }

    const session = await LiveSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Live session not found' });
    }

    session.status = status;
    if (status === 'live' && !session.actualStartTime) {
      session.actualStartTime = new Date();
    } else if (status === 'ended') {
      session.actualEndTime = new Date();
      clearActiveStreamHost(sessionId);
    }

    await session.save();

    // Broadcast live session status update via Socket.io
    const io = getIO();
    if (io) {
      io.to(`live_session_${sessionId}`).emit('live_session_status_changed', {
        sessionId,
        status
      });
    }

    // When session is ended, mark lesson as completed in StudentProgress for all participants & instructor
    if (status === 'ended') {
      try {
        const course = await Course.findById(session.courseId);
        let targetLessonId = sessionId;

        if (course) {
          for (const mod of course.modules) {
            const found = mod.lessons.find(l => String(l.liveSessionId) === String(sessionId) || String(l._id) === String(sessionId));
            if (found) {
              targetLessonId = found._id;
              break;
            }
          }

          const attendances = await LiveAttendance.find({ sessionId });
          const userIdsToUpdate = new Set([
            ...attendances.map(a => String(a.userId)),
            String(req.user.id || req.user._id)
          ]);

          for (const uid of userIdsToUpdate) {
            let prog = await StudentProgress.findOne({
              $or: [
                { userId: uid, courseId: session.courseId },
                { user: uid, course: session.courseId }
              ]
            });

            if (!prog) {
              prog = new StudentProgress({
                userId: uid,
                courseId: session.courseId,
                user: uid,
                course: session.courseId,
                completedLessons: [targetLessonId]
              });
            } else {
              const lessonIdStr = String(targetLessonId);
              if (!prog.completedLessons.some(id => String(id) === lessonIdStr)) {
                prog.completedLessons.push(targetLessonId);
              }
            }

            let totalLessons = 0;
            course.modules.forEach(mod => {
              totalLessons += mod.lessons.length;
            });

            if (totalLessons > 0) {
              prog.overallCourseProgress = Math.min(
                100,
                Math.round((prog.completedLessons.length / totalLessons) * 100)
              );
            }

            prog.updatedAt = Date.now();
            await prog.save();
          }
        }
      } catch (progErr) {
        console.error('Error updating StudentProgress for ended live session:', progErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Live session status updated to ${status}`,
      session
    });
  } catch (error) {
    console.error('Update live session status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update session status', error: error.message });
  }
};

/**
 * Instructor / Admin: Fetch Live Class Attendance Report
 */
export const getLiveSessionAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const attendances = await LiveAttendance.find({ sessionId })
      .populate('userId', 'name email username role')
      .sort({ totalActiveDurationSec: -1 });

    return res.status(200).json({ success: true, attendances });
  } catch (error) {
    console.error('Fetch live session attendance error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch attendance report', error: error.message });
  }
};
