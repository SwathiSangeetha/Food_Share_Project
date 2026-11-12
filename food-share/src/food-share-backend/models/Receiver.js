const mongoose = require("mongoose");

const receiverSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  type:        { type: String, enum: ["ngo", "temple", "hospital"], required: true },
  city:        { type: String, required: true },  // "Kanchipuram" | "Sriperumbadur"
  address:     { type: String, required: true },
  lat:         { type: Number, required: true },
  lng:         { type: Number, required: true },
  phone:       { type: String, default: "—" },
  contact:     { type: String, default: "Contact directly" },
  capacity:    { type: Number, default: 100 },     // people/day
  accepts:     { type: [String], default: ["veg"] }, // ["veg"] or ["veg","nonveg"]
  foodTypes:   { type: [String], default: ["veg"] },
  daysActive:  { type: Number, default: 7 },
  description: { type: String, default: "" },
  verified:    { type: Boolean, default: true },
  active:      { type: Boolean, default: true },

  // Daily status — reset every midnight
  servedToday: { type: Boolean, default: false },
  lastServedDate: { type: String, default: "" }, // "2026-03-30"

  // Need post — set by NGO from their dashboard
  inNeed:      { type: Boolean, default: false },
  needMessage: { type: String, default: "" },
  needUrgency: { type: String, enum: ["high","medium","low"], default: "medium" },
  needPostedAt:{ type: Date },

  createdAt:   { type: Date, default: Date.now },
});

// 2dsphere index for geo queries
receiverSchema.index({ lat: 1, lng: 1 });

module.exports = mongoose.model("Receiver", receiverSchema);