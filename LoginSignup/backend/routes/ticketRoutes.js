import express from 'express';
import { 
    createTicket, 
    getTickets, 
    getTicketById, 
    updateTicket, 
    deleteTicket,
    uploadAttachment,
    deleteAttachment
} from '../controllers/ticketController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { handleSingleUpload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Require authentication for all ticket routes
router.use(authenticateToken);

// Viewers ('user'), Editors ('manager'), Admins ('admin') can view tickets
router.get('/', authorizeRoles('user', 'manager', 'admin'), getTickets);
router.get('/:id', authorizeRoles('user', 'manager', 'admin'), getTicketById);

// Editors ('manager') & Admins ('admin') can create tickets
router.post('/', authorizeRoles('manager', 'admin'), createTicket);

// Attach file/image to a ticket
router.post('/:id/upload', authorizeRoles('manager', 'admin'), handleSingleUpload('file'), uploadAttachment);

// Delete attachment from a ticket
router.delete('/:id/upload/:attachmentId', authorizeRoles('manager', 'admin'), deleteAttachment);

// Editors ('manager') & Admins ('admin') can update tickets
router.put('/:id', authorizeRoles('manager', 'admin'), updateTicket);

// Editors ('manager') & Admins ('admin') can delete tickets
router.delete('/:id', authorizeRoles('manager', 'admin'), deleteTicket);

export default router;
