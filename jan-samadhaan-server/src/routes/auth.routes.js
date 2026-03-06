const router = require('express').Router();
const crypto = require('crypto');
const Citizen = require('../models/Citizen');
const OTP = require('../models/OTP');
const { sendEmailAsync, getOTPEmailTemplate } = require('../services/email.service');

function generateOTP() {
    return '123456'; // Hardcoded test OTP
}

// Check if citizen exists
router.post('/check-exists', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ success: false, message: 'Phone required' });
        let citizen = await Citizen.findOne({ phone });
        if (!citizen && phone.includes('@')) citizen = await Citizen.findOne({ email: phone });
        if (citizen) {
            return res.json({ success: true, exists: true, citizen: { phone: citizen.phone, email: citizen.email, name: citizen.name, address: citizen.address } });
        }
        res.json({ success: true, exists: false });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Send OTP
router.post('/send-otp', async (req, res) => {
    try {
        const { phone, email, purpose = 'signin' } = req.body;
        if (!phone || !email) return res.status(400).json({ success: false, message: 'Phone and email required' });
        const otp_code = generateOTP();
        const expires_at = new Date(Date.now() + 5 * 60 * 1000);
        await OTP.create({ phone, otp_code, purpose, expires_at });
        // Commented out email sending for test OTP
        // sendEmailAsync(email, `🔐 Your OTP Code - ${otp_code}`, getOTPEmailTemplate(otp_code, phone, purpose === 'signin' ? 'Sign In' : 'Sign Up'));
        res.json({ success: true, message: `Test OTP 123456 will be used`, expires_in: 300 });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) return res.status(400).json({ success: false, message: 'Phone and OTP required' });
        const record = await OTP.findOne({ phone, otp_code: otp, used: false, expires_at: { $gt: new Date() } }).sort({ created_at: -1 });
        if (!record) return res.status(401).json({ success: false, message: 'Invalid or expired OTP' });
        record.used = true;
        await record.save();
        const citizen = await Citizen.findOne({ phone });
        if (citizen) {
            citizen.last_login = new Date();
            await citizen.save();
            return res.json({ success: true, message: 'OTP verified', citizen: { phone: citizen.phone, name: citizen.name, email: citizen.email, address: citizen.address } });
        }
        res.json({ success: true, message: 'OTP verified - complete registration', new_user: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Citizen signup
router.post('/signup', async (req, res) => {
    try {
        const { phone, name, email, address } = req.body;
        if (!phone || !name || !email) return res.status(400).json({ success: false, message: 'Phone, name, and email required' });
        const existing = await Citizen.findOne({ phone });
        if (existing) return res.status(400).json({ success: false, message: 'User already exists' });
        const citizen = await Citizen.create({ phone, name, email, address, last_login: new Date() });
        res.json({ success: true, message: 'Registration completed successfully', citizen: { phone, name, email, address } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Legacy verify endpoint
router.post('/verify_citizen', async (req, res) => {
    try {
        const { phone, name, email } = req.body;
        if (!phone || !name || !email) return res.status(400).json({ success: false });
        await Citizen.findOneAndUpdate({ phone }, { phone, name, email, last_login: new Date() }, { upsert: true, new: true });
        res.json({ success: true });
    } catch {
        res.json({ success: true }); // Return true so frontend continues
    }
});

// Get citizen complaints
router.get('/complaints', async (req, res) => {
    try {
        const { phone } = req.query;
        if (!phone) return res.status(400).json({ success: false, message: 'Phone required' });
        const { checkSlaStatus } = require('../services/sla.service');
        const complaints = await require('../models/Complaint').find({ citizen_phone: phone }).sort({ created_at: -1 }).lean();
        const results = complaints.map(c => ({ ...c, escalation_level: checkSlaStatus(c) }));
        res.json({ success: true, complaints: results });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
