import express from 'express';
import {
  createDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  shareDocument,
  getDocumentVersions,
  restoreDocumentVersion
} from '../controllers/doucumentController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all document routes with JWT authentication
router.use(authenticateToken);

// Document CRUD endpoints
router.post('/', createDocument);
router.get('/', getDocuments);
router.get('/:id', getDocumentById);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);

// Document permissions / sharing endpoint
router.post('/:id/share', shareDocument);

// Document version history endpoints
router.get('/:id/versions', getDocumentVersions);
router.post('/:id/versions/:versionId/restore', restoreDocumentVersion);

export default router;
