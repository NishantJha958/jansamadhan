const SLA_TIMES = { 1: 2, 2: 4, 3: 8, 4: 12, 5: 24, 6: 48, 7: 72, 8: 96, 9: 120, 10: 168 };

function checkSlaStatus(complaint) {
    try {
        if (['Resolved', 'Rejected'].includes(complaint.status)) return 'NONE';
        const deadline = new Date(complaint.sla_deadline);
        const now = new Date();
        const slaHours = complaint.sla_hours || 24;
        const remainingHours = (deadline - now) / 3600000;
        const percent = (1 - remainingHours / slaHours) * 100;
        if (percent >= 100) return 'OVERDUE';
        if (percent >= 90) return 'CRITICAL';
        if (percent >= 75) return 'URGENT';
        if (percent >= 50) return 'WARNING';
        return 'NONE';
    } catch {
        return 'NONE';
    }
}

module.exports = { checkSlaStatus, SLA_TIMES };
