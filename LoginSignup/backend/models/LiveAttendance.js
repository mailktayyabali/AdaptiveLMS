import mongoose from 'mongoose';

const sessionLogSchema = new mongoose.Schema({
  event: { type: String, enum: ['joined', 'left', 'reconnected'], required: true },
  timestamp: { type: Date, default: Date.now }
});

const liveAttendanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveSession', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  firstJoinedAt: { type: Date, default: Date.now },
  lastLeftAt: { type: Date },
  totalActiveDurationSec: { type: Number, default: 0 },
  isCurrentlyConnected: { type: Boolean, default: true },
  reconnectCount: { type: Number, default: 0 },
  lastConnectedAt: { type: Date, default: Date.now },
  sessionLogs: [sessionLogSchema]
}, { timestamps: true });

// Ensure unique (userId, sessionId) pair per student per live session
liveAttendanceSchema.index({ userId: 1, sessionId: 1 }, { unique: true });

export default mongoose.model('LiveAttendance', liveAttendanceSchema);
