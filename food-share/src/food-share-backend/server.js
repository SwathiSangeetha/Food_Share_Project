const express    = require("express");
const mongoose   = require("mongoose");
const cors       = require("cors");
const path       = require("path");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded certificates statically
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Connect MongoDB ──────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

// ── Routes ───────────────────────────────────────────────────
app.use("/api/auth",         require("./routes/auth"));
app.use("/api/receivers",    require("./routes/receivers"));
app.use("/api/donations",    require("./routes/donations"));
app.use("/api/needposts",    require("./routes/needPosts"));
app.use("/api/certificates", require("./routes/certificates"));

app.get("/", (req, res) => res.json({ message: "FoodShare API running ✅" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));