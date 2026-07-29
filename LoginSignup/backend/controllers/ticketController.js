import Ticket from '../models/Ticket.js';

// Helper function to strip field-level restricted data for non-admins
const sanitizeTicket = (ticket, userRole) => {
    const obj = ticket.toObject ? ticket.toObject() : { ...ticket };
    if (userRole !== 'admin') {
        delete obj.internalPriority; // Field-level restriction for non-admins
    }
    return obj;
};

// 1. CREATE Ticket (Editors / Managers & Admins)
export const createTicket = async (req, res) => {
    try {
        const { title, description, status, internalPriority } = req.body;

        const ticketData = {
            title,
            description,
            status,
            owner: req.user.id || req.user._id
        };

        // Field-Level Restriction: Only Admins can set internalPriority on creation
        if (req.user.role === 'admin' && internalPriority) {
            ticketData.internalPriority = internalPriority;
        }

        const ticket = new Ticket(ticketData);
        await ticket.save();

        res.status(201).json({
            success: true,
            message: 'Ticket created successfully!',
            ticket: sanitizeTicket(ticket, req.user.role)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. GET ALL Tickets (Role & Ownership Filtered)
export const getTickets = async (req, res) => {
    try {
        let query = {};
        
        // Query-Level Ownership Enforcement: Non-admins can only see their own tickets
        if (req.user.role !== 'admin') {
            query.owner = req.user.id || req.user._id;
        }

        const tickets = await Ticket.find(query).populate('owner', 'username email name role');
        
        // Apply Field-Level Filter
        const sanitizedTickets = tickets.map(t => sanitizeTicket(t, req.user.role));

        res.json({ success: true, count: sanitizedTickets.length, tickets: sanitizedTickets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. GET Ticket By ID
export const getTicketById = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id).populate('owner', 'username email name role');

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found.' });
        }

        // Query-Level Ownership Check: Non-admin cannot fetch another user's record
        if (req.user.role !== 'admin' && String(ticket.owner._id) !== String(req.user.id || req.user._id)) {
            return res.status(403).json({ success: false, message: 'Access denied. You do not own this ticket.' });
        }

        res.json({ success: true, ticket: sanitizeTicket(ticket, req.user.role) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. UPDATE Ticket (Enforces Ownership & Field Restrictions)
export const updateTicket = async (req, res) => {
    try {
        const { title, description, status, internalPriority } = req.body;

        // Query-Level Ownership Check: Admins match by ID; Editors match by ID AND Owner
        const query = req.user.role === 'admin' 
            ? { _id: req.params.id }
            : { _id: req.params.id, owner: req.user.id || req.user._id };

        const ticket = await Ticket.findOne(query);

        if (!ticket) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. You can only update your own tickets.' 
            });
        }

        // Update basic fields
        if (title) ticket.title = title;
        if (description) ticket.description = description;
        if (status) ticket.status = status;

        // Field-Level Restriction: Only Admins can modify internalPriority
        if (internalPriority) {
            if (req.user.role === 'admin') {
                ticket.internalPriority = internalPriority;
            } else {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Only Admins can update the internalPriority field.'
                });
            }
        }

        await ticket.save();

        res.json({
            success: true,
            message: 'Ticket updated successfully!',
            ticket: sanitizeTicket(ticket, req.user.role)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. DELETE Ticket (Enforces Ownership)
export const deleteTicket = async (req, res) => {
    try {
        // Query-Level Ownership Check
        const query = req.user.role === 'admin'
            ? { _id: req.params.id }
            : { _id: req.params.id, owner: req.user.id || req.user._id };

        const ticket = await Ticket.findOneAndDelete(query);

        if (!ticket) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only delete your own tickets.'
            });
        }

        res.json({ success: true, message: 'Ticket deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
