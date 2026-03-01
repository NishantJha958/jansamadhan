const Complaint = require('../models/Complaint');

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = deg => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function checkDuplicateComplaints(lat, lon, category, radiusMeters = 20) {
    try {
        const complaints = await Complaint.find({
            latitude: { $exists: true, $ne: null },
            longitude: { $exists: true, $ne: null },
            status: { $nin: ['Resolved', 'Rejected'] },
        }).select('_id category description latitude longitude created_at status citizen_name priority');

        const nearby = [];
        for (const c of complaints) {
            const dist = haversineDistance(parseFloat(lat), parseFloat(lon), c.latitude, c.longitude);
            if (dist <= radiusMeters && (c.category === category || !category)) {
                nearby.push({
                    id: c._id,
                    category: c.category,
                    description: c.description?.substring(0, 100) + (c.description?.length > 100 ? '...' : ''),
                    distance: Math.round(dist * 10) / 10,
                    created_at: c.created_at,
                    status: c.status,
                    citizen_name: c.citizen_name,
                    priority: c.priority,
                });
            }
        }
        return nearby.sort((a, b) => a.distance - b.distance);
    } catch (err) {
        console.error('Duplicate check error:', err.message);
        return [];
    }
}

module.exports = { checkDuplicateComplaints, haversineDistance };
