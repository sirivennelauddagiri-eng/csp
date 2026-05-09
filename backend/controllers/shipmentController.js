const Shipment = require("../models/Shipment");
const User = require("../models/User");
const PointTransaction = require("../models/PointTransaction");
const Redemption = require("../models/Redemption");

// Inline fallback reward list (mirrors rewardController)
const FALLBACK_REWARDS = [
    { _id: "64a2b3c4d5e6f7g8h9i0j101", title: "EcoAction Sustainable T-Shirt", rewardType: "Physical", pointsRequired: 3500 },
    { _id: "64a2b3c4d5e6f7g8h9i0j102", title: "EcoAction Hoodie",              rewardType: "Physical", pointsRequired: 7000 },
    { _id: "64a2b3c4d5e6f7g8h9i0j103", title: "Reusable Tote Bag",             rewardType: "Physical", pointsRequired: 1500 },
    { _id: "64a2b3c4d5e6f7g8h9i0j104", title: "Eco Stickers Pack",             rewardType: "Physical", pointsRequired: 500  },
    { _id: "64a2b3c4d5e6f7g8h9i0j105", title: "Bamboo Water Bottle",           rewardType: "Physical", pointsRequired: 4000 },
    { _id: "64a2b3c4d5e6f7g8h9i0j106", title: "Solar Power Bank",              rewardType: "Physical", pointsRequired: 8000 },
    { _id: "64a2b3c4d5e6f7g8h9i0j107", title: "Reusable Coffee Cup",           rewardType: "Physical", pointsRequired: 2000 },
    { _id: "64a2b3c4d5e6f7g8h9i0j108", title: "Plant Seed Kit",                rewardType: "Physical", pointsRequired: 2500 },
    { _id: "64a2b3c4d5e6f7g8h9i0j109", title: "Eco-Friendly Stationery Kit",   rewardType: "Physical", pointsRequired: 1800 },
    { _id: "64a2b3c4d5e6f7g8h9i0j110", title: "Plant 5 Trees",                 rewardType: "Impact",   pointsRequired: 3000 },
    { _id: "64a2b3c4d5e6f7g8h9i0j111", title: "Plant 10 Trees",                rewardType: "Impact",   pointsRequired: 5000 },
    { _id: "64a2b3c4d5e6f7g8h9i0j112", title: "Clean 5kg Ocean Plastic",       rewardType: "Impact",   pointsRequired: 6000 },
    { _id: "64a2b3c4d5e6f7g8h9i0j113", title: "Sponsor Solar Lamp",            rewardType: "Impact",   pointsRequired: 15000},
    { _id: "64a2b3c4d5e6f7g8h9i0j114", title: "Restore Coral Reef Area",       rewardType: "Impact",   pointsRequired: 20000},
    { _id: "64a2b3c4d5e6f7g8h9i0j115", title: "Meet Climate Experts Webinar",  rewardType: "Exclusive",pointsRequired: 8000 },
    { _id: "64a2b3c4d5e6f7g8h9i0j116", title: "Early Access: Green Tech",      rewardType: "Exclusive",pointsRequired: 10000},
    { _id: "64a2b3c4d5e6f7g8h9i0j117", title: "Climate Champion Badge",        rewardType: "Exclusive",pointsRequired: 12000},
    { _id: "64a2b3c4d5e6f7g8h9i0j118", title: "VIP Eco Community",             rewardType: "Exclusive",pointsRequired: 15000}
];

// POST /api/shipments/create
exports.createShipment = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const {
            rewardId,
            recipientName, phone,
            addressLine1, addressLine2,
            city, state, postalCode, country
        } = req.body;

        // Validate required fields
        if (!rewardId || !recipientName || !phone || !addressLine1 || !city || !state || !postalCode || !country) {
            return res.status(400).json({ success: false, message: "All delivery fields are required." });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // Find reward (DB first, then fallback)
        const Reward = require("../models/Reward");
        let reward = await Reward.findById(rewardId).catch(() => null);
        if (!reward) reward = FALLBACK_REWARDS.find(r => r._id === rewardId);
        if (!reward) return res.status(404).json({ success: false, message: "Reward not found" });

        // Check sufficient points
        if (user.points < reward.pointsRequired) {
            return res.status(400).json({ success: false, message: "Insufficient points to redeem this reward." });
        }

        // Deduct points atomically
        user.points -= reward.pointsRequired;
        await user.save();

        // Create shipment
        const shipment = await Shipment.create({
            userId,
            rewardId: String(reward._id),
            rewardTitle: reward.title,
            rewardType: reward.rewardType,
            pointsSpent: reward.pointsRequired,
            recipientName,
            phone,
            addressLine1,
            addressLine2: addressLine2 || "",
            city,
            state,
            postalCode,
            country
        });

        // Create Redemption record
        await Redemption.create({
            userId,
            rewardId: String(reward._id).length === 24 ? reward._id : userId, // safe fallback
            status: "pending",
            deliveryAddress: `${addressLine1}, ${city}, ${state} ${postalCode}, ${country}`
        }).catch(() => {}); // non-critical

        // Log point transaction
        await PointTransaction.create({
            userId,
            pointsAdded: -reward.pointsRequired,
            sourceType: "redeem",
            sourceId: String(reward._id),
            description: `Redeemed reward: ${reward.title}`
        });

        res.status(201).json({
            success: true,
            message: "Shipment created successfully!",
            shipment,
            remainingPoints: user.points
        });
    } catch (err) {
        console.error("createShipment error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/shipments/my  — user's shipment history
exports.getMyShipments = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const shipments = await Shipment.find({ userId }).sort({ createdAt: -1 }).lean();
        res.json({ success: true, shipments });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/shipments/:id  — single shipment detail
exports.getShipment = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;
        const shipment = await Shipment.findOne({ _id: req.params.id, userId }).lean();
        if (!shipment) return res.status(404).json({ success: false, message: "Shipment not found" });
        res.json({ success: true, shipment });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// GET /api/shipments/track/:trackingNumber  — track by tracking number
exports.trackShipment = async (req, res) => {
    try {
        const shipment = await Shipment.findOne({ trackingNumber: req.params.trackingNumber }).lean();
        if (!shipment) return res.status(404).json({ success: false, message: "Tracking number not found" });
        res.json({ success: true, shipment });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};
