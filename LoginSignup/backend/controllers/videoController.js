import crypto from 'crypto';
import Video from '../models/Video.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import StudentProgress from '../models/StudentProgress.js';
import { uploadChunkToS3, mergeS3Chunks, streamS3Object, getS3ObjectMetadata, getPresignedDownloadUrl } from '../config/s3.js';

export const getInstructors = async (req, res) => {
  try {
    // Fetch users who are instructors (manager or admin or all users)
    const instructors = await User.find({
      role: { $in: ['manager', 'admin', 'user'] }
    }).select('_id name email username role').sort({ name: 1 });

    return res.status(200).json({ success: true, instructors });
  } catch (error) {
    console.error('Get instructors error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch instructors', error: error.message });
  }
};

export const initiateUpload = async (req, res) => {
  try {
    const { title, description, fileName, totalChunks, fileSize, courseId, moduleIndex } = req.body;

    if (!fileName || !totalChunks) {
      return res.status(400).json({ success: false, message: 'File name and total chunks are required' });
    }

    const uploadId = `vid_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const cleanFileName = fileName.replace(/\s+/g, '_');
    const fileKey = `Tayyab/lms-videos/${Date.now()}_${cleanFileName}`;

    const newVideo = new Video({
      title: title || fileName,
      description: description || '',
      originalFileName: fileName,
      fileKey,
      uploadId,
      status: 'uploading',
      totalChunks: parseInt(totalChunks, 10),
      uploadedChunks: [],
      chunkFolder: `Tayyab/lms-videos/chunks/${uploadId}`,
      fileSize: parseInt(fileSize || 0, 10),
      uploadedBy: req.user.id
    });

    await newVideo.save();

    return res.status(201).json({
      success: true,
      message: 'Chunked video upload initiated',
      uploadId,
      totalChunks: newVideo.totalChunks,
      uploadedChunks: [],
      courseId,
      moduleIndex
    });
  } catch (error) {
    console.error('Initiate upload error:', error);
    return res.status(500).json({ success: false, message: 'Failed to initiate upload', error: error.message });
  }
};

export const uploadChunk = async (req, res) => {
  try {
    const { uploadId, chunkIndex } = req.body;

    if (!uploadId || chunkIndex === undefined || !req.file) {
      return res.status(400).json({ success: false, message: 'uploadId, chunkIndex, and chunk file are required' });
    }

    const video = await Video.findOne({ uploadId });
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video upload session not found' });
    }

    const index = parseInt(chunkIndex, 10);

    // Upload chunk buffer to AWS S3 under Tayyab/lms-videos/chunks
    await uploadChunkToS3(req.file.buffer, uploadId, index, 'Tayyab/lms-videos/chunks');

    // Add chunk index to uploadedChunks array atomically
    if (!video.uploadedChunks.includes(index)) {
      video.uploadedChunks.push(index);
      await video.save();
    }

    return res.status(200).json({
      success: true,
      message: `Chunk ${index} uploaded to S3 successfully`,
      uploadId,
      chunkIndex: index,
      uploadedChunks: video.uploadedChunks
    });
  } catch (error) {
    console.error('Upload chunk error:', error);
    return res.status(500).json({ success: false, message: 'Failed to upload chunk to S3', error: error.message });
  }
};

export const getUploadStatus = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const video = await Video.findOne({ uploadId });

    if (!video) {
      return res.status(404).json({ success: false, message: 'Upload session not found' });
    }

    return res.status(200).json({
      success: true,
      uploadId,
      status: video.status,
      totalChunks: video.totalChunks,
      uploadedChunks: video.uploadedChunks,
      fileKey: video.fileKey
    });
  } catch (error) {
    console.error('Get upload status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch upload status', error: error.message });
  }
};

export const completeUpload = async (req, res) => {
  try {
    const { uploadId, courseId, moduleIndex, lessonTitle } = req.body;
    const video = await Video.findOne({ uploadId });

    if (!video) {
      return res.status(404).json({ success: false, message: 'Upload session not found' });
    }

    if (video.uploadedChunks.length < video.totalChunks) {
      return res.status(400).json({
        success: false,
        message: `Upload incomplete. Missing chunks. (${video.uploadedChunks.length}/${video.totalChunks} uploaded)`
      });
    }

    video.status = 'processing';
    await video.save();

    // Merge chunks in S3 and upload final object to Tayyab/lms-videos
    const mergedResult = await mergeS3Chunks(
      uploadId,
      video.totalChunks,
      video.originalFileName,
      'Tayyab/lms-videos'
    );

    video.status = 'ready';
    video.fileKey = mergedResult.fileKey;
    video.s3Url = mergedResult.s3Url;
    video.fileSize = mergedResult.fileSize;
    await video.save();

    // If courseId is provided, attach lesson directly to selected course module
    if (courseId) {
      const course = await Course.findById(courseId);
      if (course) {
        if (!course.modules || course.modules.length === 0) {
          course.modules = [{ title: 'Module 1: Main Lessons', order: 0, lessons: [] }];
        }

        const targetModIndex = parseInt(moduleIndex || 0, 10);
        const mod = course.modules[targetModIndex] || course.modules[0];

        mod.lessons.push({
          title: lessonTitle || video.title,
          type: 'video',
          videoId: video._id,
          topicTag: 'general',
          difficulty: 'medium',
          order: mod.lessons.length
        });

        await course.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Video upload completed and attached to course',
      video
    });
  } catch (error) {
    console.error('Complete upload error:', error);
    if (req.body.uploadId) {
      await Video.updateOne({ uploadId: req.body.uploadId }, { status: 'failed' });
    }
    return res.status(500).json({ success: false, message: 'Failed to complete video upload', error: error.message });
  }
};

export const streamVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);

    if (!video || !video.fileKey) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }

    if (req.query.json === 'true' || req.headers.accept?.includes('application/json')) {
      const signedUrl = await getPresignedDownloadUrl(video.fileKey, 86400);
      return res.json({ success: true, streamUrl: signedUrl });
    }

    if (req.query.redirect === 'true') {
      const signedUrl = await getPresignedDownloadUrl(video.fileKey, 86400);
      return res.redirect(302, signedUrl);
    }

    // Direct HTTP 206 Range streaming using stored video.fileSize from DB (zero HeadObject latency)
    const range = req.headers.range;
    const fileSize = video.fileSize || 50 * 1024 * 1024; // Default fallback size if unspecified

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;

      const s3Stream = await streamS3Object(video.fileKey, `bytes=${start}-${end}`);

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': video.mimeType || 'video/mp4',
        'Cache-Control': 'public, max-age=86400'
      });

      s3Stream.Body.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': video.mimeType || 'video/mp4',
        'Cache-Control': 'public, max-age=86400'
      });
      const s3Stream = await streamS3Object(video.fileKey);
      s3Stream.Body.pipe(res);
    }
  } catch (error) {
    console.error('Stream video error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Failed to stream video', error: error.message });
    }
  }
};

export const saveProgress = async (req, res) => {
  try {
    const { courseId, lastWatchedVideoId, lastWatchedTimeSec, lessonId } = req.body;
    const userId = req.user.id;

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Course ID is required' });
    }

    let progress = await StudentProgress.findOne({ userId, courseId });

    if (!progress) {
      progress = new StudentProgress({
        userId,
        courseId,
        lastWatchedVideoId: lastWatchedVideoId || null,
        lastWatchedTimeSec: lastWatchedTimeSec || 0,
        completedLessons: lessonId ? [lessonId] : []
      });
    } else {
      if (lastWatchedVideoId) progress.lastWatchedVideoId = lastWatchedVideoId;
      if (lastWatchedTimeSec !== undefined) progress.lastWatchedTimeSec = Math.floor(lastWatchedTimeSec);
      if (lessonId && !progress.completedLessons.includes(lessonId)) {
        progress.completedLessons.push(lessonId);
      }
    }

    // Calculate overall course progress percentage
    const course = await Course.findById(courseId);
    if (course) {
      let totalLessons = 0;
      course.modules.forEach(mod => {
        totalLessons += mod.lessons.length;
      });

      if (totalLessons > 0) {
        progress.overallCourseProgress = Math.min(
          100,
          Math.round((progress.completedLessons.length / totalLessons) * 100)
        );
      }
    }

    progress.updatedAt = Date.now();
    await progress.save();

    return res.status(200).json({
      success: true,
      message: 'Progress updated',
      progress
    });
  } catch (error) {
    console.error('Save progress error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save progress', error: error.message });
  }
};

export const getStudentProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const progress = await StudentProgress.findOne({ userId, courseId });

    return res.status(200).json({
      success: true,
      progress: progress || {
        userId,
        courseId,
        lastWatchedVideoId: null,
        lastWatchedTimeSec: 0,
        completedLessons: [],
        overallCourseProgress: 0
      }
    });
  } catch (error) {
    console.error('Get student progress error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch student progress', error: error.message });
  }
};

export const createCourse = async (req, res) => {
  try {
    const { title, description, category, instructorId, instructorIds, modules } = req.body;

    let instructorsList = [];
    if (Array.isArray(instructorIds) && instructorIds.length > 0) {
      instructorsList = instructorIds;
    } else if (instructorId) {
      instructorsList = [instructorId];
    } else {
      instructorsList = [req.user.id];
    }

    const course = new Course({
      title,
      description,
      category: category || 'General',
      instructorId: instructorsList[0],
      instructors: instructorsList,
      modules: modules || []
    });

    await course.save();
    const populatedCourse = await Course.findById(course._id)
      .populate('instructorId', 'name email username role')
      .populate('instructors', 'name email username role');

    return res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course: populatedCourse
    });
  } catch (error) {
    console.error('Create course error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create course', error: error.message });
  }
};

export const assignInstructor = async (req, res) => {
  try {
    const { id } = req.params;
    const { instructorId, instructorIds } = req.body;

    let instructorsList = [];
    if (Array.isArray(instructorIds) && instructorIds.length > 0) {
      instructorsList = instructorIds;
    } else if (instructorId) {
      instructorsList = [instructorId];
    }

    if (instructorsList.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one instructor ID is required' });
    }

    const course = await Course.findByIdAndUpdate(
      id,
      {
        instructorId: instructorsList[0],
        instructors: instructorsList
      },
      { new: true }
    )
      .populate('instructorId', 'name email username role')
      .populate('instructors', 'name email username role');

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Instructors assigned successfully',
      course
    });
  } catch (error) {
    console.error('Assign instructor error:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign instructor', error: error.message });
  }
};

export const addLessonToCourse = async (req, res) => {
  try {
    const { id } = req.params; // courseId
    const { moduleIndex, title, type, videoId, topicTag, difficulty } = req.body;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (!course.modules || course.modules.length === 0) {
      course.modules = [{ title: 'Module 1: Main Lessons', order: 0, lessons: [] }];
    }

    const targetModIndex = parseInt(moduleIndex || 0, 10);
    const mod = course.modules[targetModIndex] || course.modules[0];

    mod.lessons.push({
      title: title || 'New Lesson',
      type: type || 'video',
      videoId: videoId || null,
      topicTag: topicTag || 'general',
      difficulty: difficulty || 'medium',
      order: mod.lessons.length
    });

    await course.save();
    const updatedCourse = await Course.findById(id)
      .populate('instructorId', 'name email username role')
      .populate('instructors', 'name email username role')
      .populate({
        path: 'modules.lessons.videoId',
        select: 'title description s3Url fileKey durationSec status'
      });

    return res.status(200).json({
      success: true,
      message: 'Lesson added to course successfully',
      course: updatedCourse
    });
  } catch (error) {
    console.error('Add lesson error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add lesson', error: error.message });
  }
};

export const editLessonInCourse = async (req, res) => {
  try {
    const { id, moduleIndex, lessonIndex } = req.params;
    const { title, topicTag, difficulty, videoId } = req.body;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Check authorization: Admin, Course Owner, or Assigned Instructor
    const isOwner = course.instructorId?.toString() === req.user.id;
    const isInstructor = course.instructors?.some(insId => insId.toString() === req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !isOwner && !isInstructor) {
      return res.status(403).json({ success: false, message: 'Unauthorized to edit lessons in this course' });
    }

    const mIdx = parseInt(moduleIndex, 10);
    const lIdx = parseInt(lessonIndex, 10);

    const mod = course.modules?.[mIdx];
    if (!mod || !mod.lessons?.[lIdx]) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    const lesson = mod.lessons[lIdx];
    if (title !== undefined) lesson.title = title;
    if (topicTag !== undefined) lesson.topicTag = topicTag;
    if (difficulty !== undefined) lesson.difficulty = difficulty;
    if (videoId !== undefined) lesson.videoId = videoId;

    await course.save();
    const updatedCourse = await Course.findById(id)
      .populate('instructorId', 'name email username role')
      .populate('instructors', 'name email username role')
      .populate({
        path: 'modules.lessons.videoId',
        select: 'title description s3Url fileKey durationSec status'
      });

    return res.status(200).json({
      success: true,
      message: 'Lesson updated successfully',
      course: updatedCourse
    });
  } catch (error) {
    console.error('Edit lesson error:', error);
    return res.status(500).json({ success: false, message: 'Failed to edit lesson', error: error.message });
  }
};

export const deleteLessonFromCourse = async (req, res) => {
  try {
    const { id, moduleIndex, lessonIndex } = req.params;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Check authorization: Admin, Course Owner, or Assigned Instructor
    const isOwner = course.instructorId?.toString() === req.user.id;
    const isInstructor = course.instructors?.some(insId => insId.toString() === req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isAdmin && !isOwner && !isInstructor) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete lessons in this course' });
    }

    const mIdx = parseInt(moduleIndex, 10);
    const lIdx = parseInt(lessonIndex, 10);

    const mod = course.modules?.[mIdx];
    if (!mod || !mod.lessons?.[lIdx]) {
      return res.status(404).json({ success: false, message: 'Lesson not found' });
    }

    mod.lessons.splice(lIdx, 1);

    await course.save();
    const updatedCourse = await Course.findById(id)
      .populate('instructorId', 'name email username role')
      .populate('instructors', 'name email username role')
      .populate({
        path: 'modules.lessons.videoId',
        select: 'title description s3Url fileKey durationSec status'
      });

    return res.status(200).json({
      success: true,
      message: 'Lesson deleted successfully',
      course: updatedCourse
    });
  } catch (error) {
    console.error('Delete lesson error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete lesson', error: error.message });
  }
};

export const getCourses = async (req, res) => {
  try {
    const courses = await Course.find()
      .populate('instructorId', 'name email username role')
      .populate('instructors', 'name email username role');
    return res.status(200).json({ success: true, courses });
  } catch (error) {
    console.error('Get courses error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch courses', error: error.message });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructorId', 'name email username role')
      .populate('instructors', 'name email username role')
      .populate({
        path: 'modules.lessons.videoId',
        select: 'title description s3Url fileKey durationSec status'
      });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    return res.status(200).json({ success: true, course });
  } catch (error) {
    console.error('Get course by ID error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch course details', error: error.message });
  }
};
