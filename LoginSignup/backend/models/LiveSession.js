import mongoose from 'mongoose';

const qaItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  questionText: { type: String, required: true },
  raisedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'answering', 'resolved', 'dismissed'], default: 'pending' },
  resolvedAt: { type: Date }
});

const chatMessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userRole: { type: String, default: 'student' },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const liveSessionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  instructorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledStartTime: { type: Date, default: Date.now },
  actualStartTime: { type: Date },
  actualEndTime: { type: Date },
  status: { type: String, enum: ['scheduled', 'live', 'ended'], default: 'scheduled' },
  qaQueue: [qaItemSchema],
  chatMessages: [chatMessageSchema]
}, { timestamps: true });

export default mongoose.model('LiveSession', liveSessionSchema);
