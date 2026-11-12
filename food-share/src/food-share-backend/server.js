
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// ---------------- MIDDLEWARE ----------------

app.use(cors({
    origin: process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(",").map(url => url.trim())
        : true,
    credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(
    path.join(__dirname, "uploads")
));

// ---------------- MONGODB CONNECTION ----------------

async function connectDB() {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI environment variable is missing");
    }

    if (mongoose.connection.readyState === 1) {
        return;
    }

    if (!global.mongooseCache) {
        global.mongooseCache = {
            promise: null
        };
    }

    if (!global.mongooseCache.promise) {
        global.mongooseCache.promise = mongoose.connect(
            process.env.MONGO_URI,
            { serverSelectionTimeoutMS: 10000 }
        ).catch(error => {
            global.mongooseCache.promise = null;
            throw error;
        });
    }

    await global.mongooseCache.promise;
}

// ---------------- HEALTH CHECK ----------------

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "FoodShare API running successfully"
    });
});

app.get("/api/health", async (req, res) => {
    try {
        await connectDB();

        res.status(200).json({
            success: true,
            message: "Backend is healthy",
            database: "Connected"
        });
    } catch (error) {
        console.error("MongoDB connection error:", error.message);

        res.status(503).json({
            success: false,
            message: "MongoDB connection failed",
            database: "Disconnected"
        });
    }
});

// ---------------- DATABASE MIDDLEWARE ----------------

app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error("Database error:", error.message);

        res.status(503).json({
            success: false,
            message: "Database connection unavailable"
        });
    }
});

// ---------------- ROUTES ----------------

app.use("/api/auth", require("./routes/auth"));
app.use("/api/receivers", require("./routes/receivers"));
app.use("/api/donations", require("./routes/donations"));
app.use("/api/needposts", require("./routes/needPosts"));
app.use("/api/certificates", require("./routes/certificates"));

// ---------------- ERROR HANDLER ----------------

app.use((err, req, res, next) => {
    console.error("Server error:", err);

    res.status(err.status || 500).json({
        success: false,
        message: "Internal server error"
    });
});

// ---------------- EXPORT ----------------

module.exports = app;

// Local development
if (require.main === module) {
    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
        console.log(`FoodShare server running on port ${PORT}`);
    });
}
