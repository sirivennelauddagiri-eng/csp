require("dotenv").config();
require("./dns-patch");
const express = require("express");
const http = require("http");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const { Server } = require("socket.io");
const https = require("https"); // built-in — no extra dep needed

const connectDB = require("./config/db");

const app = express();
const server = http.createServer(app);

// Connect Database
connectDB();

// -----------------------------
// Security & Middleware
// -----------------------------
app.use(helmet());
app.use(compression({ level: 6, threshold: 1024 })); // compress responses > 1 KB

app.use(cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// -----------------------------
// Socket.io Setup
// -----------------------------
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "*",
        methods: ["GET", "POST"]
    },
    // Tune transports: try WebSocket first, fall back to polling
    transports: ["websocket", "polling"],
    pingTimeout: 30000,
    pingInterval: 25000
});

app.locals.io = io;

io.on("connection", (socket) => {
    // Only log in development to avoid console noise in production
    if (process.env.NODE_ENV !== "production") {
        console.log("Client connected:", socket.id);
    }

    socket.on("join_room",  (room) => socket.join(room));
    socket.on("leave_room", (room) => socket.leave(room));

    socket.on("typing",      ({ room, user }) => socket.to(room).emit("typing",      user));
    socket.on("stop_typing", ({ room, user }) => socket.to(room).emit("stop_typing", user));

    socket.on("chat_message", (msg) => io.to("global_ngo_network").emit("chat_message", msg));

    // Message deletion — re-broadcast to the room so all clients update their UI
    socket.on("delete_message", ({ msgId, room }) => {
        const targetRoom = room || "global_ngo_network";
        io.to(targetRoom).emit("delete_message", { msgId });
    });

    socket.on("disconnect", () => {
        if (process.env.NODE_ENV !== "production") {
            console.log("Client disconnected:", socket.id);
        }
    });
});

// -----------------------------
// API Routes
// -----------------------------
app.use("/api/auth",       require("./routes/authRoutes"));
app.use("/api/issues",     require("./routes/citizenRoutes"));
app.use("/api/ai",         require("./routes/aiRoutes"));
app.use("/api/donations",  require("./routes/donationRoutes"));
app.use("/api/rewards",    require("./routes/rewardRoutes"));
app.use("/api/user",       require("./routes/userRoutes"));
app.use("/api/projects",   require("./routes/projectRoutes"));
app.use("/api/impact",     require("./routes/impactRoutes"));
app.use("/api/community",  require("./routes/communityRoutes"));
app.use("/api/authority",  require("./routes/authorityRoutes"));
app.use("/api/ngo",        require("./routes/ngoRoutes"));
app.use("/api/reports",    require("./routes/reportRoutes"));
app.use("/api/shipments",  require("./routes/shipmentRoutes"));
app.use("/api/audit",      require("./routes/auditRoutes"));
app.use("/api/operations", require("./routes/operationsRoutes"));

// -----------------------------
// Health & Ping Routes
// -----------------------------
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Public Space Cleanliness System API is running"
    });
});

// /ping — lightweight uptime check (used by external monitors + self-warm)
// Returns in < 5ms — no DB, no auth
app.get("/ping", (req, res) => {
    res.status(200).json({ pong: true, ts: Date.now() });
});

// -----------------------------
// Self-Warm: prevent Render cold starts
// Pings itself every 14 minutes so the free-tier dyno stays alive.
// Only active in production to avoid noise during local dev.
// -----------------------------
if (process.env.NODE_ENV === "production") {
    const BACKEND_URL = process.env.RENDER_EXTERNAL_URL ||
        "https://public-space-cleanliness-system-backend.onrender.com";

    const selfPing = () => {
        https.get(`${BACKEND_URL}/ping`, (res) => {
            res.resume(); // discard body, we only care about keeping alive
        }).on("error", (err) => {
            console.error("Self-ping failed:", err.message);
        });
    };

    // Start pinging after 5 minutes (allow server to fully boot first)
    setTimeout(() => {
        selfPing();
        setInterval(selfPing, 14 * 60 * 1000); // every 14 minutes
    }, 5 * 60 * 1000);

    console.log("Self-warm enabled — pinging every 14 minutes to prevent cold starts.");
}

// -----------------------------
// Global Error Handler
// -----------------------------
app.use((err, req, res, next) => {
    console.error("Server Error:", err.message || err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
});

// -----------------------------
// Start Server
// -----------------------------
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
});