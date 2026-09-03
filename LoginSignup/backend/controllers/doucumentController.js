import mongoose from "mongoose";
import Document from "../models/Document.js";
import DocumentVersion from '../models/DocumentVersion.js';
import User from '../models/User.js';

const getUserId = (req) => req.user?.id || req.user?._id;
export const createDocument = async(req, res) =>{
    try {
        const userId = getUserId(req);
        const {title, content } = req.body;
        const document = await Document.create({
            title : title || "Untitled Document",
            content : content || '',
            owner : userId,
            collaborators: []
        });
        await DocumentVersion.create({
            documentId: document._id,
            content: content || '',
            title: title || 'Untitled Document',
            createdBy: userId,
            versionName: 'initial draft'
        });
        res.status(201).json({
            success: true,
            message: 'Document created successfully',
            document
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Failed to create document' });
    }
};
export const getDocuments = async(req, res) =>{
    try {
        const userId = getUserId(req);
        const documents =await Document.find({
            $or:[
                {owner : userId},
                {collaborators : {$elemMatch: { user: userId, role: { $in: ['editor', 'viewer'] } } } },
                {publicAccess: {$ne : 'none'} }
            ]
        }).populate('owner', 'name email')
          .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            message: 'Documents fetched successfully',
            documents
        });   
    } catch (error) {
        console.error('get document error', error);
        res.status(500).json({success : false, message : 'Failed to get document'});
    }
};

export const getDocumentById = async(req, res) =>{
    try{
        const userId = getUserId(req);
        const documentId = req.params.id || req.params.documentId;

        if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) {
            return res.status(404).json({ success: false, message: 'Document not found' });
        }

        const document = await Document.findById(documentId)
        .populate('owner', 'name email')
        .populate('collaborators.user', 'name email username');

        if(!document){
            return res.status(404).json({success : false, message : 'Document not found'})
        }
        const accessLevel = document.getUserAccessLevel(userId);
        if(accessLevel === 'none') {
            return res.status(403).json({success: false, message: 'Access denied: You do not have permission to view this document' });
        }
        res.json({
            success: true,
            document,
            userAccessLevel: accessLevel
        });
    }catch (error) {
        console.error('get document by id error', error)
        res.status(500).json({success : false, message: 'Failed to get document'});
    }
};
export const updateDocument = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { title, content } = req.body;
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    const accessLevel = document.getUserAccessLevel(userId);
    if (!['owner', 'editor'].includes(accessLevel)) {
      return res.status(403).json({ success: false, message: 'You do not have edit permission for this document' });
    }
    if (title !== undefined) document.title = title;
    if (content !== undefined) document.content = content;
    await document.save();
    res.json({ success: true, document, userAccessLevel: accessLevel });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ success: false, message: 'Failed to update document' });
  }
};
export const deleteDocument = async (req, res) => {
  try {
    const userId = getUserId(req);
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    const ownerIdStr = (document.owner?._id || document.owner)?.toString();
    if (ownerIdStr !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Only the document owner can delete this document' });
    }
    await document.deleteOne();
    await DocumentVersion.deleteMany({ documentId: req.params.id });
    res.json({ success: true, message: 'Document and its version history deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete document' });
  }
};

export const shareDocument = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { email, role, publicAccess } = req.body;
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    const ownerIdStr = (document.owner?._id || document.owner)?.toString();
    if (ownerIdStr !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Only the document owner can manage permissions' });
    }
    
    if (publicAccess && ['none', 'viewer', 'editor'].includes(publicAccess)) {
      document.publicAccess = publicAccess;
    }
    if (email) {
      const targetUser = await User.findOne({ email: email.toLowerCase() });
      if (!targetUser) {
        return res.status(404).json({ success: false, message: `User with email '${email}' not found` });
      }
      if (targetUser._id.toString() === userId.toString()) {
        return res.status(400).json({ success: false, message: 'Cannot set collaborator role for document owner' });
      }
      const existingIndex = document.collaborators.findIndex(
        c => c.user.toString() === targetUser._id.toString()
      );
      if (existingIndex > -1) {
        if (role === 'remove') {
          document.collaborators.splice(existingIndex, 1);
        } else {
          document.collaborators[existingIndex].role = role || 'viewer';
        }
      } else if (role !== 'remove') {
        document.collaborators.push({
          user: targetUser._id,
          role: role || 'viewer'
        });
      }
    }
    await document.save();
    const updatedDoc = await Document.findById(document._id)
      .populate('owner', 'name email username')
      .populate('collaborators.user', 'name email username');
    res.json({ success: true, document: updatedDoc });
  } catch (error) {
    console.error('Share document error:', error);
    res.status(500).json({ success: false, message: 'Failed to update document access' });
  }
};

export const getDocumentVersions = async (req, res) => {
  try {
    const userId = getUserId(req);
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    const accessLevel = document.getUserAccessLevel(userId);
    if (accessLevel === 'none') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const versions = await DocumentVersion.find({ documentId: req.params.id })
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, versions });
  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch version history' });
  }
};

export const restoreDocumentVersion = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id, versionId } = req.params;
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    const accessLevel = document.getUserAccessLevel(userId);
    if (!['owner', 'editor'].includes(accessLevel)) {
      return res.status(403).json({ success: false, message: 'Edit access required to restore versions' });
    }
    const version = await DocumentVersion.findById(versionId);
    if (!version || version.documentId.toString() !== id) {
      return res.status(404).json({ success: false, message: 'Version snapshot not found' });
    }

    document.content = version.content;
    if (version.title) document.title = version.title;
    await document.save();

    await DocumentVersion.create({
      documentId: document._id,
      content: document.content,
      title: document.title,
      createdBy: userId,
      versionName: `Restored from version (${new Date(version.createdAt).toLocaleString()})`
    });
    res.json({ success: true, document, message: 'Document restored successfully' });
  } catch (error) {
    console.error('Restore version error:', error);
    res.status(500).json({ success: false, message: 'Failed to restore document version' });
  }
};