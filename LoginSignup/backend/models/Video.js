import mongoose from 'mongoose';

const VideoSchema = new mongoose.Schema({
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
  originalFileName: {
    type: String,
    required: true
  },
  fileKey: {
    type: String,
    required: true
  },
  s3Url: {
    type: String,
    default: ''
  },
  uploadId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'ready', 'failed'],
    default: 'uploading'
  },
  totalChunks: {
    type: Number,
    required: true,
    default: 1
  },
  uploadedChunks: {
    type: [Number],
    default: []
  },
  chunkFolder: {
    type: String,
    default: 'Tayyab/lms-videos/chunks'
  },
  fileSize: {
    type: Number,
    default: 0
  },
  durationSec: {
    type: Number,
    default: 0
  },
  mimeType: {
    type: String,
    default: 'video/mp4'
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Video', VideoSchema);
