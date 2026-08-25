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
  // Aliases for legacy index compatibility
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    default: null
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

// Drop legacy user_1_course_1 index automatically on connection
mongoose.connection.once('open', async () => {
  try {
    const collection = mongoose.connection.collection('studentprogresses');
    const indexes = await collection.indexes();
    const legacyIndex = indexes.find(idx => idx.name === 'user_1_course_1');
    if (legacyIndex) {
      console.log('Dropping legacy index user_1_course_1 from studentprogresses collection...');
      await collection.dropIndex('user_1_course_1');
    }
  } catch (err) {
    // Ignore error if collection does not exist or index is already dropped
  }
});

export default mongoose.model('StudentProgress', StudentProgressSchema);
