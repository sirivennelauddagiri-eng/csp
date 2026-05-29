const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(
            process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cleanliness",
            {
                maxPoolSize: 10,           // allow up to 10 concurrent DB operations
                serverSelectionTimeoutMS: 10000, // fail fast if Atlas is unreachable
                socketTimeoutMS: 45000,    // prevent hanging queries
                tls: true                  // required for Atlas direct replica set connections
            }
        );
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
