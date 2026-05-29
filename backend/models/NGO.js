const mongoose = require('mongoose');

const NGOSchema = new mongoose.Schema({
    name: { type: String, required: true },
    specialization: { type: String, required: true },
    location: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        address: { type: String }
    },
    totalIssuesHandled: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    averageResponseTime: { type: Number, default: 0 }, // in hours
    resolutionSuccessRate: { type: Number, default: 0 }, // percentage
    points: { type: Number, default: 0 },
    // Detailed Profile Fields
    logo: { type: String },
    missionStatement: { type: String },
    foundedYear: { type: Number },
    headquarters: { type: String },
    areasOfExpertise: [{ type: String }],
    extendedExpertise: [{ type: String }],
    certifications: [{ type: String }],
    operationalRegions: [{ type: String }],
    operatingStatus: { type: String, enum: ['Active', 'Busy', 'Offline'], default: 'Active' },
    isVerified: { type: Boolean, default: true },
    // Team & Contact
    directorName: { type: String },
    emergencyContact: { type: String },
    email: { type: String },
    website: { type: String },
    registrationNumber: { type: String },
    phone: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('NGO', NGOSchema);
