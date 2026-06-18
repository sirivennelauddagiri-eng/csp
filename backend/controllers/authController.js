const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Simple in-process TTL cache for /auth/me — avoids a DB round-trip on
// every page load when the user data hasn't changed.
const meCache = new Map(); // { userId -> { data, expiresAt } }
const ME_TTL_MS = 30 * 1000; // 30 seconds

exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Only fetch what we need to check existence (lean, single field)
        const userExists = await User.findOne({ email }).select("_id").lean();
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role: role || "citizen"
        });

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(201).json({ token, role: user.role });

    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Select only the fields we actually need for login
        const user = await User.findOne({ email })
            .select("_id name email role password points level xp co2Saved avatarUrl location")
            .lean();

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        if (user.role !== role) {
            return res.status(400).json({ message: "Wrong account type selected" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid password" });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        // Fetch issues reported count
        const issuesReported = await require("../models/Issue").countDocuments({
            $or: [{ userId: user._id }, { reportedBy: user._id }]
        });

        // Warm the me-cache immediately so the first /auth/me after login
        // is served from memory rather than hitting the DB again
        const safeUser = { ...user, issuesReported };
        delete safeUser.password;
        meCache.set(String(user._id), { data: safeUser, expiresAt: Date.now() + ME_TTL_MS });

        res.json({ token, role: user.role });

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

exports.getMe = async (req, res) => {
    try {
        const userId = String(req.user._id || req.user.id);

        // Serve from in-memory cache if still fresh
        const cached = meCache.get(userId);
        if (cached && Date.now() < cached.expiresAt) {
            return res.json(cached.data);
        }

        // Cache miss — hit DB once, use .lean() for speed
        const user = await User.findById(userId).select("-password").lean();
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Add issuesReported
        const issuesReported = await require("../models/Issue").countDocuments({
            $or: [{ userId: userId }, { reportedBy: userId }]
        });
        user.issuesReported = issuesReported;

        meCache.set(userId, { data: user, expiresAt: Date.now() + ME_TTL_MS });
        res.json(user);

    } catch (error) {
        console.error("getMe error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const user = await User.findById(req.user._id || req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        if (req.body.location !== undefined) user.location = req.body.location;
        if (req.body.avatarUrl !== undefined) user.avatarUrl = req.body.avatarUrl;

        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(req.body.password, salt);
        }

        const updatedUser = await user.save();

        // Invalidate the me-cache for this user
        meCache.delete(String(updatedUser._id));

        const token = jwt.sign(
            { id: updatedUser._id, role: updatedUser.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            location: updatedUser.location,
            avatarUrl: updatedUser.avatarUrl,
            token
        });

    } catch (error) {
        console.error("updateUser error:", error);
        res.status(500).json({ message: "Server error" });
    }
};

exports.googleLogin = async (req, res) => {
    try {
        const { googleToken, role } = req.body;
        // In a production app, use google-auth-library to verify the signature.
        // For this project, jwt.decode Extracts payload to identify the user.
        const decoded = jwt.decode(googleToken);
        if (!decoded || !decoded.email) {
            return res.status(400).json({ message: "Invalid Google Token" });
        }

        let user = await User.findOne({ email: decoded.email }).select("_id name email role password points level xp co2Saved").lean();
        
        if (!user) {
            const userDoc = await User.create({
                name: decoded.name,
                email: decoded.email,
                role: role || "citizen",
                password: "GOOGLE_AUTH_" + Math.random().toString(36).substring(7)
            });
            user = { _id: userDoc._id, name: userDoc.name, email: userDoc.email, role: userDoc.role };
        }

        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        meCache.set(String(user._id), { data: user, expiresAt: Date.now() + ME_TTL_MS });

        res.json({
            success: true,
            token,
            user: {
                name: user.name,
                email: user.email
            }
        });
    } catch (err) {
        console.error("Google Login Backend Error:", err);
        res.status(500).json({ message: "Server error during Google Login", success: false });
    }
};