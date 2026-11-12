const express  = require("express");
const NeedPost = require("../models/NeedPost");
const Receiver = require("../models/Receiver");
const router   = express.Router();

// GET /api/needposts — active need posts for homepage
router.get("/", async (req, res) => {
  try {
    const posts = await NeedPost.find({ active: true })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/needposts — NGO posts a need
router.post("/", async (req, res) => {
  try {
    const { receiverId, ngoName, type, message, location, city, lat, lng, urgency, peopleCount, contact } = req.body;
    const post = await NeedPost.create({
      receiver: receiverId,
      ngoName, type, message, location, city, lat, lng,
      urgency, peopleCount, contact, active: true,
    });
    // Also update the receiver's inNeed flag
    if (receiverId) {
      await Receiver.findByIdAndUpdate(receiverId, {
        inNeed: true,
        needMessage: message,
        needUrgency: urgency,
        needPostedAt: new Date(),
      });
    }
    res.json({ success: true, post });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;