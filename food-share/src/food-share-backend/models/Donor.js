const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const donorSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true },
  email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:       { type: String, required: true },
  phone:          { type: String, required: true, trim: true },
  role:           { type: String, default: "donor" },
  address:        { type: String, default: "" },
  city:           { type: String, default: "Kanchipuram" },
  donationsCount: { type: Number, default: 0 },
  createdAt:      { type: Date, default: Date.now },
});

donorSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

donorSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model("Donor", donorSchema);
