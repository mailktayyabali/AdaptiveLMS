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
    createdAt: {
        type: Date,
        default: Date.now
    }
});
export default mongoose.model('Ticket', TicketSchema);