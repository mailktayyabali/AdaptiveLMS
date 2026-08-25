import mongoose from 'mongoose';

const TestCaseSchema = new mongoose.Schema({
  input: {
    type: String,
    default: ''
  },
  expectedOutput: {
    type: String,
    required: true
  },
  isHidden: {
    type: Boolean,
    default: false
  }
});

const QuestionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['mcq', 'code'],
    required: true,
    default: 'mcq'
  },
  options: [{
    text: String,
    isCorrect: Boolean,
    explanation: String
  }],
  // For code-based questions
  initialCodeTemplate: {
    type: String,
    default: '// Write your JavaScript solution here\nfunction solution(input) {\n  return input;\n}\n'
  },
  testCases: [TestCaseSchema],
  explanation: {
    type: String,
    default: ''
  },
  points: {
    type: Number,
    default: 10
  }
});

const QuizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  topicTag: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['easier', 'medium', 'harder'],
    default: 'medium'
  },
  questions: [QuestionSchema],
  passingScorePercent: {
    type: Number,
    default: 60
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Quiz', QuizSchema);
