const mongoose = require("mongoose");

const needPostSchema = new mongoose.Schema({
  receiver:    { type: mongoose.Schema.Types.ObjectId, ref: "Receiver", required: true },
  ngoName:     { type: String, required: true },
  type:        { type: String, enum: ["ngo","temple","hospital"] },
  message:     { type: String, required: true },
  location:    { type: String },
  city:        { type: String },
  lat:         { type: Number },
  lng:         { type: Number },
  urgency:     { type: String, enum: ["high","medium","low"], default: "medium" },
  peopleCount: { type: Number, default: 0 },
  contact:     { type: String },
  active:      { type: Boolean, default: true },
  createdAt:   { type: Date, default: Date.now },
});

module.exports = mongoose.model("NeedPost", needPostSchema);