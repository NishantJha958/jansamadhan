const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Complaint = require('../models/Complaint');
const ComplaintTransfer = require('../models/ComplaintTransfer');
const Official = require('../models/Official');
const { analyzeWithAI, routeComplaint, getSlaHours, getSlaDeadline } = require('../services/ai.service');
const { sendEmailAsync, getComplaintSubmittedTemplate } = require('../services/email.service');
const { checkSlaStatus } = require('../services/sla.service');
const { checkDuplicateComplaints } = require('../services/location.service');

// Multer setup
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

function generateTrackingId() {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `GRV-${date}-${rand}`;
}

function translateText(text, fromLang, toLang) {
    // Stub — translation handled by frontend or translate route
    return text;
}

// Check duplicates
router.post('/check_duplicates', async (req, res) => {
    try {
        const { latitude, longitude, category, radius = 20 } = req.body;
        if (!latitude || !longitude) return res.status(400).json({ success: false, message: 'Location required' });
        const nearby = await checkDuplicateComplaints(parseFloat(latitude), parseFloat(longitude), category, parseInt(radius));
        res.json({ success: true, duplicates_found: nearby.length > 0, count: nearby.length, nearby_complaints: nearby.slice(0, 5), radius_checked: radius });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Submit complaint
router.post('/submit_complaint', upload.single('media_upload'), async (req, res) => {
    try {
        const d = req.body;
        const cat = d.category;
        const desc = d.description;
        const citizenLang = d.citizen_language || 'en';
        const desc_translated = desc; // Translation is done client-side or via translate API

        const lat = d.latitude ? parseFloat(d.latitude) : null;
        const lon = d.longitude ? parseFloat(d.longitude) : null;
        const loc_addr = d.location_address || d.citizen_address || '';

        const ai = await analyzeWithAI(desc_translated || desc, cat);
        const pri = ai.priority || 5;

        let dept;
        if (!cat || cat === '') {
            dept = ai.detected_department || 'General_Admin_Dept';
        } else {
            dept = routeComplaint(cat);
            if (ai.detected_department && ai.detected_department !== dept) {
                dept = ai.detected_department;
            }
        }

        const sla_h = getSlaHours(pri);
        const sla_deadline = getSlaDeadline(pri);
        const tracking_id = generateTrackingId();

        let media_path = null;
        if (req.file) {
            media_path = `${tracking_id}_${req.file.originalname.replace(/\s+/g, '_')}`;
            const newPath = path.join(uploadsDir, media_path);
            fs.renameSync(req.file.path, newPath);
        }

        const complaint = await Complaint.create({
            _id: tracking_id,
            citizen_name: d.citizen_name,
            citizen_email: d.citizen_email,
            citizen_phone: d.citizen_phone,
            citizen_address: d.citizen_address,
            latitude: lat,
            longitude: lon,
            location_address: loc_addr,
            category: cat || 'Auto-Detected',
            description: desc_translated || desc,
            description_original: desc,
            description_translated: desc_translated || desc,
            citizen_language: citizenLang,
            media_path,
            priority: pri,
            department: dept,
            assigned_to: `${dept}_Manager`,
            sla_hours: sla_h,
            sla_deadline,
            ai_analysis: ai,
        });

        const emailData = {
            citizen_name: d.citizen_name,
            tracking_id,
            category: cat || 'Auto-Detected by AI',
            priority: pri,
            department: dept,
            sla_deadline: sla_deadline.toLocaleString('en-IN'),
            latitude: lat,
            longitude: lon,
        };
        sendEmailAsync(d.citizen_email, `Complaint Registered - ${tracking_id}`, getComplaintSubmittedTemplate(emailData));

        // Notify department
        const deptOfficial = await Official.findOne({ department: dept });
        if (deptOfficial?.email) {
            sendEmailAsync(deptOfficial.email, `🔔 New Complaint - ${tracking_id}`, getComplaintSubmittedTemplate(emailData));
        }

        res.json({
            success: true,
            tracking_id,
            priority: pri,
            department: dept,
            sla_hours: sla_h,
            sla_deadline: sla_deadline.toLocaleString('en-IN'),
            ai_sentiment: ai.sentiment || 'Neutral',
            translation_done: citizenLang !== 'en',
            detected_language: citizenLang,
            ai_routed: !cat || cat === '',
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get all complaints (for officials)
router.get('/complaints', async (req, res) => {
    try {
        const { department } = req.query;
        const query = department ? { department } : {};
        const complaints = await Complaint.find(query).sort({ created_at: -1 }).lean();
        const results = complaints.map(c => ({
            ...c,
            escalation_level: checkSlaStatus(c),
            description_display: c.description_translated || c.description || '',
            description_original: c.description_original || c.description || '',
        }));
        res.json({ success: true, complaints: results });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Get single complaint
router.get('/complaint/:id', async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id).lean();
        if (!complaint) return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, complaint: { ...complaint, escalation_level: checkSlaStatus(complaint) } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Update complaint status
router.post('/complaint/:id/update', upload.single('resolution_proof'), async (req, res) => {
    try {
        const { id } = req.params;
        const d = req.body;
        const { status, resolution_summary, forward_dept, rejection_reason, transferred_by = 'Official', transfer_reason = '' } = d;

        const complaint = await Complaint.findById(id);
        if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

        complaint.status = status;
        complaint.resolution_summary = resolution_summary;

        if (req.file) {
            complaint.resolution_proof = req.file.filename;
        }

        if (status === 'Forwarded' && forward_dept) {
            const old_dept = complaint.department;
            complaint.department = forward_dept;
            complaint.assigned_to = `${forward_dept}_Manager`;
            complaint.transfer_count = (complaint.transfer_count || 0) + 1;
            await ComplaintTransfer.create({
                complaint_id: id,
                from_department: old_dept,
                to_department: forward_dept,
                transferred_by,
                transfer_reason,
                transferred_at: new Date(),
            });
        }

        if (status === 'Rejected' && rejection_reason) {
            complaint.rejection_reason = rejection_reason;
        }

        if (status === 'Resolved') {
            complaint.resolved_at = new Date();
        }

        await complaint.save();
        res.json({ success: true, message: `Complaint ${status}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// Transfer history
router.get('/complaint/:id/transfers', async (req, res) => {
    try {
        const transfers = await ComplaintTransfer.find({ complaint_id: req.params.id }).sort({ transferred_at: -1 });
        res.json({ success: true, transfers });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Feedback
router.post('/complaint/:id/feedback', async (req, res) => {
    try {
        const { rating, comment } = req.body;
        await Complaint.findByIdAndUpdate(req.params.id, { citizen_feedback_rating: rating, citizen_feedback_comments: comment || '' });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// Serve uploads
router.get('/uploads/:filename', (req, res) => {
    res.sendFile(path.join(uploadsDir, req.params.filename));
});

module.exports = router;
