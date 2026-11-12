import { useState, useEffect, useRef } from "react";
import { C, gradAccent, gradBanner, Btn, Navbar } from "../shared";

const ICON_MAP  = { ngo: "🏛️", temple: "🛕", hospital: "🏥" };
const LABEL_MAP = { ngo: "NGO", temple: "Temple", hospital: "Hospital" };

// ── Build fake SMS sequence ────────────────────────────────────
function buildSmsSteps(donorData, matched, ranked) {
  const nearby = (ranked || []).slice(0, 5);
  const steps  = [];
  nearby.forEach((ngo, i) => {
    const isMatched = matched && ngo.id === matched.id;
    steps.push({
      delay: 600 + i * 1400,
      type: "sent",
      to: ngo.name, contact: ngo.contact, phone: ngo.phone,
      msg: `🍱 FoodShare: ${donorData?.quantity || "?"} ${donorData?.unit || "kg"} of ${donorData?.foodName || "food"} available near ${donorData?.location || "Kanchipuram"}. Are you in need today? Reply YES or NO. — FoodShare ${donorData?.resolvedCity || donorData?.city || "Kanchipuram"}`,
    });
    steps.push({
      delay: 600 + i * 1400 + 1000,
      type: "reply",
      from: ngo.name, contact: ngo.contact, phone: ngo.phone,
      accepted: !ngo.servedToday && (ngo.need || ngo.inNeed),
      msg: ngo.servedToday ? "NO — Already received food today, thank you."
         : !(ngo.need || ngo.inNeed) ? "NO — We have sufficient food for now."
         : isMatched        ? "YES — We are in need! Please send the food 🙏 We will be ready."
                            : "YES — We are in need, but we see a closer receiver has been assigned.",
    });
  });
  return steps.sort((a, b) => a.delay - b.delay);
}

// ── SMS Panel ──────────────────────────────────────────────────
function SmsPanel({ donorData, matched, ranked }) {
  const [messages, setMessages] = useState([]);
  const [done, setDone]         = useState(false);
  const bottomRef               = useRef();

  useEffect(() => {
    const steps  = buildSmsSteps(donorData, matched, ranked);
    const timers = steps.map(s =>
      setTimeout(() => {
        setMessages(p => [...p, s]);
        if (s === steps[steps.length - 1]) setDone(true);
      }, s.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div>
      {/* Terminal header */}
      <div style={{ background: "#1a1a2e", borderRadius: "14px 14px 0 0", padding: "12px 18px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["#FF5F57","#FFBD2E","#28C840"].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
        </div>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", flex: 1, textAlign: "center" }}>FoodShare SMS Gateway — Demo Mode</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Simulated · Not real</span>
      </div>

      {/* Messages */}
      <div style={{
        background: "#0d0d1a", padding: "16px", minHeight: 300, maxHeight: 420,
        overflowY: "auto", display: "flex", flexDirection: "column", gap: 12,
        borderRadius: "0 0 14px 14px", border: `1px solid ${C.purpleLight}22`, borderTop: "none",
      }}>
        {messages.length === 0 && (
          <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 13, textAlign: "center", marginTop: 80 }}>
            Initialising SMS alerts to nearby receivers…
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: m.type === "sent" ? "flex-end" : "flex-start", animation: "smsIn .3s ease both" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 3, paddingLeft: m.type === "sent" ? 0 : 6, paddingRight: m.type === "sent" ? 6 : 0 }}>
              {m.type === "sent" ? `📤 To: ${m.to} · ${m.phone}` : `📥 From: ${m.from} · ${m.contact}`}
            </div>
            <div style={{
              maxWidth: "78%", padding: "10px 14px",
              borderRadius: m.type === "sent" ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
              background: m.type === "sent"
                ? `linear-gradient(135deg, ${C.pink}, ${C.purple})`
                : m.accepted ? "#0f2f0f" : "#2a0f0f",
              color: m.type === "sent" ? "white" : m.accepted ? "#81C784" : "#EF9A9A",
              fontSize: 13, lineHeight: 1.55,
              border: m.type === "reply" ? `1px solid ${m.accepted ? "#4CAF5033" : "#EF535333"}` : "none",
            }}>{m.msg}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 2 }}>
              {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        ))}

        {!done && messages.length > 0 && (
          <div style={{ display: "flex", gap: 5, padding: "4px 8px" }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,0.25)", animation: `dotPulse 1.2s ease ${i*0.2}s infinite` }} />
            ))}
          </div>
        )}

        {done && matched && (
          <div style={{ background: "#0f2f0f", border: "1px solid #4CAF5044", borderRadius: 12, padding: "12px 16px", color: "#81C784", fontSize: 13, fontWeight: 600, textAlign: "center" }}>
            ✅ {matched.name} confirmed. Assignment complete.
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ── Status tracker ─────────────────────────────────────────────
const STATUS_STEPS = [
  { key: "assigned",  icon: "📋", label: "Assigned",  desc: "Matched to receiver" },
  { key: "accepted",  icon: "✅", label: "Accepted",  desc: "NGO confirmed" },
  { key: "collected", icon: "🚚", label: "Collected", desc: "Food picked up" },
  { key: "served",    icon: "🍽️", label: "Served",    desc: "Community fed!" },
];

export default function MatchResult({ navigate, donorData, user, onLogout }) {
  const [status, setStatus]     = useState("assigned");
  const [showInstr, setShowInstr] = useState(true);

  // Use ML results passed from DonorRegister
  const ranked  = donorData?.mlResults || [];
  const matched = donorData?.matched   || ranked.find(r => !r.servedToday && (r.need || r.inNeed)) || null;
  const curIdx  = STATUS_STEPS.findIndex(s => s.key === status);
  const isStrict = matched && (matched.type === "temple" || matched.type === "hospital");
  const qty     = parseInt(donorData?.quantity) || 10;

  useEffect(() => {
    const t1 = setTimeout(() => setStatus("accepted"),  7000);
    const t2 = setTimeout(() => setStatus("collected"), 13000);
    const t3 = setTimeout(() => setStatus("served"),    19000);
    return () => [t1,t2,t3].forEach(clearTimeout);
  }, []);

  const instructions = isStrict ? [
    { icon: "📦", t: "Pack properly",  d: "Sealed containers or food-grade bags only. No open packaging." },
    { icon: "🏷️", t: "Label clearly", d: "Write food name, quantity and cooked time on each package." },
    { icon: "🌿", t: "Veg only",       d: matched?.type === "hospital" ? "Lightly spiced veg only — no onion/garlic if possible." : "Temples accept vegetarian only. No non-veg items." },
    { icon: "🧴", t: "Hygiene first",  d: "Clean hands and gloves. Keep food covered at all times." },
    { icon: "⏱️", t: "Deliver fast",  d: "Must reach receiver within 2 hours of packing." },
    { icon: "🚫", t: "Do not send",    d: "Food that smells off, changed colour, or cooked over 6 hours ago." },
  ] : [
    { icon: "📦", t: "Basic packing",  d: "Pack in covered containers. Keep sealed." },
    { icon: "⏱️", t: "Deliver fresh", d: "Deliver within 2–3 hours of cooking. Call ahead." },
    { icon: "📞", t: "Coordinate",     d: "Call the receiver before leaving to confirm pickup." },
    { icon: "🚫", t: "Do not send",    d: "Spoiled, expired, or uncovered food. Donate only what you'd eat." },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{font-family:'DM Sans',sans-serif;background:${C.bg};color:${C.dark};overflow-x:hidden}
        @keyframes ping{0%{transform:scale(1);opacity:1}100%{transform:scale(2.4);opacity:0}}
        @keyframes si{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes smsIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes dotPulse{0%,100%{opacity:.3;transform:scale(1)}50%{opacity:1;transform:scale(1.5)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .si{animation:si .5s ease both}
      `}</style>

      {/* Navbar */}
      <Navbar navigate={navigate} user={user} onLogout={onLogout} scrolled={true} />

      <div style={{ minHeight: "100vh", paddingTop: 80, background: C.bg }}>

        {/* Header */}
        <div style={{ background: gradBanner, padding: "40px 40px 72px", textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>{matched ? "🎯" : "😔"}</div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(24px,4vw,38px)", fontWeight: 700, color: C.white, marginBottom: 8 }}>
            {matched ? "Perfect match found!" : "No receiver available today"}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 15 }}>
            {matched ? `Assigned to ${matched.name} · ${matched.dist ?? matched.distanceKm} km away` : "All receivers served or unavailable. Try again tomorrow."}
          </p>
          <div style={{ display: "inline-block", marginTop: 12, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 50, padding: "4px 16px", fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
            🎭 SMS is simulated for demo · Map & ML are real
          </div>
        </div>

        <div style={{ maxWidth: 800, margin: "-48px auto 60px", padding: "0 24px", display: "flex", flexDirection: "column", gap: 24 }}>

          {matched && <>

            {/* ── ML RANKING SUMMARY ── */}
            <div className="si" style={{ background: C.white, borderRadius: 24, padding: "28px", boxShadow: `0 24px 64px ${C.purple}18` }}>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: C.dark, marginBottom: 6 }}>🤖 ML matching result</h3>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Model scored {ranked.length} nearby receivers — ranked below</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ranked.slice(0, 5).map((r, i) => {
                  const isTop = i === 0 && !r.servedToday && (r.need || r.inNeed);
                  return (
                    <div key={r.id} style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                      borderRadius: 12,
                      background: isTop ? C.purplePale : r.servedToday ? "#FFF3E0" : C.offWhite,
                      border: `1.5px solid ${isTop ? C.purple : r.servedToday ? "#FFCC8088" : C.purpleLight + "22"}`,
                    }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        background: isTop ? gradAccent : r.servedToday ? "#FFCC80" : `${C.purpleLight}44`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700,
                        color: isTop ? C.white : r.servedToday ? "#E65100" : C.muted,
                      }}>{i + 1}</div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{ICON_MAP[r.type]} {r.name}</div>
                        <div style={{ fontSize: 12, color: C.muted }}>{r.dist ?? r.distanceKm} km · {r.contact} · {r.phone}</div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.purple }}>Score {Math.round(r.score)}</div>
                        <div style={{
                          fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "2px 10px",
                          background: isTop ? "#E8F5E9" : r.servedToday ? "#FFF3E0" : (r.need || r.inNeed) ? C.purplePale : "#F5F5F5",
                          color: isTop ? "#2E7D32" : r.servedToday ? "#E65100" : (r.need || r.inNeed) ? C.purple : C.muted,
                        }}>
                          {isTop ? "✅ Assigned" : r.servedToday ? "⚠️ Served today" : (r.need || r.inNeed) ? "🔵 In need" : "➖ Not in need"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Why this match */}
              <div style={{ marginTop: 16, background: C.purplePale, borderRadius: 12, padding: "14px 16px", fontSize: 13, color: C.mid, lineHeight: 1.7 }}>
                <strong style={{ color: C.purple }}>💡 Why {matched.name}?</strong><br />
                Quantity <strong>{donorData?.quantity} {donorData?.unit}</strong>
                {qty >= 50 ? " → large donation, NGO prioritised." : qty >= 20 ? " → medium donation, temple/NGO eligible." : " → small donation, any receiver eligible."}
                {" "}Food type is <strong>{donorData?.foodType === "veg" ? "vegetarian" : "non-vegetarian"}</strong>
                {donorData?.foodType === "nonveg" ? " — only NGOs accepted." : " — all receivers eligible."}
                {" "}<strong>{matched.name}</strong> is nearest ({matched.dist ?? matched.distanceKm} km), not served today, and confirmed need.
              </div>
            </div>

            {/* ── MATCHED RECEIVER CARD ── */}
            <div className="si" style={{ background: C.white, borderRadius: 24, padding: "28px", boxShadow: `0 24px 64px ${C.purple}18`, animationDelay: "0.1s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 28 }}>{ICON_MAP[matched.type]}</span>
                    <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: C.dark }}>{matched.name}</h2>
                  </div>
                  <span style={{ background: C.purplePale, color: C.purple, borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700 }}>{LABEL_MAP[matched.type]}</span>
                </div>
                <div style={{ background: C.purplePale, borderRadius: 12, padding: "10px 18px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: C.purple, fontFamily: "'Playfair Display',serif" }}>{matched.dist ?? matched.distanceKm} km</div>
                  <div style={{ fontSize: 11, color: C.muted }}>from you</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  ["📍 Address",   matched.address || matched.city || "Kanchipuram"],
                  ["📞 Phone",     matched.phone],
                  ["👤 Contact",   matched.contact],
                  ["👥 Capacity",  `${matched.capacity} people/day`],
                  ["🍱 Your food", `${donorData?.quantity} ${donorData?.unit} of ${donorData?.foodName}`],
                  ["📅 Cooked",    donorData?.cookedDate ? `${new Date(donorData.cookedDate).toLocaleDateString("en-IN")} ${donorData?.cookedTime || ""}` : "—"],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: C.offWhite, borderRadius: 12, padding: "12px 14px" }}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── FAKE SMS ── */}
            <div className="si" style={{ animationDelay: "0.15s" }}>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: C.dark, marginBottom: 6 }}>📱 SMS alerts sent to nearby receivers</h3>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 14 }}>Simulated messages — in production these would be real Twilio SMS</p>
              <SmsPanel donorData={donorData} matched={matched} ranked={ranked} />
            </div>

            {/* ── STATUS ── */}
            <div className="si" style={{ background: C.white, borderRadius: 24, padding: "28px", boxShadow: `0 24px 64px ${C.purple}18`, animationDelay: "0.2s" }}>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: C.dark, marginBottom: 24 }}>Live status tracker</h3>
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                {STATUS_STEPS.map((s, i) => (
                  <div key={s.key} style={{ display: "flex", alignItems: "flex-start", flex: i < STATUS_STEPS.length - 1 ? 1 : 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div style={{ position: "relative" }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: "50%",
                          background: i <= curIdx ? gradAccent : `${C.purpleLight}33`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 18, transition: "all .5s",
                          boxShadow: i === curIdx ? `0 0 0 4px ${C.pinkLight}` : "none",
                        }}>{i <= curIdx ? s.icon : ""}</div>
                        {i === curIdx && <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `${C.pink}33`, animation: "ping 1.5s cubic-bezier(0,0,.2,1) infinite" }} />}
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: i <= curIdx ? C.purple : C.muted, textAlign: "center" }}>{s.label}</span>
                      <span style={{ fontSize: 10, color: C.muted, textAlign: "center", maxWidth: 64 }}>{s.desc}</span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div style={{ flex: 1, height: 2, margin: "22px 6px 0", background: i < curIdx ? gradAccent : `${C.purpleLight}44`, transition: "background .5s" }} />
                    )}
                  </div>
                ))}
              </div>
              {status === "served" && (
                <div style={{ marginTop: 20, background: "#E8F5E9", borderRadius: 12, padding: "14px", textAlign: "center", fontSize: 15, fontWeight: 600, color: "#2E7D32" }}>
                  🎉 Your food has been successfully served to the community!
                </div>
              )}
            </div>

            {/* ── PACKING INSTRUCTIONS ── */}
            <div className="si" style={{ background: C.white, borderRadius: 24, padding: "28px", boxShadow: `0 24px 64px ${C.purple}18`, animationDelay: "0.25s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: C.dark }}>
                  📦 Packing instructions
                  {isStrict && <span style={{ marginLeft: 10, fontSize: 12, background: "#FFF3E0", color: "#E65100", borderRadius: 20, padding: "3px 10px", fontFamily: "'DM Sans',sans-serif", fontWeight: 700 }}>⚠️ Strict</span>}
                </h3>
                <Btn onClick={() => setShowInstr(v => !v)} style={{ background: C.purplePale, color: C.purple, padding: "7px 14px", borderRadius: 50, fontSize: 12 }}>
                  {showInstr ? "Hide" : "Show"}
                </Btn>
              </div>
              {showInstr && (
                <>
                  {isStrict && (
                    <div style={{ background: "#FFF3E0", border: "1px solid #FFCC80", borderRadius: 12, padding: "12px 16px", marginBottom: 14, fontSize: 13, color: "#BF360C", lineHeight: 1.6 }}>
                      <strong>⚠️ Important:</strong> This donation goes to a {LABEL_MAP[matched.type]} with strict hygiene requirements.
                      {matched.type === "hospital" && " Hospitals serve patients — food must be lightly spiced, sealed, and very fresh."}
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                    {instructions.map((ins, i) => (
                      <div key={i} style={{ background: C.offWhite, borderRadius: 12, padding: "14px", border: `1px solid ${ins.icon === "🚫" ? "#FFCDD2" : C.purpleLight + "33"}` }}>
                        <div style={{ fontSize: 20, marginBottom: 6 }}>{ins.icon}</div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: C.dark, marginBottom: 4 }}>{ins.t}</div>
                        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{ins.d}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "#FFEBEE", border: "1px solid #EF9A9A", borderRadius: 12, padding: "12px 16px", fontSize: 13, color: "#B71C1C", lineHeight: 1.6 }}>
                    <strong>🛑 Never donate:</strong> Spoiled, smells off, colour changed, left uncovered, or cooked over 6 hours ago.
                  </div>
                </>
              )}
            </div>

            {/* ── ACTIONS ── */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Btn onClick={() => window.open(`tel:${matched.phone}`)} style={{ flex: 1, background: "#E8F5E9", color: "#2E7D32", padding: "14px", borderRadius: 12, fontSize: 14, border: "1px solid #A5D6A7" }}>
                📞 Call {LABEL_MAP[matched.type]}
              </Btn>
              <Btn onClick={() => navigate("donor")} style={{ flex: 1, background: gradAccent, color: C.white, padding: "14px", borderRadius: 12, fontSize: 14 }}>
                🍱 Donate again
              </Btn>
              <Btn onClick={() => navigate("home")} style={{ flex: 1, background: C.purplePale, color: C.purple, padding: "14px", borderRadius: 12, fontSize: 14 }}>
                🏠 Home
              </Btn>
            </div>
          </>}

          {!matched && (
            <div className="si" style={{ background: C.white, borderRadius: 24, padding: "48px", textAlign: "center", boxShadow: `0 24px 64px ${C.purple}18` }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>😔</div>
              <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, fontWeight: 700, color: C.dark, marginBottom: 12 }}>No match found today</h3>
              <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>All nearby receivers have been served or are not in need. Please try again tomorrow.</p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <Btn onClick={() => navigate("donor")} style={{ background: gradAccent, color: C.white, padding: "13px 28px", borderRadius: 50 }}>Try again</Btn>
                <Btn onClick={() => navigate("home")} style={{ background: C.purplePale, color: C.purple, padding: "13px 28px", borderRadius: 50 }}>Back to home</Btn>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
