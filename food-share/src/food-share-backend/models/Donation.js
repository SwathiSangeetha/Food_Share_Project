const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema({
  // Donor info
  donorName:    { type: String, required: true },
  donorEmail:   { type: String, required: true },
  donorPhone:   { type: String, required: true },
  donorUserId:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  // Food info
  foodName:     { type: String, required: true },
  quantity:     { type: Number, required: true },
  unit:         { type: String, default: "kg" },
  foodType:     { type: String, enum: ["veg","nonveg"], default: "veg" },
  cookedAt:     { type: Date, required: true },

  // Location
  pickupAddress:{ type: String, required: true },
  location:     { type: String, required: true },
  city:         { type: String },
  landmark:     { type: String },
  donorLat:     { type: Number },
  donorLng:     { type: Number },

  // Matched receiver
  matchedReceiver: { type: mongoose.Schema.Types.ObjectId, ref: "Receiver" },
  mlScore:      { type: Number },

  // Status
  status:       {
    type: String,
    enum: ["posted","assigned","accepted","collected","served","expired"],
    default: "posted",
  },

  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now },
});

module.exports = mongoose.model("Donation", donationSchema);