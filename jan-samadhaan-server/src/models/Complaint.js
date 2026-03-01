const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
    _id: { type: String }, // tracking_id like GRV-20240224-1234
    citizen_name: String,
    citizen_email: String,
    citizen_phone: String,
    citizen_address: String,
    category: String,
    description: String,
    description_original: String,
    description_translated: String,
    citizen_language: { type: String, default: 'en' },
    media_path: String,
    latitude: Number,
    longitude: Number,
    location_address: String,
    priority: { type: Number, default: 5 },
    department: String,
    assigned_to: String,
    status: { type: String, default: 'Pending', enum: ['Pending', 'In Progress', 'Forwarded', 'Resolved', 'Rejected'] },
    sla_hours: Number,
    sla_deadline: Date,
    resolution_summary: String,
    resolution_proof: String,
    rejection_reason: String,
    transfer_count: { type: Number, default: 0 },
    citizen_feedback_rating: Number,
    citizen_feedback_comments: String,
    ai_analysis: mongoose.Schema.Types.Mixed,
    resolved_at: Date,
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Complaint', complaintSchema);
