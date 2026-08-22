import mongoose from 'mongoose';

const StudentProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  cohortId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cohort',
    default: null
  },
  lastWatchedVideoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    default: null
  },
  lastWatchedTimeSec: {
    type: Number,
    default: 0
  },
  completedLessons: [{
    type: mongoose.Schema.Types.ObjectId
  }],
  overallCourseProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  topicMastery: {
    type: Map,
    of: Number,
    default: {}
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

StudentProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export default mongoose.model('StudentProgress', StudentProgressSchema);
