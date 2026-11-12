// ── donations.js ──────────────────────────────────────────────
const express  = require("express");
const Donation = require("../models/Donation");
const Receiver = require("../models/Receiver");
const Donor    = require("../models/Donor");
const router   = express.Router();

// POST /api/donations — create donation + mark receiver as served
router.post("/", async (req, res) => {
  try {
    const { matchedReceiverId, ...rest } = req.body;
    const donation = await Donation.create({
      ...rest,
      matchedReceiver: matchedReceiverId,
      status: "assigned",
    });

    // Also store/update donor record in the Donor collection
    if (rest.donorEmail) {
      try {
        await Donor.findOneAndUpdate(
          { email: rest.donorEmail },
          {
            $setOnInsert: {
              name: rest.donorName || "Food Donor",
              password: "Donor@User2024!", // placeholder if not registered via login
              phone: rest.donorPhone || "9876543210",
              city: rest.city || "Kanchipuram",
              address: rest.pickupAddress || "",
              role: "donor",
            },
            $inc: { donationsCount: 1 },
          },
          { upsert: true, new: true }
        );
      } catch (donorErr) {
        console.warn("Could not upsert donor collection record:", donorErr.message);
      }
    }

    // Mark receiver as served today
    if (matchedReceiverId) {
      const today = new Date().toISOString().split("T")[0];
      await Receiver.findByIdAndUpdate(matchedReceiverId, {
        servedToday: true,
        lastServedDate: today,
        inNeed: false,
      });
    }

    res.json({ success: true, donation });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/donations — all donations
router.get("/", async (req, res) => {
  try {
    const donations = await Donation.find()
      .populate("matchedReceiver", "name type city address")
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(donations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/donations/:id/status
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const donation = await Donation.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    );
    res.json(donation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;