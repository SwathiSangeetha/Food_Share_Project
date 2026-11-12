import { useState, useEffect } from "react";
import { C, gradAccent, gradBanner, Btn, Navbar } from "../shared";
import { fetchCertificates, updateCertificateStatus, deleteCertificate } from "../api";

const STATUS_CONFIG = {
  pending:  { label: "Pending Review",      bg: "#FFF8E1", color: "#E65100", border: "#FFE082", icon: "⏳" },
  approved: { label: "Approved",            bg: "#E8F5E9", color: "#2E7D32", border: "#A5D6A7", icon: "✅" },
  rejected: { label: "Rejected",            bg: "#FFEBEE", color: "#C62828", border: "#EF9A9A", icon: "❌" },
  reupload: { label: "Re-upload Requested", bg: "#FFF3E0", color: "#EF6C00", border: "#FFCC80", icon: "🔄" },
};

const CERT_TYPE_LABELS = {
  "12a":   "12A Certificate",
  "80g":   "80G Exemption",
  "niti":  "NITI Aayog Darpan",
  "trust": "Trust Deed / Society",
  "fssai": "FSSAI Food License",
};

export default function AdminCertificates({ navigate, user, onLogout }) {
  const [certificates, setCertificates] = useState([]);
  const [counts, setCounts]             = useState({ all: 0, pending: 0, approved: 0, rejected: 0, reupload: 0 });
  const [loading, setLoading]           = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch]             = useState("");
  const [certTypeFilter, setCertTypeFilter] = useState("all");
  const [actionLoading, setActionLoading]   = useState(null);
  const [adminNotes, setAdminNotes]         = useState({});
  const [expandedId, setExpandedId]         = useState(null);
  const [previewDoc, setPreviewDoc]         = useState(null);

  // Security guard: Only admin role is permitted to access this audit console
  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate("/home");
    }
  }, [user]);

  // Load certificates from backend
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchCertificates({
        status: statusFilter,
        search,
        certType: certTypeFilter,
      });
      if (res.success) {
        setCertificates(res.certificates || []);
        if (res.counts) setCounts(res.counts);
      }
    } catch (err) {
      console.error("Failed to load certificates:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, certTypeFilter]);

  // Handle Search Debounce / Trigger
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  // Update Status Action (Approve, Reject, Reupload)
  const handleStatusChange = async (id, newStatus) => {
    setActionLoading(id);
    try {
      const note = adminNotes[id] || "";
      const res = await updateCertificateStatus(id, {
        status: newStatus,
        adminNotes: note,
        reviewedBy: user?.name || "Platform Admin",
      });
      if (res.success) {
        // Refresh local items
        setCertificates(prev => prev.map(c => c._id === id ? res.certificate : c));
        // Refresh counts
        loadData();
      } else {
        alert(res.message || "Failed to update certificate status.");
      }
    } catch (err) {
      alert("Error updating certificate: " + err.message);
    }
    setActionLoading(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this certificate record?")) return;
    try {
      const res = await deleteCertificate(id);
      if (res.success) {
        setCertificates(prev => prev.filter(c => c._id !== id));
        loadData();
      }
    } catch (err) {
      alert("Error deleting certificate: " + err.message);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{font-family:'DM Sans',sans-serif;background:${C.bg};color:${C.dark};overflow-x:hidden}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeIn .3s ease both}
      `}</style>

      <Navbar navigate={navigate} user={user} onLogout={onLogout} scrolled={true} />

      <div style={{ minHeight: "100vh", paddingTop: 80, background: C.bg }}>
        {/* Banner */}
        <div style={{ background: gradBanner, padding: "48px 40px 76px", textAlign: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 3, color: "rgba(255,255,255,0.75)", textTransform: "uppercase" }}>
            Admin Console · Compliance & Governance
          </span>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(26px,3.8vw,42px)", fontWeight: 700, color: C.white, marginTop: 8 }}>
            NGO Certificate Verification Dashboard
          </h1>
          <p style={{ color: "rgba(255,255,255,0.85)", marginTop: 10, fontSize: 15, maxWidth: 650, margin: "10px auto 0" }}>
            Review certificates parsed by Gemini AI. Audit missing information, check unreadable sections, detect inconsistencies, and take approval actions.
          </p>
        </div>

        <div style={{ maxWidth: 1100, margin: "-44px auto 80px", padding: "0 24px" }}>
          {/* Legal Compliance Disclaimer Banner */}
          <div style={{
            background: "#EDE7F6",
            border: "1.5px solid #D1C4E9",
            borderRadius: 16,
            padding: "16px 20px",
            marginBottom: 24,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            boxShadow: `0 4px 20px ${C.purple}11`
          }}>
            <span style={{ fontSize: 24, lineHeight: 1 }}>🛡️</span>
            <div style={{ fontSize: 13, color: "#4A148C", lineHeight: 1.6 }}>
              <strong>Important Administrative Notice:</strong> Automated AI analysis with Gemini assists in extracting details, identifying unreadable content, and detecting anomalies. <strong>AI analysis does not guarantee certificate authenticity or legal validity.</strong> Platform administrators are responsible for manually inspecting original document scans before granting final approval.
            </div>
          </div>

          {/* Metric Stats Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 24 }}>
            {[
              { label: "Total Submitted", count: counts.all,      icon: "📑", color: C.purple, bg: C.purplePale },
              { label: "Pending Review",  count: counts.pending,  icon: "⏳", color: "#E65100", bg: "#FFF8E1" },
              { label: "Approved",        count: counts.approved, icon: "✅", color: "#2E7D32", bg: "#E8F5E9" },
              { label: "Re-upload Needed",count: counts.reupload, icon: "🔄", color: "#EF6C00", bg: "#FFF3E0" },
              { label: "Rejected",        count: counts.rejected, icon: "❌", color: "#C62828", bg: "#FFEBEE" },
            ].map(item => (
              <div key={item.label} style={{
                background: C.white,
                borderRadius: 16,
                padding: "18px 20px",
                border: `1.5px solid ${item.bg}`,
                boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
                display: "flex",
                alignItems: "center",
                gap: 14
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>{item.count}</div>
                  <div style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>{item.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter & Search Bar */}
          <div style={{
            background: C.white,
            borderRadius: 18,
            padding: "18px 22px",
            marginBottom: 24,
            boxShadow: `0 8px 32px ${C.purple}10`,
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            {/* Status Tabs */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { key: "all",      label: "All" },
                { key: "pending",  label: "Pending" },
                { key: "approved", label: "Approved" },
                { key: "reupload", label: "Re-upload" },
                { key: "rejected", label: "Rejected" },
              ].map(tab => {
                const active = statusFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    style={{
                      background: active ? gradAccent : C.offWhite,
                      color: active ? C.white : C.mid,
                      border: `1.5px solid ${active ? "transparent" : `${C.purpleLight}44`}`,
                      padding: "8px 16px",
                      borderRadius: 30,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {tab.label} {counts[tab.key] !== undefined && `(${counts[tab.key]})`}
                  </button>
                );
              })}
            </div>

            {/* Search and Type Filter */}
            <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: 10, flex: "1 1 320px", justifyContent: "flex-end" }}>
              <select
                value={certTypeFilter}
                onChange={e => setCertTypeFilter(e.target.value)}
                style={{
                  padding: "9px 12px",
                  borderRadius: 12,
                  border: `1.5px solid ${C.purpleLight}88`,
                  fontSize: 13,
                  outline: "none",
                  background: C.white,
                  color: C.dark,
                  cursor: "pointer"
                }}
              >
                <option value="all">All Certificate Types</option>
                <option value="12a">12A Certificate</option>
                <option value="80g">80G Certificate</option>
                <option value="niti">NITI Aayog Darpan</option>
                <option value="trust">Trust Deed / Society</option>
                <option value="fssai">FSSAI License</option>
              </select>

              <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
                <input
                  type="text"
                  placeholder="Search NGO or Reg No..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 14px",
                    borderRadius: 12,
                    border: `1.5px solid ${C.purpleLight}88`,
                    fontSize: 13,
                    outline: "none"
                  }}
                />
              </div>
              <Btn type="submit" style={{ background: gradAccent, color: C.white, padding: "9px 18px", borderRadius: 12, fontSize: 13 }}>
                Search
              </Btn>
            </form>
          </div>

          {/* Certificate Records List */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0", background: C.white, borderRadius: 20 }}>
              <div style={{ width: 44, height: 44, margin: "0 auto 14px", borderRadius: "50%", border: `3px solid ${C.purpleLight}`, borderTopColor: C.pink, animation: "spin 1s linear infinite" }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: C.purple }}>Loading NGO certificates…</div>
            </div>
          ) : certificates.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", background: C.white, borderRadius: 20, boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>📭</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.dark, marginBottom: 6 }}>No Certificates Found</h3>
              <p style={{ color: C.muted, fontSize: 14 }}>
                {search || statusFilter !== "all" ? "No certificates match the selected filters." : "No NGO certificate submissions recorded yet."}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {certificates.map(cert => {
                const conf = STATUS_CONFIG[cert.status] || STATUS_CONFIG.pending;
                const ai = cert.aiAnalysis || {};
                const isExpanded = expandedId === cert._id;

                const fileUrl = cert.fileUrl?.startsWith("http")
                  ? cert.fileUrl
                  : `http://localhost:5000${cert.fileUrl}`;

                const isPdf = cert.mimeType === "application/pdf" || cert.fileName?.endsWith(".pdf");

                return (
                  <div key={cert._id} className="fade-in" style={{
                    background: C.white,
                    borderRadius: 20,
                    border: `1.5px solid ${C.purpleLight}44`,
                    boxShadow: "0 6px 28px rgba(0,0,0,0.04)",
                    overflow: "hidden",
                    transition: "border-color 0.2s"
                  }}>
                    {/* Card Header */}
                    <div style={{
                      padding: "20px 24px",
                      background: C.offWhite,
                      borderBottom: `1px solid ${C.purpleLight}33`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12
                    }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                          <span style={{ fontSize: 20 }}>🏢</span>
                          <span style={{ fontSize: 18, fontWeight: 700, color: C.dark, fontFamily: "'Playfair Display',serif" }}>
                            {cert.orgName}
                          </span>
                          <span style={{ background: C.purplePale, color: C.purple, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                            {CERT_TYPE_LABELS[cert.certType] || cert.certType}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: C.muted, display: "flex", gap: 16, flexWrap: "wrap" }}>
                          <span>📍 {cert.city || "Tamil Nadu"}</span>
                          <span>✉️ {cert.email || "No email specified"}</span>
                          <span>📞 {cert.phone || "No phone specified"}</span>
                          <span>📅 Submitted: {new Date(cert.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                          background: conf.bg,
                          color: conf.color,
                          border: `1px solid ${conf.border}`,
                          padding: "6px 14px",
                          borderRadius: 30,
                          fontSize: 12,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          gap: 6
                        }}>
                          <span>{conf.icon}</span> {conf.label}
                        </span>

                        <button
                          onClick={() => setExpandedId(isExpanded ? null : cert._id)}
                          style={{
                            background: "transparent",
                            border: `1px solid ${C.purpleLight}`,
                            color: C.purple,
                            padding: "6px 14px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer"
                          }}
                        >
                          {isExpanded ? "Collapse Details ▲" : "View AI Audit ▼"}
                        </button>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: "22px 24px" }}>
                      {/* AI Extraction Highlight Grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 16 }}>
                        <div style={{ background: C.purplePale, borderRadius: 12, padding: "12px 14px" }}>
                          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 2 }}>GEMINI AI CONFIDENCE</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: ai.confidence >= 75 ? "#2E7D32" : ai.confidence >= 50 ? "#E65100" : "#C62828" }}>
                            {ai.confidence || 0}% {ai.verified ? "· Verified" : "· Review Required"}
                          </div>
                        </div>

                        <div style={{ background: C.offWhite, borderRadius: 12, padding: "12px 14px" }}>
                          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 2 }}>REGISTRATION / DARPAN ID</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{ai.registrationNumber || "Not Detected"}</div>
                        </div>

                        <div style={{ background: C.offWhite, borderRadius: 12, padding: "12px 14px" }}>
                          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 2 }}>DATE OF ISSUE & VALIDITY</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{ai.dateOfIssue || "—"} {ai.validUntil ? `(${ai.validUntil})` : ""}</div>
                        </div>

                        <div style={{ background: C.offWhite, borderRadius: 12, padding: "12px 14px" }}>
                          <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 2 }}>DOCUMENT FILE</div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.purple, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {cert.fileName}
                          </div>
                        </div>
                      </div>

                      {/* AI Audit Flags & Quality Checks Banner */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginBottom: 16 }}>
                        {/* Missing Information */}
                        <div style={{
                          padding: "10px 14px",
                          borderRadius: 12,
                          background: (ai.missingFields && ai.missingFields.length > 0) ? "#FFF9C433" : "#F1F8E9",
                          border: `1px solid ${(ai.missingFields && ai.missingFields.length > 0) ? "#FFE082" : "#C8E6C9"}`,
                          fontSize: 12
                        }}>
                          <div style={{ fontWeight: 700, color: (ai.missingFields && ai.missingFields.length > 0) ? "#E65100" : "#2E7D32", marginBottom: 3 }}>
                            {(ai.missingFields && ai.missingFields.length > 0) ? `⚠️ Missing Information (${ai.missingFields.length})` : "✅ No Missing Fields"}
                          </div>
                          {(ai.missingFields && ai.missingFields.length > 0) ? (
                            <div style={{ color: "#E65100", fontSize: 11 }}>{ai.missingFields.join(" · ")}</div>
                          ) : (
                            <div style={{ color: C.muted, fontSize: 11 }}>Standard certificates fields present.</div>
                          )}
                        </div>

                        {/* Unreadable Content */}
                        <div style={{
                          padding: "10px 14px",
                          borderRadius: 12,
                          background: (ai.unreadableContent && ai.unreadableContent.length > 0) ? "#FFF3E0" : "#F1F8E9",
                          border: `1px solid ${(ai.unreadableContent && ai.unreadableContent.length > 0) ? "#FFCC80" : "#C8E6C9"}`,
                          fontSize: 12
                        }}>
                          <div style={{ fontWeight: 700, color: (ai.unreadableContent && ai.unreadableContent.length > 0) ? "#D84315" : "#2E7D32", marginBottom: 3 }}>
                            {(ai.unreadableContent && ai.unreadableContent.length > 0) ? `🔍 Unreadable Content (${ai.unreadableContent.length})` : "✅ Clear Resolution"}
                          </div>
                          {(ai.unreadableContent && ai.unreadableContent.length > 0) ? (
                            <div style={{ color: "#D84315", fontSize: 11 }}>{ai.unreadableContent.join(" · ")}</div>
                          ) : (
                            <div style={{ color: C.muted, fontSize: 11 }}>High readability for seals and signatures.</div>
                          )}
                        </div>

                        {/* Inconsistencies */}
                        <div style={{
                          padding: "10px 14px",
                          borderRadius: 12,
                          background: (ai.inconsistencies && ai.inconsistencies.length > 0) ? "#FFEBEE" : "#F1F8E9",
                          border: `1px solid ${(ai.inconsistencies && ai.inconsistencies.length > 0) ? "#EF9A9A" : "#C8E6C9"}`,
                          fontSize: 12
                        }}>
                          <div style={{ fontWeight: 700, color: (ai.inconsistencies && ai.inconsistencies.length > 0) ? "#C62828" : "#2E7D32", marginBottom: 3 }}>
                            {(ai.inconsistencies && ai.inconsistencies.length > 0) ? `⚡ Inconsistencies (${ai.inconsistencies.length})` : "✅ Name Aligned"}
                          </div>
                          {(ai.inconsistencies && ai.inconsistencies.length > 0) ? (
                            <div style={{ color: "#C62828", fontSize: 11 }}>{ai.inconsistencies.join(" · ")}</div>
                          ) : (
                            <div style={{ color: C.muted, fontSize: 11 }}>Extracted name matches registration.</div>
                          )}
                        </div>
                      </div>

                      {/* Expandable Deep Inspection */}
                      {isExpanded && (
                        <div className="fade-in" style={{
                          background: C.offWhite,
                          borderRadius: 14,
                          padding: "18px 20px",
                          marginBottom: 18,
                          border: `1px solid ${C.purpleLight}33`
                        }}>
                          <h4 style={{ fontSize: 13, fontWeight: 700, color: C.purple, marginBottom: 10 }}>
                            🔍 Full Gemini AI Document Audit Report
                          </h4>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12, marginBottom: 12 }}>
                            <div><strong>Extracted Name:</strong> {ai.extractedOrgName || "—"}</div>
                            <div><strong>Issuing Authority:</strong> {ai.issuingAuthority || "—"}</div>
                            <div style={{ gridColumn: "1 / -1" }}><strong>Extracted Address:</strong> {ai.address || "—"}</div>
                          </div>
                          {ai.summary && (
                            <div style={{ fontSize: 12, color: C.mid, lineHeight: 1.6, marginBottom: 8 }}>
                              <strong>AI Summary:</strong> {ai.summary}
                            </div>
                          )}
                          {ai.recommendation && (
                            <div style={{ fontSize: 12, color: "#4A148C", fontWeight: 600 }}>
                              💡 AI Action Recommendation: {ai.recommendation}
                            </div>
                          )}
                          <div style={{ marginTop: 10, fontSize: 11, color: C.muted, fontStyle: "italic" }}>
                            {ai.disclaimer}
                          </div>
                        </div>
                      )}

                      {/* Document Viewer & Admin Decision Panel */}
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-end",
                        flexWrap: "wrap",
                        gap: 16,
                        paddingTop: 14,
                        borderTop: `1px solid ${C.purpleLight}22`
                      }}>
                        {/* View document link */}
                        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              background: C.purplePale,
                              color: C.purple,
                              padding: "9px 18px",
                              borderRadius: 50,
                              fontSize: 13,
                              fontWeight: 600,
                              textDecoration: "none",
                              border: `1.5px solid ${C.purpleLight}88`
                            }}
                          >
                            <span>👁️</span> Inspect Document ({isPdf ? "PDF" : "Image"})
                          </a>

                          {cert.adminNotes && (
                            <span style={{ fontSize: 12, color: C.mid, fontStyle: "italic" }}>
                              <strong>Admin Notes:</strong> "{cert.adminNotes}"
                            </span>
                          )}
                        </div>

                        {/* Admin Action Buttons */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: "1 1 340px", maxWidth: 440 }}>
                          <input
                            type="text"
                            placeholder="Optional notes for NGO (e.g. upload seal clearly)..."
                            value={adminNotes[cert._id] !== undefined ? adminNotes[cert._id] : (cert.adminNotes || "")}
                            onChange={e => setAdminNotes({ ...adminNotes, [cert._id]: e.target.value })}
                            style={{
                              padding: "8px 12px",
                              borderRadius: 10,
                              border: `1.5px solid ${C.purpleLight}66`,
                              fontSize: 12,
                              outline: "none"
                            }}
                          />
                          <div style={{ display: "flex", gap: 8 }}>
                            <Btn
                              disabled={actionLoading === cert._id}
                              onClick={() => handleStatusChange(cert._id, "approved")}
                              style={{
                                flex: 1,
                                background: "#2E7D32",
                                color: C.white,
                                padding: "8px 12px",
                                borderRadius: 10,
                                fontSize: 12,
                                fontWeight: 600
                              }}
                            >
                              ✓ Approve
                            </Btn>

                            <Btn
                              disabled={actionLoading === cert._id}
                              onClick={() => handleStatusChange(cert._id, "reupload")}
                              style={{
                                flex: 1,
                                background: "#EF6C00",
                                color: C.white,
                                padding: "8px 12px",
                                borderRadius: 10,
                                fontSize: 12,
                                fontWeight: 600
                              }}
                            >
                              🔄 Re-upload
                            </Btn>

                            <Btn
                              disabled={actionLoading === cert._id}
                              onClick={() => handleStatusChange(cert._id, "rejected")}
                              style={{
                                flex: 1,
                                background: "#C62828",
                                color: C.white,
                                padding: "8px 12px",
                                borderRadius: 10,
                                fontSize: 12,
                                fontWeight: 600
                              }}
                            >
                              ✕ Reject
                            </Btn>

                            <button
                              onClick={() => handleDelete(cert._id)}
                              title="Delete record"
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                fontSize: 16,
                                padding: "0 6px"
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
