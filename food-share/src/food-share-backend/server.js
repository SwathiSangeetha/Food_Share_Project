
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

// ---------------- STATIC FILES ----------------

// Local development only.
// Use cloud storage for permanent uploaded certificates in production.
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ---------------- MONGODB CONNECTION ----------------

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected successfully"))
    .catch(err => console.error("MongoDB connection error:", err));

// ---------------- ROUTES ----------------

app.use("/api/auth", require("./routes/auth"));
app.use("/api/receivers", require("./routes/receivers"));
app.use("/api/donations", require("./routes/donations"));
app.use("/api/needposts", require("./routes/needPosts"));
app.use("/api/certificates", require("./routes/certificates"));

// ---------------- HEALTH CHECK ----------------

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "FoodShare API running successfully"
    });
});

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Backend is healthy",
        database: mongoose.connection.readyState === 1
            ? "Connected"
            : "Disconnected"
    });
});

// ---------------- ERROR HANDLER ----------------

app.use((err, req, res, next) => {
    console.error("Server error:", err);

    res.status(err.status || 500).json({
        success: false,
        message: "Internal server error"
    });
});

// ---------------- EXPORT / LOCAL SERVER ----------------

// Vercel uses the exported Express application.
module.exports = app;

// Local development
if (require.main === module) {
    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
        console.log(`FoodShare server running on port ${PORT}`);
    });
}
