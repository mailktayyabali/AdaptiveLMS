import mongoose from 'mongoose';

const AnswerRecordSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  selectedOptionIndex: {
    type: Number,
    default: null
  },
  submittedCode: {
    type: String,
    default: ''
  },
  isCorrect: {
    type: Boolean,
    required: true
  },
  explanation: {
    type: String,
    default: ''
  },
  passedTestCases: {
    type: Number,
    default: 0
  },
  totalTestCases: {
    type: Number,
    default: 0
  }
});

const QuizAttemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  topicTag: {
    type: String,
    required: true,
    lowercase: true
  },
  scorePercent: {
    type: Number,
    required: true
  },
  passed: {
    type: Boolean,
    required: true
  },
  masteryBefore: {
    type: Number,
    required: true
  },
  masteryAfter: {
    type: Number,
    required: true
  },
  nextRecommendedDifficulty: {
    type: String,
    enum: ['easier', 'medium', 'harder'],
    default: 'medium'
  },
  answers: [AnswerRecordSchema],
  attemptNumber: {
    type: Number,
    default: 1
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('QuizAttempt', QuizAttemptSchema);
