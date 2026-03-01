const mongoose = require('mongoose');

const citizenSchema = new mongoose.Schema({
    phone: { type: String, unique: true, required: true },
    name: String,
    email: String,
    address: String,
    last_login: Date,
    // Govt ID Verification
    govt_id_type: { type: String, enum: ['aadhaar', 'pan', 'voter', null], default: null },
    govt_id_masked: { type: String, default: null },   // e.g. XXXX-XXXX-1234
    govt_id_verified: { type: Boolean, default: false },
    govt_id_verified_at: { type: Date, default: null },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Citizen', citizenSchema);
