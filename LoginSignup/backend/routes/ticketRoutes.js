import express from 'express';
import { 
    createTicket, 
    getTickets, 
    getTicketById, 
    updateTicket, 
    deleteTicket 
} from '../controllers/ticketController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Require authentication for all ticket routes
router.use(authenticateToken);

// Viewers ('user'), Editors ('manager'), Admins ('admin') can view tickets
router.get('/', authorizeRoles('user', 'manager', 'admin'), getTickets);
router.get('/:id', authorizeRoles('user', 'manager', 'admin'), getTicketById);

// Editors ('manager') & Admins ('admin') can create tickets
router.post('/', authorizeRoles('manager', 'admin'), createTicket);

// Editors ('manager') & Admins ('admin') can update tickets
router.put('/:id', authorizeRoles('manager', 'admin'), updateTicket);

// Editors ('manager') & Admins ('admin') can delete tickets
router.delete('/:id', authorizeRoles('manager', 'admin'), deleteTicket);

export default router;
