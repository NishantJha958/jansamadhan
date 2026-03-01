const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const officialSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password_hash: { type: String, required: true },
    govt_id: { type: String, unique: true, sparse: true },
    name: String,
    department: String,
    email: String,
    phone: String,
    preferred_language: { type: String, default: 'en' },
}, { timestamps: true });

officialSchema.methods.comparePassword = async function (password) {
    const crypto = require('crypto');
    const sha256Hash = crypto.createHash('sha256').update(password).digest('hex');
    return this.password_hash === sha256Hash;
};

module.exports = mongoose.model('Official', officialSchema);
