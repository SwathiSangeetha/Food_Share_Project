const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  orgName: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  city: { type: String },
  certType: { type: String, required: true }, // e.g. "12a", "80g", "niti", "trust", "fssai", "other"
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  fileUrl: { type: String, required: true },
  mimeType: { type: String, required: true },
  fileSize: { type: Number },

  // AI analysis results from Gemini AI
  aiAnalysis: {
    verified: { type: Boolean, default: false },
    confidence: { type: Number, default: 0 }, // 0 to 100
    orgNameMatch: { type: Boolean, default: false },
    extractedOrgName: { type: String, default: "" },
    registrationNumber: { type: String, default: "" },
    dateOfIssue: { type: String, default: "" },
    validUntil: { type: String, default: "" },
    address: { type: String, default: "" },
    issuingAuthority: { type: String, default: "" },
    detectedCertType: { type: String, default: "" },

    // Key requirements:
    missingFields: { type: [String], default: [] },
    unreadableContent: { type: [String], default: [] },
    inconsistencies: { type: [String], default: [] },
    flags: { type: [String], default: [] },
    summary: { type: String, default: "" },
    recommendation: { type: String, default: "" },
    disclaimer: {
      type: String,
      default: "Notice: AI analysis is an automated assessment to assist verification and does not guarantee certificate authenticity or legal validity."
    }
  },

  // Admin review flow
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "reupload"],
    default: "pending"
  },
  adminNotes: { type: String, default: "" },
  reviewedAt: { type: Date },
  reviewedBy: { type: String, default: "Admin" },

  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Certificate", certificateSchema);
