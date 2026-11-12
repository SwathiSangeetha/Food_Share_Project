import { useState } from "react";
import { C, gradAccent, gradBanner, Btn, Input, StepBar, Navbar, isValidPhone, validateStrongPassword } from "../shared";
import { store } from "../store";
import { uploadAndAnalyzeCertificate, registerUser } from "../api";

const STEPS = ["Organisation", "Certificate Upload", "Capacity", "Review"];

// ── What certificates are accepted ────────────────────────────
// Only 12A Certificate is accepted as per compliance policy
const CERT_TYPES = [
  {
    id: "12a",
    label: "12A Certificate",
    description: "Income Tax exemption certificate issued by Income Tax Department, India",
    required: true,
  },
];

// ── Secure Gemini AI Document Analysis via Backend ─────────
async function analyzeCertificateViaBackend(file, certType, orgName, email, phone, city, userId) {
  const isImage = file.type.startsWith("image/");
  const isPDF   = file.type === "application/pdf";

  if (!isImage && !isPDF) {
    return {
      verified: false,
      confidence: 0,
      reason: "File must be a PDF document or image (JPG, PNG, WebP).",
      flags: ["Invalid file type"],
      missingFields: ["Valid document format"],
      unreadableContent: ["File could not be parsed"],
      inconsistencies: [],
      disclaimer: "Notice: AI analysis is an automated assessment to assist verification and does not guarantee certificate authenticity.",
    };
  }

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("orgName", orgName || "NGO");
    formData.append("certType", certType || "12a");
    if (email) formData.append("email", email);
    if (phone) formData.append("phone", phone);
    if (city) formData.append("city", city);
    if (userId) formData.append("userId", userId);

    const res = await uploadAndAnalyzeCertificate(formData);
    if (!res.success || !res.certificate) {
      throw new Error(res.message || "Certificate analysis failed.");
    }

    return {
      certificateId: res.certificate._id,
      fileUrl: res.certificate.fileUrl,
      ...res.certificate.aiAnalysis,
    };
  } catch (err) {
    console.error("Backend Gemini analysis error:", err);
    return {
      verified: false,
      confidence: 0,
      reason: err.message || "Certificate verification service unavailable. Document saved for admin review.",
      flags: ["Connection to AI analysis backend failed"],
      missingFields: ["Analysis incomplete"],
      unreadableContent: ["Backend service error"],
      inconsistencies: [],
      disclaimer: "Notice: AI analysis is an automated assessment to assist verification and does not guarantee certificate authenticity.",
      suggestion: "Our team will manually review your certificate from the admin dashboard within 24 hours.",
    };
  }
}

const empty = {
  orgName: "", email: "", password: "", phone: "",
  city: "Sriperumbadur",
  // Certificate uploads
  uploadedCerts: {},    // { certId: { file, fileName, result } }
  selectedCertType: "12a",
  // Capacity
  peopleCount: "", foodQuantity: "", pickupAddress: "",
  foodType: "veg", daysActive: "",
  message: "", urgency: "medium", type: "ngo",
};

export default function NGORegister({ navigate, user, setUser, onLogout }) {
  const [step, setStep]           = useState(0);
  const [form, setForm]           = useState(empty);
  const [submitted, setSubmitted] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [step0Error, setStep0Error]     = useState("");

  const set = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setStep0Error("");
  };

  const handleStep0Continue = () => {
    setStep0Error("");
    if (!isValidPhone(form.phone)) {
      setStep0Error("Please enter a valid 10-digit mobile number (e.g. 9876543210).");
      return;
    }
    const passCheck = validateStrongPassword(form.password);
    if (!passCheck.valid) {
      setStep0Error(passCheck.message);
      return;
    }
    setStep(1);
  };

  const detectType = (name) => {
    const n = name.toLowerCase();
    if (n.includes("temple") || n.includes("kovil") || n.includes("church") || n.includes("mosque")) return "temple";
    if (n.includes("hospital") || n.includes("clinic")) return "hospital";
    return "ngo";
  };

  // ── Handle file upload + Gemini AI verification ─────────
  const handleCertUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const certType = form.selectedCertType;
    setVerifying(true);
    setVerifyResult(null);

    // Immediately show file name
    setForm(f => ({
      ...f,
      uploadedCerts: {
        ...f.uploadedCerts,
        [certType]: { file, fileName: file.name, result: null, status: "verifying" },
      },
    }));

    // Run backend Gemini AI verification
    const result = await analyzeCertificateViaBackend(
      file,
      certType,
      form.orgName || "NGO",
      form.email,
      form.phone,
      form.city,
      user?.id || user?._id
    );
    setVerifyResult(result);

    setForm(f => ({
      ...f,
      uploadedCerts: {
        ...f.uploadedCerts,
        [certType]: {
          file,
          fileName: file.name,
          result,
          status: result.verified ? "verified" : result.confidence >= 50 ? "pending" : "failed",
          certificateId: result.certificateId,
          fileUrl: result.fileUrl,
        },
      },
    }));
    setVerifying(false);
  };

  const hasVerifiedCert = Object.values(form.uploadedCerts).some(c => c.result?.verified);
  const hasPendingCert  = Object.values(form.uploadedCerts).some(c => c.status === "verifying");

  const handleSubmit = async () => {
    const type = detectType(form.orgName);
    try {
      const reg = await registerUser({
        name: form.orgName,
        orgName: form.orgName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        city: form.city || "Kanchipuram",
        pickupAddress: form.pickupAddress,
        peopleCount: form.peopleCount,
        foodQuantity: form.foodQuantity,
        foodType: form.foodType,
        urgency: form.urgency,
        daysActive: form.daysActive,
        message: form.message,
        role: "ngo",
      });
      if (reg.token && reg.user) {
        localStorage.setItem("token", reg.token);
        if (typeof setUser === "function") setUser(reg.user);
      }
    } catch (err) {
      console.warn("Could not register NGO account in database:", err.message);
    }

    store.addNeedPost({
      ngoName:     form.orgName,
      type,
      message:     form.message || `${form.orgName} is registered and looking for food donations. We serve ${form.peopleCount || "?"} people daily.`,
      location:    form.city || "Sriperumbadur",
      lat:         12.9740, lng: 79.9460,
      urgency:     form.urgency || "medium",
      peopleCount: parseInt(form.peopleCount) || 0,
      contact:     form.phone,
    });
    setSubmitted(true);
  };



  // ── Success screen ────────────────────────────────────────
  if (submitted) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap');*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html,body{font-family:'DM Sans',sans-serif;background:${C.bg};color:${C.dark}}`}</style>
      <Navbar navigate={navigate} user={user} onLogout={onLogout} scrolled={true} />
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", paddingTop: 80, background: C.bg }}>
        <div style={{ textAlign: "center", maxWidth: 560, padding: "0 24px" }}>
          <div style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 700, color: C.dark, marginBottom: 16 }}>Registration Successful!</h2>
          <p style={{ color: C.muted, fontSize: 16, lineHeight: 1.7, marginBottom: 24 }}>
            <strong style={{ color: C.purple }}>{form.orgName}</strong> is now registered.
            {hasVerifiedCert ? " Your certificate was verified by our ML system ✅" : " Our team will manually verify your certificate within 24 hours."}
            {" "}Confirmation sent to <strong style={{ color: C.pink }}>{form.email}</strong>.
          </p>
          <div style={{ background: C.purplePale, border: `1px solid ${C.purpleLight}`, borderRadius: 16, padding: "18px 24px", marginBottom: 24, textAlign: "left" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.purple, marginBottom: 10 }}>What happens next?</div>
            {["Your need post appears on homepage live feed now", "Donors in your area can see your request", "You receive food donation alerts via SMS & email", "Donors can contact you from the live feed"].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 13, color: C.mid }}>
                <span style={{ color: C.pink, fontWeight: 700 }}>{i + 1}.</span>{s}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Btn onClick={() => navigate("/home")} style={{ background: gradAccent, color: C.white, padding: "13px 28px", borderRadius: 50, fontSize: 15 }}>
              Go to Home →
            </Btn>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{font-family:'DM Sans',sans-serif;background:${C.bg};color:${C.dark};overflow-x:hidden}
        input,textarea,select{width:100%;box-sizing:border-box}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes slideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .slide-in{animation:slideIn .4s ease both}
      `}</style>
      <Navbar navigate={navigate} user={user} onLogout={onLogout} scrolled={true} />

      <div style={{ minHeight: "100vh", paddingTop: 80, background: C.bg }}>
        <div style={{ background: gradBanner, padding: "48px 40px 80px", textAlign: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 3, color: "rgba(255,255,255,0.7)", textTransform: "uppercase" }}>Join as receiver</span>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(28px,4vw,44px)", fontWeight: 700, color: C.white, marginTop: 10 }}>NGO / Temple Registration</h1>
          <p style={{ color: "rgba(255,255,255,0.75)", marginTop: 10, fontSize: 16 }}>Your certificate is verified by ML — appear on the live feed instantly</p>
        </div>

        <div style={{ maxWidth: 680, margin: "-48px auto 60px", padding: "0 24px" }}>
          <div style={{ background: C.white, borderRadius: 24, padding: "40px 48px", boxShadow: `0 24px 64px ${C.purple}18` }}>
            <StepBar steps={STEPS} current={step} />

            {/* ── STEP 0: Organisation ── */}
            {step === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: C.dark }}>Organisation details</h3>
                <Input label="Organisation / NGO name" name="orgName" value={form.orgName} onChange={set} placeholder="e.g. Hope Foundation" required />
                <Input label="Official email address" type="email" name="email" value={form.email} onChange={set} placeholder="contact@hope.org" required />
                <div>
                  <Input label="Password" type="password" name="password" value={form.password} onChange={set} placeholder="Create a strong password" required />
                  <span style={{ fontSize: 11, color: C.muted, display: "block", marginTop: 4 }}>
                    🔒 Strong password: min 8 chars with uppercase, lowercase, number & special character (!@#$%^&*).
                  </span>
                </div>
                <div>
                  <Input label="Phone number" type="tel" name="phone" value={form.phone} onChange={set} placeholder="9876543210" required />
                  <span style={{ fontSize: 11, color: C.muted, display: "block", marginTop: 4 }}>
                    📱 Enter valid 10-digit mobile number.
                  </span>
                </div>
                <Input label="City / Area" name="city" value={form.city} onChange={set} placeholder="Kanchipuram or Sriperumbadur" required />

                {step0Error && (
                  <div style={{ color: "#C62828", background: "#FFEBEE", border: "1px solid #EF9A9A", padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                    ⚠️ {step0Error}
                  </div>
                )}

                <Btn onClick={handleStep0Continue} disabled={!form.orgName || !form.email || !form.password || !form.phone}
                  style={{ background: gradAccent, color: C.white, padding: "14px", borderRadius: 12, fontSize: 15, marginTop: 8 }}>
                  Continue →
                </Btn>
              </div>
            )}

            {/* ── STEP 1: Certificate Upload + Gemini AI Verification ── */}
            {step === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: C.dark }}>12A Certificate Verification</h3>

                {/* Only 12A Certificate is required */}
                <div style={{ background: C.purplePale, borderRadius: 14, padding: "16px 20px", border: `1px solid ${C.purpleLight}66` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 26 }}>
                      {form.uploadedCerts["12a"]?.status === "verified" ? "✅" : "📜"}
                    </span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.dark }}>
                        12A Certificate <span style={{ color: C.pink, fontSize: 11, fontWeight: 700, marginLeft: 6 }}>*Mandatory</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                        Income Tax exemption certificate issued under Section 12A of the Income Tax Act, India.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upload zone */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ border: `2px dashed ${verifying ? C.purple : C.purpleLight}`, borderRadius: 14, padding: "24px 20px", textAlign: "center", background: verifying ? C.purplePale : C.offWhite, transition: "all 0.3s" }}>
                    {verifying ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${C.purpleLight}`, borderTopColor: C.pink, animation: "spin 1s linear infinite" }} />
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.purple }}>🤖 Gemini AI analysing certificate document…</div>
                        <div style={{ fontSize: 12, color: C.muted }}>Extracting credentials, checking readability, auditing for missing fields and inconsistencies</div>
                      </div>
                    ) : (
                      <>
                        <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 4 }}>
                          Upload 12A Certificate
                        </div>
                        <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
                          PDF, JPG, PNG, WebP · Max 10MB · Automated Gemini AI Compliance Audit
                        </div>
                      </>
                    )}
                    <input type="file" id="certUpload" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleCertUpload} style={{ display: "none" }} />
                    {!verifying && (
                      <label htmlFor="certUpload" style={{ display: "inline-block", background: gradAccent, color: C.white, padding: "10px 26px", borderRadius: 50, fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: `0 4px 14px ${C.pink}44` }}>
                        Select File to Analyze
                      </label>
                    )}
                  </div>
                </div>

                {/* Gemini AI Detailed Analysis Result Card */}
                {verifyResult && !verifying && (
                  <div className="slide-in" style={{
                    borderRadius: 16,
                    padding: "22px",
                    border: `1.5px solid ${verifyResult.verified ? "#A5D6A7" : verifyResult.confidence >= 50 ? "#FFE082" : "#EF9A9A"}`,
                    background: verifyResult.verified ? "#F4FBF5" : verifyResult.confidence >= 50 ? "#FFFDF5" : "#FFF7F7",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.04)"
                  }}>
                    {/* Header bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.purple, marginBottom: 2 }}>
                          ✨ Gemini AI Document Audit
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: verifyResult.verified ? "#2E7D32" : verifyResult.confidence >= 50 ? "#F57C00" : "#C62828" }}>
                          {verifyResult.verified ? "✅ Certificate Analysis Passed" : verifyResult.confidence >= 50 ? "⚠️ Minor Anomalies / Review Needed" : "❌ Document Flagged for Manual Review"}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          background: verifyResult.confidence >= 75 ? "#E8F5E9" : verifyResult.confidence >= 50 ? "#FFF8E1" : "#FFEBEE",
                          color: verifyResult.confidence >= 75 ? "#2E7D32" : verifyResult.confidence >= 50 ? "#F57C00" : "#C62828",
                          borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700
                        }}>
                          {verifyResult.confidence}% Confidence
                        </span>
                      </div>
                    </div>

                    {/* Extracted Details Grid */}
                    <div style={{ background: C.white, borderRadius: 12, padding: "14px 16px", marginBottom: 14, border: `1px solid ${C.purpleLight}33` }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.mid, marginBottom: 8 }}>📋 Extracted Certificate Information</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, fontSize: 12 }}>
                        <div>
                          <span style={{ color: C.muted }}>🏢 Extracted Org Name: </span>
                          <span style={{ fontWeight: 600, color: C.dark }}>{verifyResult.extractedOrgName || "—"}</span>
                          {verifyResult.orgNameMatch !== undefined && (
                            <span style={{ marginLeft: 6, fontSize: 11, color: verifyResult.orgNameMatch ? "#2E7D32" : "#C62828", fontWeight: 700 }}>
                              {verifyResult.orgNameMatch ? "✓ Matches claimed" : "⚠️ Deviates"}
                            </span>
                          )}
                        </div>
                        <div>
                          <span style={{ color: C.muted }}>🆔 Registration No: </span>
                          <span style={{ fontWeight: 600, color: C.dark }}>{verifyResult.registrationNumber || "—"}</span>
                        </div>
                        <div>
                          <span style={{ color: C.muted }}>📅 Date of Issue: </span>
                          <span style={{ fontWeight: 600, color: C.dark }}>{verifyResult.dateOfIssue || "—"}</span>
                        </div>
                        <div>
                          <span style={{ color: C.muted }}>⏳ Validity / Renewal: </span>
                          <span style={{ fontWeight: 600, color: C.dark }}>{verifyResult.validUntil || "Standard"}</span>
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <span style={{ color: C.muted }}>📍 Registered Address: </span>
                          <span style={{ fontWeight: 600, color: C.dark }}>{verifyResult.address || "—"}</span>
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <span style={{ color: C.muted }}>🏛️ Issuing Authority: </span>
                          <span style={{ fontWeight: 600, color: C.dark }}>{verifyResult.issuingAuthority || "—"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quality & Anomaly Breakdown (Missing, Unreadable, Inconsistencies) */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginBottom: 14 }}>
                      {/* 1. Missing Information */}
                      <div style={{ background: (verifyResult.missingFields && verifyResult.missingFields.length > 0) ? "#FFF9C433" : "#F1F8E9", border: `1px solid ${(verifyResult.missingFields && verifyResult.missingFields.length > 0) ? "#FFE082" : "#C8E6C9"}`, borderRadius: 10, padding: "10px 14px", fontSize: 12 }}>
                        <div style={{ fontWeight: 700, color: (verifyResult.missingFields && verifyResult.missingFields.length > 0) ? "#E65100" : "#2E7D32", marginBottom: 4 }}>
                          {(verifyResult.missingFields && verifyResult.missingFields.length > 0) ? "⚠️ Missing Information Detected:" : "✅ Missing Information Check: None detected"}
                        </div>
                        {(verifyResult.missingFields && verifyResult.missingFields.length > 0) ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                            {verifyResult.missingFields.map((item, idx) => (
                              <span key={idx} style={{ background: "#FFF3E0", color: "#E65100", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                • {item}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: C.muted, fontSize: 11 }}>All expected mandatory fields and official credentials found.</span>
                        )}
                      </div>

                      {/* 2. Unreadable Content */}
                      <div style={{ background: (verifyResult.unreadableContent && verifyResult.unreadableContent.length > 0) ? "#FFF3E0" : "#F1F8E9", border: `1px solid ${(verifyResult.unreadableContent && verifyResult.unreadableContent.length > 0) ? "#FFCC80" : "#C8E6C9"}`, borderRadius: 10, padding: "10px 14px", fontSize: 12 }}>
                        <div style={{ fontWeight: 700, color: (verifyResult.unreadableContent && verifyResult.unreadableContent.length > 0) ? "#D84315" : "#2E7D32", marginBottom: 4 }}>
                          {(verifyResult.unreadableContent && verifyResult.unreadableContent.length > 0) ? "🔍 Unreadable / Blurry Content Identified:" : "✅ Document Readability Check: High clarity"}
                        </div>
                        {(verifyResult.unreadableContent && verifyResult.unreadableContent.length > 0) ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                            {verifyResult.unreadableContent.map((item, idx) => (
                              <span key={idx} style={{ background: "#FBE9E7", color: "#D84315", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                • {item}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: C.muted, fontSize: 11 }}>Text, seals, and authority signatures are sharp and legible.</span>
                        )}
                      </div>

                      {/* 3. Inconsistencies */}
                      <div style={{ background: (verifyResult.inconsistencies && verifyResult.inconsistencies.length > 0) ? "#FFEBEE" : "#F1F8E9", border: `1px solid ${(verifyResult.inconsistencies && verifyResult.inconsistencies.length > 0) ? "#EF9A9A" : "#C8E6C9"}`, borderRadius: 10, padding: "10px 14px", fontSize: 12 }}>
                        <div style={{ fontWeight: 700, color: (verifyResult.inconsistencies && verifyResult.inconsistencies.length > 0) ? "#C62828" : "#2E7D32", marginBottom: 4 }}>
                          {(verifyResult.inconsistencies && verifyResult.inconsistencies.length > 0) ? "⚡ Possible Inconsistencies Found:" : "✅ Consistency Check: Verified aligned"}
                        </div>
                        {(verifyResult.inconsistencies && verifyResult.inconsistencies.length > 0) ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                            {verifyResult.inconsistencies.map((item, idx) => (
                              <span key={idx} style={{ background: "#FFCDD2", color: "#B71C1C", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                • {item}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: C.muted, fontSize: 11 }}>Document details correlate directly with entered registration data.</span>
                        )}
                      </div>
                    </div>

                    {/* MANDATORY LEGAL DISCLAIMER */}
                    <div style={{
                      background: "#EDE7F6",
                      border: "1px solid #D1C4E9",
                      borderRadius: 10,
                      padding: "10px 14px",
                      fontSize: 11,
                      color: "#4A148C",
                      lineHeight: 1.5,
                      display: "flex",
                      alignItems: "center",
                      gap: 8
                    }}>
                      <span style={{ fontSize: 16 }}>🛡️</span>
                      <div>
                        <strong>Legal & Verification Notice:</strong> {verifyResult.disclaimer || "AI analysis is an automated assessment to assist verification and does not guarantee certificate authenticity or legal validity."}
                      </div>
                    </div>
                  </div>
                )}

                {/* Uploaded certificates summary */}
                {Object.keys(form.uploadedCerts).length > 0 && (
                  <div style={{ background: C.offWhite, borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.purple, marginBottom: 8 }}>Uploaded certificates</div>
                    {Object.entries(form.uploadedCerts).map(([certId, data]) => {
                      const cert = CERT_TYPES.find(c => c.id === certId);
                      return (
                        <div key={certId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.purpleLight}22`, fontSize: 12 }}>
                          <span style={{ color: C.mid }}>{cert?.label}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ color: C.muted, fontSize: 11 }}>{data.fileName}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: data.status === "verified" ? "#2E7D32" : data.status === "failed" ? "#C62828" : C.muted }}>
                              {data.status === "verified" ? "✅ Verified" : data.status === "failed" ? "❌ Failed" : "⏳"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Manual review note */}
                {!hasVerifiedCert && Object.keys(form.uploadedCerts).length > 0 && (
                  <div style={{ background: "#FFF8E1", border: "1px solid #FFD54F", borderRadius: 12, padding: "12px 14px", fontSize: 12, color: "#E65100", lineHeight: 1.6 }}>
                    <strong>⚠️ No certificate verified yet.</strong> You can still proceed — our team will manually review within 24 hours before activating your account.
                  </div>
                )}

                <div style={{ display: "flex", gap: 12 }}>
                  <Btn onClick={() => setStep(0)} style={{ flex: 1, background: C.purplePale, color: C.purple, padding: "14px", borderRadius: 12 }}>← Back</Btn>
                  <Btn onClick={() => setStep(2)} disabled={hasPendingCert || Object.keys(form.uploadedCerts).length === 0}
                    style={{ flex: 2, background: gradAccent, color: C.white, padding: "14px", borderRadius: 12 }}>
                    {hasPendingCert ? "⏳ Verifying…" : Object.keys(form.uploadedCerts).length === 0 ? "Upload at least one certificate" : "Continue →"}
                  </Btn>
                </div>
              </div>
            )}

            {/* ── STEP 2: Capacity ── */}
            {step === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: C.dark }}>Capacity & requirements</h3>
                <Input label="Number of people you serve daily" type="number" name="peopleCount" value={form.peopleCount} onChange={set} placeholder="e.g. 150" required hint="Helps us match the right food quantity" />
                <Input label="Food quantity you need (in kg)" type="number" name="foodQuantity" value={form.foodQuantity} onChange={set} placeholder="e.g. 30" required />

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.mid }}>Food type preference <span style={{ color: C.pink }}>*</span></label>
                  <div style={{ display: "flex", gap: 12 }}>
                    {[{ v: "veg", l: "🌿 Veg only" }, { v: "both", l: "🍱 Veg & Non-veg" }].map(opt => (
                      <div key={opt.v} onClick={() => setForm(f => ({ ...f, foodType: opt.v }))} style={{ flex: 1, padding: "12px 16px", borderRadius: 12, textAlign: "center", cursor: "pointer", border: `2px solid ${form.foodType === opt.v ? C.purple : `${C.purpleLight}66`}`, background: form.foodType === opt.v ? C.purplePale : C.white, color: form.foodType === opt.v ? C.purple : C.muted, fontWeight: 600, fontSize: 14, transition: "all 0.2s" }}>{opt.l}</div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.mid }}>Urgency level</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    {[{ v: "high", l: "🔴 Urgent", bg: "#FFEBEE", c: "#C62828" }, { v: "medium", l: "🟡 Needed", bg: "#FFF8E1", c: "#E65100" }, { v: "low", l: "🟢 Request", bg: "#E8F5E9", c: "#2E7D32" }].map(opt => (
                      <div key={opt.v} onClick={() => setForm(f => ({ ...f, urgency: opt.v }))} style={{ flex: 1, padding: "10px 8px", borderRadius: 12, textAlign: "center", cursor: "pointer", border: `2px solid ${form.urgency === opt.v ? opt.c : "#eee"}`, background: form.urgency === opt.v ? opt.bg : C.white, color: form.urgency === opt.v ? opt.c : C.muted, fontWeight: 600, fontSize: 13, transition: "all 0.2s" }}>{opt.l}</div>
                    ))}
                  </div>
                </div>

                <Input label="Days active per week" type="number" name="daysActive" value={form.daysActive} onChange={set} placeholder="e.g. 7" required hint="How many days/week do you serve food?" />
                <Input label="Pickup / collection address" type="textarea" name="pickupAddress" value={form.pickupAddress} onChange={set} placeholder="Full address where donor delivers food" required />
                <Input label="Message for donors (shown on homepage)" type="textarea" name="message" value={form.message} onChange={set} placeholder="e.g. We need food for 150 people today — lunch and dinner." hint="This appears on the homepage live feed so donors can see your need" />

                <div style={{ display: "flex", gap: 12 }}>
                  <Btn onClick={() => setStep(1)} style={{ flex: 1, background: C.purplePale, color: C.purple, padding: "14px", borderRadius: 12 }}>← Back</Btn>
                  <Btn onClick={() => setStep(3)} disabled={!form.peopleCount || !form.foodQuantity || !form.pickupAddress || !form.daysActive}
                    style={{ flex: 2, background: gradAccent, color: C.white, padding: "14px", borderRadius: 12 }}>Continue →</Btn>
                </div>
              </div>
            )}

            {/* ── STEP 3: Review ── */}
            {step === 3 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: C.dark }}>Review & submit</h3>

                {/* Cert status banner */}
                <div style={{ borderRadius: 12, padding: "14px 16px", background: hasVerifiedCert ? "#E8F5E9" : "#FFF8E1", border: `1px solid ${hasVerifiedCert ? "#A5D6A7" : "#FFD54F"}`, fontSize: 13 }}>
                  {hasVerifiedCert
                    ? <><strong style={{ color: "#2E7D32" }}>✅ Certificate verified by Gemini AI</strong> — your account will be activated immediately upon admin approval.</>
                    : <><strong style={{ color: "#E65100" }}>⏳ Manual verification pending</strong> — our administrator team will review your certificate within 24 hours.</>
                  }
                </div>

                <div style={{ background: C.purplePale, borderRadius: 16, padding: "24px", border: `1px solid ${C.purpleLight}66` }}>
                  {[
                    ["Organisation", form.orgName], ["Email", form.email],
                    ["Phone", form.phone], ["City", form.city],
                    ["Certificates uploaded", Object.keys(form.uploadedCerts).map(id => CERT_TYPES.find(c => c.id === id)?.label).join(", ") || "—"],
                    ["Gemini AI Audit", hasVerifiedCert ? "✅ Analyzed & Verified" : "⏳ Pending Admin Inspection"],
                    ["People served daily", form.peopleCount], ["Food needed (kg)", form.foodQuantity],
                    ["Food type", form.foodType === "veg" ? "Veg only" : "Veg & Non-veg"],
                    ["Urgency", form.urgency], ["Days active", `${form.daysActive} days/week`],
                    ["Pickup address", form.pickupAddress],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.purpleLight}44`, fontSize: 14 }}>
                      <span style={{ color: C.muted, fontWeight: 500 }}>{k}</span>
                      <span style={{ color: C.dark, fontWeight: 600, textAlign: "right", maxWidth: "55%" }}>{v || "—"}</span>
                    </div>
                  ))}
                </div>

                <div style={{ background: C.pinkPale, borderRadius: 12, padding: "14px 16px", fontSize: 13, color: C.mid, lineHeight: 1.6, border: `1px solid ${C.pinkLight}88` }}>
                  <strong style={{ color: C.pink }}>⚠️ Note:</strong> You agree to accept food only once per day. The system automatically skips you if already served today — ensuring fair distribution.
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <Btn onClick={() => setStep(2)} style={{ flex: 1, background: C.purplePale, color: C.purple, padding: "14px", borderRadius: 12 }}>← Back</Btn>
                  <Btn onClick={handleSubmit} style={{ flex: 2, background: gradAccent, color: C.white, padding: "14px", borderRadius: 12, boxShadow: `0 6px 24px ${C.pink}44` }}>
                    ✅ Submit & go live on homepage
                  </Btn>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
