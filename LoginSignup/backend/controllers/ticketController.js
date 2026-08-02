import Ticket from '../models/Ticket.js';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

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

// 2. GET ALL Tickets (All authenticated users can view all tickets)
export const getTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find({}).populate('owner', 'username email name role');
        
        // Apply Field-Level Filter (strips internalPriority for non-admins)
        const sanitizedTickets = tickets.map(t => sanitizeTicket(t, req.user.role));

        res.json({ success: true, count: sanitizedTickets.length, tickets: sanitizedTickets });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. GET Ticket By ID (All authenticated users can view any ticket)
export const getTicketById = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id).populate('owner', 'username email name role');

        if (!ticket) {
            return res.status(404).json({ success: false, message: 'Ticket not found.' });
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

// Helper to remove attachment files from disk safely
const removeAttachmentFilesFromDisk = async (attachment) => {
    try {
        if (attachment.path) {
            const originalFullPath = path.join(process.cwd(), attachment.path.replace(/^\//, ''));
            if (fs.existsSync(originalFullPath)) {
                await fs.promises.unlink(originalFullPath).catch(() => {});
            }
        }
        if (attachment.thumbnailPath) {
            const thumbFullPath = path.join(process.cwd(), attachment.thumbnailPath.replace(/^\//, ''));
            if (fs.existsSync(thumbFullPath)) {
                await fs.promises.unlink(thumbFullPath).catch(() => {});
            }
        }
    } catch (err) {
        console.error('Error removing attachment file from disk:', err);
    }
};

// 5. DELETE Ticket (Enforces Ownership & Performs Cascade File Cleanup)
export const deleteTicket = async (req, res) => {
    try {
        // Query-Level Ownership Check
        const query = req.user.role === 'admin'
            ? { _id: req.params.id }
            : { _id: req.params.id, owner: req.user.id || req.user._id };

        const ticket = await Ticket.findOne(query);

        if (!ticket) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only delete your own tickets.'
            });
        }

        // Cascade Cleanup: Delete all associated attachment files from disk
        if (ticket.attachments && ticket.attachments.length > 0) {
            for (const att of ticket.attachments) {
                await removeAttachmentFilesFromDisk(att);
            }
        }

        await Ticket.deleteOne({ _id: ticket._id });

        res.json({ success: true, message: 'Ticket and associated files deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 6. UPLOAD Ticket Attachment (Enforces Ownership & Sharp Thumbnail Processing)
export const uploadAttachment = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please select a file to upload.' });
        }

        // Ownership Check: Only Admin or Ticket Owner can upload attachment
        const query = req.user.role === 'admin'
            ? { _id: req.params.id }
            : { _id: req.params.id, owner: req.user.id || req.user._id };

        const ticket = await Ticket.findOne(query);

        if (!ticket) {
            // Delete uploaded file if user is unauthorized
            if (fs.existsSync(req.file.path)) {
                await fs.promises.unlink(req.file.path).catch(() => {});
            }
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only attach files to your own tickets.'
            });
        }

        let thumbnailPath = null;
        const isImage = req.file.mimetype.startsWith('image/');

        // Sharp Thumbnail Processing for Images
        if (isImage) {
            try {
                const thumbFilename = `thumb-${req.file.filename}`;
                const thumbDir = path.join(process.cwd(), 'uploads', 'thumbnails');
                const thumbFullPath = path.join(thumbDir, thumbFilename);

                await sharp(req.file.path)
                    .resize(200, 200, { fit: 'cover' })
                    .toFile(thumbFullPath);

                thumbnailPath = `/uploads/thumbnails/${thumbFilename}`;
            } catch (sharpError) {
                console.error('Sharp thumbnail generation error:', sharpError);
                thumbnailPath = null;
            }
        }

        const newAttachment = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            path: `/uploads/originals/${req.file.filename}`,
            thumbnailPath: thumbnailPath,
            uploadedAt: new Date()
        };

        ticket.attachments.push(newAttachment);
        await ticket.save();

        res.status(201).json({
            success: true,
            message: 'Attachment uploaded successfully!',
            attachment: newAttachment,
            ticket: sanitizeTicket(ticket, req.user.role)
        });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            await fs.promises.unlink(req.file.path).catch(() => {});
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// 7. DELETE Ticket Attachment (Enforces Ownership & File Cleanup)
export const deleteAttachment = async (req, res) => {
    try {
        const { id, attachmentId } = req.params;

        const query = req.user.role === 'admin'
            ? { _id: id }
            : { _id: id, owner: req.user.id || req.user._id };

        const ticket = await Ticket.findOne(query);

        if (!ticket) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only delete attachments from your own tickets.'
            });
        }

        const attachmentIndex = ticket.attachments.findIndex(
            att => String(att._id) === String(attachmentId)
        );

        if (attachmentIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'Attachment not found.'
            });
        }

        const attachment = ticket.attachments[attachmentIndex];

        // Remove files from disk
        await removeAttachmentFilesFromDisk(attachment);

        // Remove attachment from ticket subdocument array
        ticket.attachments.splice(attachmentIndex, 1);
        await ticket.save();

        res.json({
            success: true,
            message: 'Attachment deleted successfully!',
            ticket: sanitizeTicket(ticket, req.user.role)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
