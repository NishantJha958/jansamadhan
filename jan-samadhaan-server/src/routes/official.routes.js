const router = require('express').Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Official = require('../models/Official');

// Official login
router.post('/login', async (req, res) => {
    try {
        const { username, password, govt_id } = req.body;
        if (!username || !password) return res.status(400).json({ success: false, message: 'Username and password required' });

        const official = await Official.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
        if (!official) return res.status(401).json({ success: false, message: 'Login Failed: Official account not found' });

        const pw_match = await official.comparePassword(password);
        const gid_match = !govt_id || govt_id === (official.govt_id || '');

        if (!pw_match || !gid_match) {
            const reason = !pw_match ? 'Incorrect password' : 'Incorrect Govt ID';
            return res.status(401).json({ success: false, message: `Login Failed: ${reason}` });
        }

        const token = jwt.sign({ id: official._id, department: official.department, username: official.username }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });

        res.json({
            success: true,
            token,
            user: { username: official.username, name: official.name, department: official.department, language: official.preferred_language },
            department: official.department,
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Add official (admin only - no auth check for simplicity, matches original)
router.post('/add', async (req, res) => {
    try {
        const { username, password, govt_id, name, department, email, phone } = req.body;
        const crypto = require('crypto');
        const password_hash = crypto.createHash('sha256').update(password).digest('hex');
        const official = await Official.create({ username, password_hash, govt_id, name, department, email, phone });
        res.json({ success: true, official: { id: official._id, username, department } });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

module.exports = router;
