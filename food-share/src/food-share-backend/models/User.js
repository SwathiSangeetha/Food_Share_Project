const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, lowercase: true },
  password:   { type: String, required: true },
  phone:      { type: String, required: true },
  role:       { type: String, enum: ["donor", "ngo", "admin"], default: "donor" },
  // NGO-specific fields
  orgName:    { type: String },
  city:       { type: String },
  ngoProofUrl:{ type: String },
  verified:   { type: Boolean, default: false },
  createdAt:  { type: Date, default: Date.now },
});

// Hash password before save
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model("User", userSchema);