const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const ngoSchema = new mongoose.Schema({
  orgName:       { type: String, required: true, trim: true },
  name:          { type: String, default: "" }, // Contact person name
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:      { type: String, required: true },
  phone:         { type: String, required: true, trim: true },
  role:          { type: String, default: "ngo" },
  city:          { type: String, default: "Kanchipuram" },
  pickupAddress: { type: String, default: "" },
  peopleCount:   { type: Number, default: 0 },
  foodQuantity:  { type: Number, default: 0 },
  foodType:      { type: String, default: "veg" },
  urgency:       { type: String, default: "medium" },
  daysActive:    { type: Number, default: 7 },
  message:       { type: String, default: "" },
  verified:      { type: Boolean, default: false },
  certificateId: { type: mongoose.Schema.Types.ObjectId, ref: "Certificate" },
  createdAt:     { type: Date, default: Date.now },
});

ngoSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

ngoSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model("NGO", ngoSchema);
