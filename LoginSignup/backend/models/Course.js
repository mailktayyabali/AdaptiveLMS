import mongoose from 'mongoose';

const LessonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['video', 'quiz', 'live'],
    default: 'video'
  },
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    default: null
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    default: null
  },
  durationSec: {
    type: Number,
    default: 0
  },
  topicTag: {
    type: String,
    default: 'general',
    lowercase: true,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['easier', 'medium', 'harder'],
    default: 'medium'
  },
  order: {
    type: Number,
    default: 0
  }
});

const ModuleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  order: {
    type: Number,
    default: 0
  },
  lessons: [LessonSchema]
});

const CourseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    default: 'General',
    trim: true
  },
  thumbnailUrl: {
    type: String,
    default: ''
  },
  modules: [ModuleSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Course', CourseSchema);
