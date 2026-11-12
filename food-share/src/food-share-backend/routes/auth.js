const express = require("express");
const jwt     = require("jsonwebtoken");
const User    = require("../models/User");
const Donor   = require("../models/Donor");
const NGO     = require("../models/NGO");
const Admin   = require("../models/Admin");
const router  = express.Router();

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET || "foodshare_secret_key_2024", { expiresIn: "7d" });

// ── Validation Helpers ───────────────────────────────────────
function validatePhoneNumber(phone) {
  if (!phone) return { valid: false, message: "Phone number is required." };
  const cleaned = phone.toString().replace(/\D/g, "");
  const tenDigit = cleaned.length === 12 && cleaned.startsWith("91") ? cleaned.slice(2) : cleaned;
  if (!/^[6-9]\d{9}$/.test(tenDigit)) {
    return { valid: false, message: "Phone number must be a valid 10-digit mobile number (e.g. 9876543210)." };
  }
  return { valid: true, sanitized: tenDigit };
}

function validateStrongPassword(password) {
  if (!password || password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter (A-Z)." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter (a-z)." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one digit (0-9)." };
  }
  if (!/[!@#$%^&*(),.?":{}|<>_~-]/.test(password)) {
    return { valid: false, message: "Password must contain at least one special character (!@#$%^&*)." };
  }
  return { valid: true };
}

// ── Seed Default Admin Account once MongoDB is connected ─────
async function ensureDefaultAdmin() {
  try {
    const adminEmail = "admin@foodshare.org";
    const existingAdmin = await Admin.findOne({ email: adminEmail });
    if (!existingAdmin) {
      await Admin.create({
        name: "Platform Administrator",
        email: adminEmail,
        password: "Admin@FoodShare2024!",
        phone: "9876543210",
        role: "admin",
      });
      // Also ensure in User collection for foreign key relations
      const existingUser = await User.findOne({ email: adminEmail });
      if (!existingUser) {
        await User.create({
          name: "Platform Administrator",
          email: adminEmail,
          password: "Admin@FoodShare2024!",
          phone: "9876543210",
          role: "admin",
        });
      }
      console.log("🛡️ Default Admin account initialized: admin@foodshare.org / Admin@FoodShare2024!");
    }
  } catch (err) {
    console.warn("Could not ensure default admin:", err.message);
  }
}

const mongoose = require("mongoose");
mongoose.connection.on("connected", () => {
  ensureDefaultAdmin();
});

// ── Register (Routes to separate Donor, NGO, or Admin collection) ──
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, role = "donor", orgName, city, pickupAddress, peopleCount, foodQuantity, foodType, urgency, daysActive, message } = req.body;

    if (!email) return res.status(400).json({ message: "Email is required." });
    const cleanEmail = email.toString().toLowerCase().trim();

    // 1. Phone validation (10 digits)
    const phoneCheck = validatePhoneNumber(phone);
    if (!phoneCheck.valid) {
      return res.status(400).json({ message: phoneCheck.message });
    }
    const cleanPhone = phoneCheck.sanitized;

    // 2. Strong password validation
    const passCheck = validateStrongPassword(password);
    if (!passCheck.valid) {
      return res.status(400).json({ message: passCheck.message });
    }

    // Check if email already registered across collections
    const [donorExists, ngoExists, adminExists, userExists] = await Promise.all([
      Donor.findOne({ email: cleanEmail }),
      NGO.findOne({ email: cleanEmail }),
      Admin.findOne({ email: cleanEmail }),
      User.findOne({ email: cleanEmail }),
    ]);

    if (donorExists || ngoExists || adminExists || userExists) {
      return res.status(400).json({ message: "Email already registered. Please log in." });
    }

    let createdRecord = null;
    let assignedRole = role;

    // Store in separate database collections based on role
    if (role === "admin") {
      createdRecord = await Admin.create({
        name: name || "Admin",
        email: cleanEmail,
        password,
        phone: cleanPhone,
        role: "admin",
      });
      assignedRole = "admin";
    } else if (role === "ngo") {
      createdRecord = await NGO.create({
        orgName: orgName || name || "NGO Partner",
        name: name || orgName || "Contact Person",
        email: cleanEmail,
        password,
        phone: cleanPhone,
        city: city || "Kanchipuram",
        pickupAddress: pickupAddress || "",
        peopleCount: parseInt(peopleCount) || 0,
        foodQuantity: parseInt(foodQuantity) || 0,
        foodType: foodType || "veg",
        urgency: urgency || "medium",
        daysActive: parseInt(daysActive) || 7,
        message: message || "",
        role: "ngo",
      });
      assignedRole = "ngo";
    } else {
      // Default: Donor
      createdRecord = await Donor.create({
        name: name || "Food Donor",
        email: cleanEmail,
        password,
        phone: cleanPhone,
        city: city || "Kanchipuram",
        address: pickupAddress || "",
        role: "donor",
      });
      assignedRole = "donor";
    }

    // Synchronize to User collection so existing foreign-key refs work
    try {
      await User.create({
        name: name || orgName,
        email: cleanEmail,
        password,
        phone: cleanPhone,
        role: assignedRole,
        orgName: orgName || "",
        city: city || "Kanchipuram",
      });
    } catch (e) {
      // Ignore if user collection had duplicate
    }

    const token = sign(createdRecord._id);
    res.status(201).json({
      success: true,
      token,
      user: {
        id: createdRecord._id,
        name: createdRecord.name || createdRecord.orgName,
        email: createdRecord.email,
        phone: cleanPhone,
        role: assignedRole,
        orgName: createdRecord.orgName || "",
        city: createdRecord.city || "Kanchipuram",
      },
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: err.message || "Registration failed" });
  }
});

// ── Login (Checks Admin, NGO, and Donor collections) ─────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const cleanEmail = email.toString().toLowerCase().trim();

    // 0. Guaranteed Default Admin Login (always works even if database is fresh)
    if (cleanEmail === "admin@foodshare.org" && password === "Admin@FoodShare2024!") {
      let adminUser = await Admin.findOne({ email: "admin@foodshare.org" });
      if (!adminUser) {
        try {
          adminUser = await Admin.create({
            name: "Platform Administrator",
            email: "admin@foodshare.org",
            password: "Admin@FoodShare2024!",
            phone: "9876543210",
            role: "admin",
          });
        } catch (e) {
          adminUser = { _id: "admin_master_id", name: "Platform Administrator", email: "admin@foodshare.org", phone: "9876543210", role: "admin" };
        }
      }
      return res.json({
        success: true,
        token: sign(adminUser._id),
        user: {
          id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          phone: adminUser.phone,
          role: "admin",
        },
      });
    }

    // 1. Check Admin collection
    const adminUser = await Admin.findOne({ email: cleanEmail });
    if (adminUser && (await adminUser.matchPassword(password))) {
      return res.json({
        success: true,
        token: sign(adminUser._id),
        user: {
          id: adminUser._id,
          name: adminUser.name,
          email: adminUser.email,
          phone: adminUser.phone,
          role: "admin",
        },
      });
    }

    // 2. Check NGO collection
    const ngoUser = await NGO.findOne({ email: cleanEmail });
    if (ngoUser && (await ngoUser.matchPassword(password))) {
      return res.json({
        success: true,
        token: sign(ngoUser._id),
        user: {
          id: ngoUser._id,
          name: ngoUser.name || ngoUser.orgName,
          email: ngoUser.email,
          phone: ngoUser.phone,
          role: "ngo",
          orgName: ngoUser.orgName,
          city: ngoUser.city,
        },
      });
    }

    // 3. Check Donor collection
    const donorUser = await Donor.findOne({ email: cleanEmail });
    if (donorUser && (await donorUser.matchPassword(password))) {
      return res.json({
        success: true,
        token: sign(donorUser._id),
        user: {
          id: donorUser._id,
          name: donorUser.name,
          email: donorUser.email,
          phone: donorUser.phone,
          role: "donor",
          city: donorUser.city,
        },
      });
    }

    // 4. Fallback to general User collection (for legacy users)
    const generalUser = await User.findOne({ email: cleanEmail });
    if (generalUser && (await generalUser.matchPassword(password))) {
      return res.json({
        success: true,
        token: sign(generalUser._id),
        user: {
          id: generalUser._id,
          name: generalUser.name,
          email: generalUser.email,
          phone: generalUser.phone,
          role: generalUser.role || "donor",
          orgName: generalUser.orgName,
          city: generalUser.city,
        },
      });
    }

    return res.status(401).json({ message: "Invalid email or password." });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: err.message || "Login failed" });
  }
});

module.exports = router;
