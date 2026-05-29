/**
 * seedAll.js — Comprehensive database seeder
 * Creates: authority users, NGOs (linked by email), citizens, issues
 * Run: node seedAll.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const NGO = require('./models/NGO');
const Issue = require('./models/Issue');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cleanliness';

// ─── SEED DATA ────────────────────────────────────────────────────────────────

const AUTHORITY_USERS = [
    {
        name: 'GreenForce India',
        email: 'greenforce@civicimpact.in',
        password: 'Authority@123',
        role: 'authority',
        points: 2400,
        totalPointsEarned: 2400,
        level: 5,
        xp: 2400,
        location: 'Mumbai, Maharashtra'
    },
    {
        name: 'CleanRiver NGO',
        email: 'cleanriver@civicimpact.in',
        password: 'Authority@123',
        role: 'authority',
        points: 1800,
        totalPointsEarned: 1800,
        level: 4,
        xp: 1800,
        location: 'Delhi, NCR'
    },
    {
        name: 'EcoShield Foundation',
        email: 'ecoshield@civicimpact.in',
        password: 'Authority@123',
        role: 'authority',
        points: 3100,
        totalPointsEarned: 3100,
        level: 6,
        xp: 3100,
        location: 'Bengaluru, Karnataka'
    }
];

const NGO_PROFILES = [
    {
        email: 'greenforce@civicimpact.in',
        name: 'GreenForce India',
        specialization: 'Waste Management',
        location: { latitude: 19.0760, longitude: 72.8777, address: 'Andheri East, Mumbai, Maharashtra' },
        rating: 4.8,
        averageResponseTime: 1.4,
        resolutionSuccessRate: 92,
        totalIssuesHandled: 148,
        missionStatement: 'Driving zero-waste communities through rapid civic response, advanced recycling infrastructure, and deep community engagement across urban India.',
        foundedYear: 2017,
        headquarters: 'Andheri East, Mumbai, Maharashtra',
        directorName: 'Priya Nair',
        emergencyContact: '+91 98200 11223',
        website: 'https://greenforce.in',
        registrationNumber: 'NGO-MH-2017-04821',
        phone: '+91 22 4956 7800',
        areasOfExpertise: ['Solid Waste', 'Plastics Recycling', 'Urban Sanitation', 'Landfill Remediation'],
        operationalRegions: ['Mumbai Suburban', 'Thane', 'Navi Mumbai'],
        operatingStatus: 'Active',
        isVerified: true,
        points: 4200
    },
    {
        email: 'cleanriver@civicimpact.in',
        name: 'CleanRiver NGO',
        specialization: 'Water Quality',
        location: { latitude: 28.6139, longitude: 77.2090, address: 'Dwarka, New Delhi' },
        rating: 4.6,
        averageResponseTime: 2.1,
        resolutionSuccessRate: 87,
        totalIssuesHandled: 112,
        missionStatement: 'Protecting and restoring urban water bodies by deploying rapid intervention teams for illegal dumping, sewage overflow, and industrial effluent incidents.',
        foundedYear: 2019,
        headquarters: 'Dwarka Sector 12, New Delhi',
        directorName: 'Ramesh Gupta',
        emergencyContact: '+91 98110 44556',
        website: 'https://cleanriver.org.in',
        registrationNumber: 'NGO-DL-2019-07234',
        phone: '+91 11 4567 8900',
        areasOfExpertise: ['Sewage Overflow', 'River Contamination', 'Water Testing', 'Industrial Effluent'],
        operationalRegions: ['Delhi NCR', 'Gurugram', 'Faridabad'],
        operatingStatus: 'Active',
        isVerified: true,
        points: 3100
    },
    {
        email: 'ecoshield@civicimpact.in',
        name: 'EcoShield Foundation',
        specialization: 'Air Quality',
        location: { latitude: 12.9716, longitude: 77.5946, address: 'Indiranagar, Bengaluru, Karnataka' },
        rating: 4.9,
        averageResponseTime: 0.9,
        resolutionSuccessRate: 95,
        totalIssuesHandled: 203,
        missionStatement: 'Safeguarding urban air quality through real-time monitoring, polluter accountability campaigns, and emergency pollution response in Southern India.',
        foundedYear: 2015,
        headquarters: 'Indiranagar, Bengaluru 560038',
        directorName: 'Dr. Kavitha Rao',
        emergencyContact: '+91 97400 88990',
        website: 'https://ecoshield.foundation',
        registrationNumber: 'NGO-KA-2015-01923',
        phone: '+91 80 6789 0123',
        areasOfExpertise: ['Air Pollution', 'Industrial Emissions', 'Traffic Pollution', 'Open Burning'],
        operationalRegions: ['Bengaluru Urban', 'Mysuru', 'Mangaluru'],
        operatingStatus: 'Active',
        isVerified: true,
        points: 5800
    }
];

const CITIZEN_USERS = [
    { name: 'Amit Sharma', email: 'amit@citizen.in', password: 'Citizen@123', role: 'citizen', points: 320, level: 3, xp: 1200, location: 'Mumbai' },
    { name: 'Priya Menon', email: 'priya@citizen.in', password: 'Citizen@123', role: 'citizen', points: 480, level: 4, xp: 1900, location: 'Delhi' },
    { name: 'Karthik Iyer', email: 'karthik@citizen.in', password: 'Citizen@123', role: 'citizen', points: 210, level: 2, xp: 900, location: 'Bengaluru' },
    { name: 'Sunita Patel', email: 'sunita@citizen.in', password: 'Citizen@123', role: 'citizen', points: 670, level: 5, xp: 2400, location: 'Mumbai' },
    { name: 'Rahul Verma', email: 'rahul@citizen.in', password: 'Citizen@123', role: 'citizen', points: 150, level: 1, xp: 600, location: 'Delhi' },
];

// ─── HELPER ───────────────────────────────────────────────────────────────────

async function hashPassword(pw) {
    return bcrypt.hash(pw, 10);
}

function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function seed() {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, { tls: true, serverSelectionTimeoutMS: 15000 });
    console.log('✅ Connected:', mongoose.connection.host);

    // Clear existing data
    console.log('\n🗑  Clearing existing collections...');
    await Promise.all([
        User.deleteMany({}),
        NGO.deleteMany({}),
        Issue.deleteMany({})
    ]);
    console.log('   Done.');

    // ── Create authority users ──
    console.log('\n👤 Creating authority users...');
    const createdAuthUsers = [];
    for (const u of AUTHORITY_USERS) {
        const hash = await hashPassword(u.password);
        const user = await User.create({ ...u, password: hash });
        createdAuthUsers.push(user);
        console.log(`   ✓ ${user.name} (${user.email}) — pwd: ${u.password}`);
    }

    // ── Create NGO profiles linked to authority users ──
    console.log('\n🏢 Creating NGO profiles...');
    const createdNGOs = [];
    for (const ngoData of NGO_PROFILES) {
        const ngo = await NGO.create(ngoData);
        createdNGOs.push(ngo);
        console.log(`   ✓ ${ngo.name} [${ngo.specialization}]`);
    }

    // ── Create citizen users ──
    console.log('\n🙋 Creating citizen users...');
    const createdCitizens = [];
    for (const c of CITIZEN_USERS) {
        const hash = await hashPassword(c.password);
        const user = await User.create({ ...c, password: hash });
        createdCitizens.push(user);
        console.log(`   ✓ ${user.name} (${user.email})`);
    }

    // ── Create issues linked to NGOs ──
    console.log('\n📋 Creating issues...');
    const [greenNGO, riverNGO, ecoNGO] = createdNGOs;
    const [amit, priya, karthik, sunita, rahul] = createdCitizens;

    const ISSUES = [
        // GreenForce — Resolved
        { title: 'Illegal Dumping near Powai Lake', category: 'Illegal Dumping', location: 'Powai, Mumbai', status: 'Resolved', ngoId: greenNGO._id, userId: amit._id, impactScore: 25, dateReported: daysAgo(30), resolvedDate: daysAgo(28), description: 'Large pile of construction debris and household waste dumped near Powai Lake shoreline.' },
        { title: 'Overflowing Garbage Bins at Juhu Beach', category: 'Garbage Dump', location: 'Juhu, Mumbai', status: 'Resolved', ngoId: greenNGO._id, userId: sunita._id, impactScore: 20, dateReported: daysAgo(25), resolvedDate: daysAgo(23), description: 'Municipal bins overflowing for 3 days during peak tourist season.' },
        { title: 'Plastic Waste in Storm Drain', category: 'Illegal Dumping', location: 'Dharavi, Mumbai', status: 'Resolved', ngoId: greenNGO._id, userId: amit._id, impactScore: 18, dateReported: daysAgo(20), resolvedDate: daysAgo(18), description: 'Plastic bags blocking storm drain causing localized flooding.' },
        { title: 'Construction Debris on Footpath', category: 'Illegal Dumping', location: 'BKC, Mumbai', status: 'Resolved', ngoId: greenNGO._id, userId: sunita._id, impactScore: 15, dateReported: daysAgo(15), resolvedDate: daysAgo(13), description: 'Construction material blocking pedestrian access for 1 week.' },
        // GreenForce — Active
        { title: 'Open Waste Burning at Mulund', category: 'Illegal Dumping', location: 'Mulund, Mumbai', status: 'In Progress', ngoId: greenNGO._id, userId: amit._id, impactScore: 22, dateReported: daysAgo(3), description: 'Residents burning mixed waste including plastics, causing toxic smoke.' },
        { title: 'Abandoned Refrigerators Blocking Road', category: 'Illegal Dumping', location: 'Goregaon, Mumbai', status: 'In Progress', ngoId: greenNGO._id, userId: rahul._id, impactScore: 12, dateReported: daysAgo(1), description: 'Five abandoned refrigerators blocking a residential lane.' },

        // CleanRiver — Resolved
        { title: 'Sewage Overflow into Yamuna Tributary', category: 'Water Leakage', location: 'Wazirabad, Delhi', status: 'Resolved', ngoId: riverNGO._id, userId: priya._id, impactScore: 30, dateReported: daysAgo(28), resolvedDate: daysAgo(25), description: 'Sewage pipeline burst causing direct overflow into a Yamuna tributary.' },
        { title: 'Industrial Dye Discharge into Canal', category: 'Other Environmental Issues', location: 'Mayapuri, Delhi', status: 'Resolved', ngoId: riverNGO._id, userId: rahul._id, impactScore: 28, dateReported: daysAgo(22), resolvedDate: daysAgo(20), description: 'Textile factory discharging colored effluent into the Najafgarh drain.' },
        { title: 'Oil Slick on Hauz Khas Lake', category: 'Other Environmental Issues', location: 'Hauz Khas, Delhi', status: 'Resolved', ngoId: riverNGO._id, userId: priya._id, impactScore: 20, dateReported: daysAgo(18), resolvedDate: daysAgo(15), description: 'Visible oil sheen on heritage lake, likely from vehicle workshop nearby.' },
        // CleanRiver — Active
        { title: 'Foam Accumulation in Okhla Wetland', category: 'Other Environmental Issues', location: 'Okhla, Delhi', status: 'In Progress', ngoId: riverNGO._id, userId: priya._id, impactScore: 25, dateReported: daysAgo(4), description: 'Thick white foam accumulating in the Okhla bird sanctuary wetland area.' },
        { title: 'Dead Fish in Sanjay Lake', category: 'Other Environmental Issues', location: 'Trilokpuri, Delhi', status: 'In Progress', ngoId: riverNGO._id, userId: rahul._id, impactScore: 22, dateReported: daysAgo(2), description: 'Mass fish mortality observed, water has strong chemical odor.' },

        // EcoShield — Resolved
        { title: 'Stone Crusher Dust Pollution', category: 'Air Pollution', location: 'Yelahanka, Bengaluru', status: 'Resolved', ngoId: ecoNGO._id, userId: karthik._id, impactScore: 25, dateReported: daysAgo(35), resolvedDate: daysAgo(33), description: 'Unlicensed stone crushing unit generating PM10 levels 5× the safe limit.' },
        { title: 'Paddy Stubble Burning Fields', category: 'Air Pollution', location: 'Devanahalli, Bengaluru', status: 'Resolved', ngoId: ecoNGO._id, userId: karthik._id, impactScore: 20, dateReported: daysAgo(30), resolvedDate: daysAgo(28), description: 'Farmers burning paddy stubble across 15 acres causing severe smoke haze.' },
        { title: 'Diesel Generator Smoke near Hospital', category: 'Air Pollution', location: 'Rajajinagar, Bengaluru', status: 'Resolved', ngoId: ecoNGO._id, userId: sunita._id, impactScore: 22, dateReported: daysAgo(25), resolvedDate: daysAgo(22), description: 'Unfiltered diesel generators operating 24/7 next to a 200-bed hospital.' },
        { title: 'Paint Factory Fumes in Residential Area', category: 'Air Pollution', location: 'Peenya, Bengaluru', status: 'Resolved', ngoId: ecoNGO._id, userId: karthik._id, impactScore: 18, dateReported: daysAgo(18), resolvedDate: daysAgo(15), description: 'VOC emissions from paint factory causing headaches among residents.' },
        { title: 'Vehicle Pollution Check Violation', category: 'Air Pollution', location: 'Koramangala, Bengaluru', status: 'Resolved', ngoId: ecoNGO._id, userId: sunita._id, impactScore: 15, dateReported: daysAgo(12), resolvedDate: daysAgo(10), description: 'Fleet of commercial vehicles operating without valid PUC certificates.' },
        // EcoShield — Active
        { title: 'Black Smoke from Brick Kiln', category: 'Air Pollution', location: 'Hoskote, Bengaluru', status: 'In Progress', ngoId: ecoNGO._id, userId: karthik._id, impactScore: 28, dateReported: daysAgo(5), description: 'Traditional brick kiln burning coal without any emission controls.' },
        { title: 'Hospital Waste Incineration Odor', category: 'Air Pollution', location: 'Jayanagar, Bengaluru', status: 'In Progress', ngoId: ecoNGO._id, userId: sunita._id, impactScore: 20, dateReported: daysAgo(2), description: 'Hospital incinerator operating without scrubber, causing toxic odor.' },
    ];

    for (const issue of ISSUES) {
        await Issue.create(issue);
    }
    console.log(`   ✓ Created ${ISSUES.length} issues across 3 NGOs`);

    // ── Summary ──
    console.log('\n' + '='.repeat(55));
    console.log('✅ DATABASE SEEDED SUCCESSFULLY');
    console.log('='.repeat(55));
    console.log('\n📋 CREDENTIALS TO LOG IN:');
    console.log('\n  AUTHORITY / NGO ACCOUNTS (password: Authority@123)');
    for (const u of AUTHORITY_USERS) {
        console.log(`    Email: ${u.email}`);
    }
    console.log('\n  CITIZEN ACCOUNTS (password: Citizen@123)');
    for (const c of CITIZEN_USERS) {
        console.log(`    Email: ${c.email}`);
    }
    console.log('\n  Use these to log in via the frontend login page.');
    console.log('='.repeat(55) + '\n');

    await mongoose.disconnect();
    process.exit(0);
}

seed().catch(err => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
});
