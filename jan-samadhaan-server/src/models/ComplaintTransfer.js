const mongoose = require('mongoose');

const complaintTransferSchema = new mongoose.Schema({
    complaint_id: { type: String, required: true },
    from_department: String,
    to_department: { type: String, required: true },
    transferred_by: String,
    transfer_reason: String,
    transferred_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ComplaintTransfer', complaintTransferSchema);
