const mongoose = require("mongoose");

const shipmentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    rewardId:    { type: String, required: true },
    rewardTitle: { type: String, required: true },
    rewardType:  { type: String, required: true },
    pointsSpent: { type: Number, required: true },

    // Delivery details
    recipientName:  { type: String, required: true },
    phone:          { type: String, required: true },
    addressLine1:   { type: String, required: true },
    addressLine2:   { type: String, default: "" },
    city:           { type: String, required: true },
    state:          { type: String, required: true },
    postalCode:     { type: String, required: true },
    country:        { type: String, required: true },

    // Tracking
    trackingNumber: {
        type: String,
        default: () => "CC" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase()
    },
    status: {
        type: String,
        enum: ["Order Placed", "Processing", "Packed", "Shipped", "Out for Delivery", "Delivered", "Cancelled"],
        default: "Order Placed"
    },
    estimatedDelivery: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    },
    trackingHistory: [
        {
            status:    { type: String },
            message:   { type: String },
            timestamp: { type: Date, default: Date.now }
        }
    ]
}, { timestamps: true });

// Auto-populate tracking history on create
shipmentSchema.pre("save", function (next) {
    if (this.isNew && this.trackingHistory.length === 0) {
        this.trackingHistory = [
            { status: "Order Placed", message: "Your order has been received and is being confirmed.", timestamp: new Date() }
        ];
    }
    next();
});

module.exports = mongoose.model("Shipment", shipmentSchema);
