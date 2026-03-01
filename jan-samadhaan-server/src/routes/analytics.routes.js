const router = require('express').Router();
const Complaint = require('../models/Complaint');

router.get('/analytics/dashboard', async (req, res) => {
    try {
        const { department } = req.query;
        const match = department ? { department } : {};

        const [total, resolved, pending, inProgress, avgRating] = await Promise.all([
            Complaint.countDocuments(match),
            Complaint.countDocuments({ ...match, status: 'Resolved' }),
            Complaint.countDocuments({ ...match, status: 'Pending' }),
            Complaint.countDocuments({ ...match, status: 'In Progress' }),
            Complaint.aggregate([
                { $match: { ...match, citizen_feedback_rating: { $exists: true, $ne: null } } },
                { $group: { _id: null, avg: { $avg: '$citizen_feedback_rating' } } },
            ]),
        ]);

        const byDept = await Complaint.aggregate([
            { $group: { _id: '$department', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);

        const byPriority = await Complaint.aggregate([
            { $group: { _id: '$priority', count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
        ]);

        res.json({
            success: true,
            analytics: {
                total_complaints: total,
                resolved,
                pending,
                in_progress: inProgress,
                avg_citizen_rating: avgRating[0] ? Math.round(avgRating[0].avg * 10) / 10 : 0,
                avg_resolution_hours: 0,
                by_department: byDept,
                by_priority: byPriority,
            },
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
