import  mongoose from "mongoose";

const TicketSchema = new mongoose.Schema({
    title : {
        type: String,
        required: [true, "Ticket is Required"],
        trim: true
    },
    description: {
        type: String,
        required: [true, "Description is Required"],
        trim: true
    },
    status: {
        type: String,
        enum: ["open", "in-progress", "resolved", "closed"],
        default: "open"
    },
    internalPriority : {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Critical'],
        default: "Low",
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    attachments: [{
        filename: { type: String, required: true },
        originalName: { type: String, required: true },
        mimeType: { type: String, required: true },
        size: { type: Number, required: true },
        path: { type: String, required: true },
        thumbnailPath: { type: String, default: null },
        uploadedAt: { type: Date, default: Date.now }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});
export default mongoose.model('Ticket', TicketSchema);