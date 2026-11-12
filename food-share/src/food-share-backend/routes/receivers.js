const express  = require("express");
const Receiver = require("../models/Receiver");
const router   = express.Router();

// ── Haversine distance (km) ───────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

// ── ML Scoring ────────────────────────────────────────────────
// Scores each receiver based on EXACT distance from donor's geocoded lat/lng
// This is the core ML function — location-based, not city-based
function mlScore(receiver, donorLat, donorLng, qty, foodType) {
  let score = 100;

  // Reset servedToday if it's a new day
  const today = new Date().toISOString().split("T")[0];
  if (receiver.lastServedDate !== today) {
    receiver.servedToday = false;
  }

  // ── Serving history ───────────────────────────────────────
  if (receiver.servedToday) score -= 80;          // already served → deprioritise

  // ── Need signals ──────────────────────────────────────────
  if (receiver.inNeed) score += 35;               // NGO posted need on homepage
  if (receiver.inNeed && receiver.needUrgency === "high")   score += 20;
  if (receiver.inNeed && receiver.needUrgency === "medium") score += 10;

  // ── Food type compatibility ───────────────────────────────
  if (foodType === "nonveg" && receiver.type === "temple")   score -= 100;
  if (foodType === "nonveg" && receiver.type === "hospital") score -= 80;
  if (!receiver.accepts.includes(foodType) &&
      !receiver.accepts.includes("nonveg"))                  score -= 60;

  // ── Quantity matching ─────────────────────────────────────
  if (qty >= 50 && receiver.type !== "ngo")    score -= 25;  // large qty → NGO preferred
  if (qty < 20  && receiver.type === "hospital") score += 10; // small qty → hospital good

  // ── Distance penalty (KEY: based on EXACT lat/lng) ────────
  // Closer receivers get higher scores — this is what makes ML location-aware
  const distKm = haversine(donorLat, donorLng, receiver.lat, receiver.lng);
  const distPenalty = Math.min(distKm * 8, 90);  // -8 per km, max -90
  score -= distPenalty;

  return {
    score:       Math.max(0, Math.round(score)),
    distanceKm:  distKm,
  };
}

// ── GET /api/receivers/nearby ─────────────────────────────────
// IMPORTANT: This searches ALL receivers in DB by proximity to
// the donor's EXACT geocoded lat/lng — NOT filtered by city name.
// The city param is used as a HINT to narrow results when needed,
// but the primary ranking is always by physical distance.
//
// Query params: lat, lng, qty, foodType, city (optional hint)
router.get("/nearby", async (req, res) => {
  try {
    const { lat, lng, qty, foodType, city } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: "lat and lng are required" });
    }

    const donorLat = parseFloat(lat);
    const donorLng = parseFloat(lng);
    const quantity  = parseInt(qty) || 10;
    const fType     = foodType || "veg";

    // ── Strategy: Fetch ALL active receivers from DB ──────
    // We fetch everything and rank by distance — this way if the
    // user is at Rajalakshmi College (which is between both cities),
    // they get results from BOTH cities ranked by actual distance
    const allReceivers = await Receiver.find({ active: { $ne: false } });

    // ── ML score every receiver against donor's exact position ──
    const scored = allReceivers
      .map(r => {
        const { score, distanceKm } = mlScore(r, donorLat, donorLng, quantity, fType);
        return {
          _id:          r._id,
          id:           r._id,
          name:         r.name,
          type:         r.type,
          city:         r.city,
          address:      r.address,
          lat:          r.lat,
          lng:          r.lng,
          phone:        r.phone,
          contact:      r.contact,
          capacity:     r.capacity,
          accepts:      r.accepts,
          description:  r.description,
          servedToday:  r.servedToday,
          inNeed:       r.inNeed,
          needMessage:  r.needMessage,
          needUrgency:  r.needUrgency,
          distanceKm,
          dist:         distanceKm,
          score,
          need:         r.inNeed,   // alias for frontend compatibility
          fromDB:       true,
        };
      })
      // Sort by ML score (highest first)
      .sort((a, b) => b.score - a.score);

    // ── Return top 20 receivers (all within relevant range) ──
    // Filter to receivers within 40km of donor — covers the full Kanchipuram district
    const nearby = scored.filter(r => r.distanceKm <= 40);

    res.json({
      count:        nearby.length,
      donorLat,
      donorLng,
      receivers:    nearby,
    });

  } catch (err) {
    console.error("ML nearby error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/receivers — all (admin/debug) ────────────────────
router.get("/", async (req, res) => {
  try {
    const { city } = req.query;
    const query = {};
    if (city) query.city = { $regex: new RegExp(city, "i") };
    const receivers = await Receiver.find(query).sort({ city: 1, type: 1, name: 1 });
    res.json(receivers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/receivers/:id/served ───────────────────────────
router.post("/:id/served", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    await Receiver.findByIdAndUpdate(req.params.id, {
      servedToday:    true,
      lastServedDate: today,
      inNeed:         false,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/receivers/:id/need ─────────────────────────────
router.post("/:id/need", async (req, res) => {
  try {
    const { message, urgency } = req.body;
    await Receiver.findByIdAndUpdate(req.params.id, {
      inNeed:      true,
      needMessage: message,
      needUrgency: urgency || "medium",
      needPostedAt: new Date(),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;