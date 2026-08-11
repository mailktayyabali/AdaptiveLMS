import mongoose from "mongoose";

const DocumentVersionSchema = new mongoose.Schema({
    documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
        required: true,
        index: true
    },
    content: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
        index: true
    },
    title: {
        type: String,
        default: ''
    },
    createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  versionName: {
    type: String,
    default: 'Auto-saved Version'
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

export default mongoose.model('DocumentVersion', DocumentVersionSchema);