import mongoose from 'mongoose';

const StudentMasterySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  topicTag: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  masteryScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 50
  },
  totalAttempts: {
    type: Number,
    default: 0
  },
  lastEvaluatedAt: {
    type: Date,
    default: Date.now
  }
});

// Unique compound index per student and topic tag
StudentMasterySchema.index({ userId: 1, topicTag: 1 }, { unique: true });

export default mongoose.model('StudentMastery', StudentMasterySchema);
