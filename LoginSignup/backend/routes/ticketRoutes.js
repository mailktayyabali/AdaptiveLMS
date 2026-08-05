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
import { authenticateToken, checkPermission } from '../middleware/authMiddleware.js';
import { handleSingleUpload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Require authentication for all ticket routes
router.use(authenticateToken);

// Ticket Read operations (requires 'canReadTicket' permission)
router.get('/', checkPermission('canReadTicket'), getTickets);
router.get('/:id', checkPermission('canReadTicket'), getTicketById);

// Ticket Create operation (requires 'canCreateTicket' permission)
router.post('/', checkPermission('canCreateTicket'), createTicket);

// Attachments operations (requires 'canUpdateTicket' permission)
router.post('/:id/upload', checkPermission('canUpdateTicket'), handleSingleUpload('file'), uploadAttachment);
router.delete('/:id/upload/:attachmentId', checkPermission('canUpdateTicket'), deleteAttachment);

// Ticket Update operation (requires 'canUpdateTicket' permission)
router.put('/:id', checkPermission('canUpdateTicket'), updateTicket);

// Ticket Delete operation (requires 'canDeleteTicket' permission)
router.delete('/:id', checkPermission('canDeleteTicket'), deleteTicket);

export default router;
