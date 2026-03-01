const crypto = require('crypto');
const Official = require('../models/Official');

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

const OFFICIALS_DATA = [
    { username: 'admin@gov.in', password: 'Admin@123', govt_id: 'ADMIN001', name: 'System Administrator', department: 'General_Admin_Dept', email: 'admin@gov.in' },
    { username: 'water.official', password: 'Water@123', govt_id: 'WAT001', name: 'Water Supply Manager', department: 'Water_Supply_Dept', email: 'water@gov.in' },
    { username: 'roads.official', password: 'Roads@123', govt_id: 'RDS001', name: 'Public Works Manager', department: 'Public_Works_Dept', email: 'roads@gov.in' },
    { username: 'sanitation.official', password: 'Sanit@123', govt_id: 'SAN001', name: 'Sanitation Manager', department: 'Sanitation_Dept', email: 'sanitation@gov.in' },
    { username: 'power.official', password: 'Power@123', govt_id: 'PWR001', name: 'Power Dept Manager', department: 'Power_Dept', email: 'power@gov.in' },
    { username: 'health.official', password: 'Health@123', govt_id: 'HLT001', name: 'Health Dept Manager', department: 'Health_Dept', email: 'health@gov.in' },
];

async function seedOfficials() {
    try {
        console.log('🌱 Seeding officials...');
        for (const off of OFFICIALS_DATA) {
            const exists = await Official.findOne({ username: off.username });
            if (!exists) {
                await Official.create({
                    username: off.username,
                    password_hash: hashPassword(off.password),
                    govt_id: off.govt_id,
                    name: off.name,
                    department: off.department,
                    email: off.email,
                });
                console.log(`  ✅ Created: ${off.username} (${off.department})`);
            } else {
                console.log(`  ⏭️  Exists: ${off.username}`);
            }
        }
        console.log('✅ Seeding complete!');
        console.log('\n📋 Official Credentials:');
        OFFICIALS_DATA.forEach(o => console.log(`  ${o.username} | ${o.password} | ${o.department}`));
    } catch (err) {
        console.error('❌ Seed error:', err.message);
    }
}

module.exports = seedOfficials;

// Run directly if called as script
if (require.main === module) {
    const mongoose = require('mongoose');
    require('dotenv').config();
    mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jan-samadhaan')
        .then(async () => {
            await seedOfficials();
            process.exit(0);
        })
        .catch(err => { console.error(err); process.exit(1); });
}
