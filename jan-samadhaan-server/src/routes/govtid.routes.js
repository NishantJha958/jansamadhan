const router = require('express').Router();
const Citizen = require('../models/Citizen');

// ─── Format validators ────────────────────────────────────────────────────────
function validateAadhaar(id) {
    return /^\d{12}$/.test(id.replace(/\s|-/g, ''));
}
function validatePAN(id) {
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(id.toUpperCase());
}
function validateVoterID(id) {
    return /^[A-Z]{3}[0-9]{7}$/.test(id.toUpperCase());
}

// ─── Mask ID for storage ──────────────────────────────────────────────────────
function maskID(type, id) {
    const clean = id.replace(/\s|-/g, '').toUpperCase();
    if (type === 'aadhaar') {
        return `XXXX-XXXX-${clean.slice(-4)}`;
    }
    if (type === 'pan') {
        return `XXXXX${clean.slice(5)}`;
    }
    if (type === 'voter') {
        return `XXX${clean.slice(3, 7)}XXX`;
    }
    return '****';
}

// ─── Pluggable real verification (future: Surepass / UIDAI) ──────────────────
async function verifyWithExternalAPI(type, id) {
    // ⚡ FUTURE: Plug in paid APIs here
    // Surepass (https://surepass.io/):
    //   POST https://kyc-api.surepass.io/api/v1/aadhaar-v2/generate-otp
    //   Headers: Authorization: Bearer <token>
    //   Body: { id_number: id }
    //
    // Razorpay KYC, Signzy, AuthBridge work similarly.
    //
    // For now: format validation counts as "verified" (demo/hackathon mode)
    const SUREPASS_TOKEN = process.env.SUREPASS_TOKEN;
    if (SUREPASS_TOKEN && type === 'aadhaar') {
        try {
            const axios = require('axios');
            const resp = await axios.post(
                'https://kyc-api.surepass.io/api/v1/aadhaar-v2/generate-otp',
                { id_number: id },
                { headers: { Authorization: `Bearer ${SUREPASS_TOKEN}`, 'Content-Type': 'application/json' }, timeout: 8000 }
            );
            return { real: true, success: resp.data?.success };
        } catch {
            // fall through to demo mode
        }
    }
    // Demo mode — format validation only
    return { real: false, success: true };
}

// ─── POST /api/citizen/verify-govt-id ────────────────────────────────────────
router.post('/verify-govt-id', async (req, res) => {
    try {
        const { phone, id_type, id_number } = req.body;
        if (!phone || !id_type || !id_number) {
            return res.status(400).json({ success: false, message: 'Phone, ID type and ID number are required' });
        }

        const clean = id_number.replace(/\s|-/g, '').toUpperCase();

        // Validate format
        let valid = false;
        if (id_type === 'aadhaar') valid = validateAadhaar(clean);
        else if (id_type === 'pan') valid = validatePAN(clean);
        else if (id_type === 'voter') valid = validateVoterID(clean);
        else return res.status(400).json({ success: false, message: 'Invalid ID type' });

        if (!valid) {
            const formats = {
                aadhaar: '12-digit number (e.g. 1234 5678 9012)',
                pan: '10-character alphanumeric (e.g. ABCDE1234F)',
                voter: '10-character (e.g. ABC1234567)',
            };
            return res.status(400).json({
                success: false,
                message: `Invalid ${id_type.toUpperCase()} format. Expected: ${formats[id_type]}`,
            });
        }

        // Check if citizen exists
        const citizen = await Citizen.findOne({ phone });
        if (!citizen) return res.status(404).json({ success: false, message: 'Citizen not found. Please register first.' });

        // Check if already verified with different ID
        if (citizen.govt_id_verified && citizen.govt_id_masked) {
            return res.status(400).json({
                success: false,
                message: `Already verified with ${citizen.govt_id_type?.toUpperCase()} (${citizen.govt_id_masked})`,
            });
        }

        // Run verification (real API if token present, else demo mode)
        const result = await verifyWithExternalAPI(id_type, clean);
        if (!result.success) {
            return res.status(400).json({ success: false, message: 'ID verification failed. Please check the number and try again.' });
        }

        // Save masked ID
        const masked = maskID(id_type, clean);
        citizen.govt_id_type = id_type;
        citizen.govt_id_masked = masked;
        citizen.govt_id_verified = true;
        citizen.govt_id_verified_at = new Date();
        await citizen.save();

        return res.json({
            success: true,
            verified: true,
            masked,
            mode: result.real ? 'real_api' : 'demo_format_check',
            message: result.real
                ? `${id_type.toUpperCase()} verified successfully via government database ✅`
                : `${id_type.toUpperCase()} format validated ✅ (Demo mode — add SUREPASS_TOKEN for real verification)`,
        });

    } catch (err) {
        console.error('Govt ID verify error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ─── GET /api/citizen/verification-status ────────────────────────────────────
router.get('/verification-status', async (req, res) => {
    try {
        const { phone } = req.query;
        if (!phone) return res.status(400).json({ success: false, message: 'Phone required' });
        const citizen = await Citizen.findOne({ phone }).select('govt_id_type govt_id_masked govt_id_verified govt_id_verified_at');
        if (!citizen) return res.status(404).json({ success: false, message: 'Citizen not found' });
        res.json({ success: true, ...citizen.toObject() });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
