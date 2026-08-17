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
  content: {
    type: mongoose.Schema.Types.Mixed,
    default: ''
  },
  yjsState: {
    type: String,
    default: null
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  collaborators: [CollaboratorSchema],
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
  const ownerIdStr = (this.owner?._id || this.owner)?.toString();

  if (ownerIdStr === userIdStr) {
    return 'owner';
  }

  const collab = this.collaborators?.find(c => {
    const collabUserIdStr = (c.user?._id || c.user)?.toString();
    return collabUserIdStr === userIdStr;
  });

  if (collab) {
    return collab.role; 
  }

  return this.publicAccess !== 'none' ? this.publicAccess : 'none';
};

// Automatic cascade deletion: remove all DocumentVersion records when document is deleted
DocumentSchema.post('deleteOne', { document: true, query: false }, async function () {
  try {
    if (this._id) {
      await mongoose.model('DocumentVersion').deleteMany({ documentId: this._id });
      console.log(`[Cascade Delete] Automatically deleted version history for document: ${this._id}`);
    }
  } catch (err) {
    console.error('[Cascade Delete Error]', err);
  }
});

DocumentSchema.post('findOneAndDelete', async function (doc) {
  try {
    if (doc && doc._id) {
      await mongoose.model('DocumentVersion').deleteMany({ documentId: doc._id });
      console.log(`[Cascade Delete] Automatically deleted version history for document: ${doc._id}`);
    }
  } catch (err) {
    console.error('[Cascade Delete Error]', err);
  }
});

export default mongoose.model('Document', DocumentSchema);
