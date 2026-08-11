import mongoose from 'mongoose';

const CollaboratorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['editor', 'viewer'],
    default: 'viewer'
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const DocumentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Document title is required'],
    trim: true,
    default: 'Untitled Document'
  },
  // Stores initial content or HTML/JSON state
  content: {
    type: mongoose.Schema.Types.Mixed,
    default: ''
  },
  // Document owner
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Explicit collaborators list with permissions
  collaborators: [CollaboratorSchema],
  // Public access setting ('none', 'viewer', 'editor')
  publicAccess: {
    type: String,
    enum: ['none', 'viewer', 'editor'],
    default: 'none'
  }
}, {
  timestamps: true
});

DocumentSchema.methods.getUserAccessLevel = function (userId) {
  if (!userId) {
    return this.publicAccess !== 'none' ? this.publicAccess : 'none';
  }

  const userIdStr = userId.toString();
  if (this.owner.toString() === userIdStr) {
    return 'owner';
  }

  const collab = this.collaborators.find(c => c.user.toString() === userIdStr);
  if (collab) {
    return collab.role; 
  }

  return this.publicAccess !== 'none' ? this.publicAccess : 'none';
};

export default mongoose.model('Document', DocumentSchema);
