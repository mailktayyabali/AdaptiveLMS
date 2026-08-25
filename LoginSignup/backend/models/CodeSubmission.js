import mongoose from 'mongoose';

const CodeSubmissionSchema = new mongoose.Schema({
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
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  code: {
    type: String,
    required: true
  },
  normalizedTokens: {
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
  },
  similarityScorePercent: {
    type: Number,
    default: 0
  },
  maxMatchedStudentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  plagiarismStatus: {
    type: String,
    enum: ['clean', 'suspicious', 'copied'],
    default: 'clean'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('CodeSubmission', CodeSubmissionSchema);
