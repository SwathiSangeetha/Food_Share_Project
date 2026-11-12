import { useState, useRef, useEffect } from "react";
import { C, gradAccent, gradBanner, Btn, StepBar, Navbar, isValidPhone } from "../shared";
import { loadMaps, smartGeocode, detectCity } from "../mapsUtil";
import { fetchNearbyReceivers, submitDonation } from "../api";

const STEPS = ["Your details", "Food info", "Review & map"];

// ── Each food item has its own name, quantity, unit ───────────
const newFoodItem = () => ({
  id:       Date.now() + Math.random(),
  name:     "",
  quantity: "",
  unit:     "kg",
});

const empty = {
  name: "", email: "", phone: "",
  foodItems:  [newFoodItem()],   // ← multiple food items
  cookedDate: "", cookedTime: "",
  foodType:   "veg",
  city:       "",
  pickupAddress: "",
  landmark:   "",
};

const iStyle = {
  padding: "12px 16px", borderRadius: 12, width: "100%", boxSizing: "border-box",
  border: `1.5px solid ${C.purpleLight}88`, fontSize: 15,
  fontFamily: "'DM Sans',sans-serif", color: C.dark,
  background: C.white, outline: "none", transition: "border-color 0.2s",
};

function Field({ label, type = "text", name, value, onChange, placeholder, required, hint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: C.mid }}>
        {label}{required && <span style={{ color: C.pink }}> *</span>}
      </label>
      {type === "textarea"
        ? <textarea name={name} value={value} onChange={onChange} placeholder={placeholder}
            required={required} rows={3}
            style={{ ...iStyle, resize: "vertical" }}
            onFocus={e => e.target.style.borderColor = C.purple}
            onBlur={e => e.target.style.borderColor = `${C.purpleLight}88`}
          />
        : <input type={type} name={name} value={value} onChange={onChange}
            placeholder={placeholder} required={required} style={iStyle}
            onFocus={e => e.target.style.borderColor = C.purple}
            onBlur={e => e.target.style.borderColor = `${C.purpleLight}88`}
          />
      }
      {hint && <span style={{ fontSize: 12, color: C.muted }}>{hint}</span>}
    </div>
  );
}

// ── Google Map ────────────────────────────────────────────────
function LiveMap({ donorLat, donorLng, donorLabel, ranked }) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => { loadMaps(() => setReady(true)); }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !donorLat || !window.google?.maps) return;
    if (mapObj.current) return;
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: donorLat, lng: donorLng }, zoom: 13,
      mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
    });
    mapObj.current = map;
    const infoWin = new window.google.maps.InfoWindow();
    const PIN = { ngo: "#995ccf", temple: "#e14099", hospital: "#2E7D32" };
    const ICO = { ngo: "🏛️", temple: "🛕", hospital: "🏥" };

    const dp = new window.google.maps.Marker({
      position: { lat: donorLat, lng: donorLng }, map,
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 14, fillColor: "#7B2FBE", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 },
      zIndex: 20,
    });
    dp.addListener("click", () => {
      infoWin.setContent(`<div style="font-family:sans-serif;padding:6px"><b>📍 Your pickup</b><br/><small>${donorLabel}</small></div>`);
      infoWin.open(map, dp);
    });

    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend({ lat: donorLat, lng: donorLng });
    ranked.forEach((r, i) => {
      const isTop = i === 0 && !r.servedToday && r.score > 0;
      const color = isTop ? "#e14099" : r.servedToday ? "#bbb" : PIN[r.type] || "#995ccf";
      bounds.extend({ lat: r.lat, lng: r.lng });
      const m = new window.google.maps.Marker({
        position: { lat: r.lat, lng: r.lng }, map,
        label: { text: String(i + 1), color: "#fff", fontSize: "11px", fontWeight: "700" },
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: isTop ? 17 : 12, fillColor: color, fillOpacity: r.servedToday ? 0.35 : 1, strokeColor: "#fff", strokeWeight: isTop ? 3 : 2 },
        zIndex: isTop ? 15 : 5,
      });
      new window.google.maps.Polyline({ path: [{ lat: donorLat, lng: donorLng }, { lat: r.lat, lng: r.lng }], map, strokeColor: isTop ? "#e14099" : "#ccc", strokeOpacity: isTop ? 0.85 : 0.3, strokeWeight: isTop ? 2.5 : 1 });
      m.addListener("click", () => {
        infoWin.setContent(`<div style="font-family:'DM Sans',sans-serif;padding:8px;min-width:210px"><b style="font-size:14px">${ICO[r.type]} ${r.name}</b><div style="color:#666;font-size:12px;margin:4px 0 2px">📍 ${r.address}</div><div style="color:#666;font-size:12px;margin-bottom:2px">📞 ${r.phone || "—"}</div><div style="color:#666;font-size:12px;margin-bottom:6px">📏 ${r.distanceKm} km · 👥 ${r.capacity}/day</div><div style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:${isTop ? "#E8F5E9" : r.inNeed ? "#F3E8FF" : r.servedToday ? "#FFF3E0" : "#F5F5F5"};color:${isTop ? "#2E7D32" : r.inNeed ? "#7B2FBE" : r.servedToday ? "#E65100" : "#888"}">${isTop ? "✅ Best match" : r.inNeed ? "🔵 In need" : r.servedToday ? "⚠️ Served today" : "📍 Available"}</div></div>`);
        infoWin.open(map, m);
      });
    });
    if (ranked.length > 0) map.fitBounds(bounds, { padding: 70 });
  }, [ready, donorLat, donorLng, ranked]);

  return (
    <div>
      {(!ready || !donorLat) && (
        <div style={{ height: 360, borderRadius: 14, background: C.offWhite, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10, border: `1px solid ${C.purpleLight}44` }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", border: `3px solid ${C.purpleLight}`, borderTopColor: C.pink, animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: 13, color: C.muted }}>{!ready ? "Loading Google Maps…" : "Locating your address…"}</span>
        </div>
      )}
      <div ref={mapRef} style={{ height: 360, borderRadius: 14, display: ready && donorLat ? "block" : "none", border: `1px solid ${C.purpleLight}44`, overflow: "hidden" }} />
      {ready && donorLat && (
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 10 }}>
          {[{ col: "#7B2FBE", l: "You" }, { col: "#e14099", l: "Best match" }, { col: "#995ccf", l: "NGO" }, { col: "#e14099", l: "Temple" }, { col: "#2E7D32", l: "Hospital" }, { col: "#bbb", l: "Served today" }].map(x => (
            <div key={x.l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.mid }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: x.col }} />{x.l}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Pipeline({ stages }) {
  return (
    <div style={{ background: C.offWhite, borderRadius: 14, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
      {stages.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, background: s.status === "done" ? "#E8F5E9" : s.status === "active" ? C.purplePale : s.status === "error" ? "#FFEBEE" : "#F5F5F5" }}>
            {s.status === "done" ? "✅" : s.status === "active" ? <div style={{ width: 12, height: 12, borderRadius: "50%", border: `2px solid ${C.purpleLight}`, borderTopColor: C.pink, animation: "spin 1s linear infinite" }} /> : s.status === "error" ? "❌" : "⏸️"}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: s.status === "done" ? "#2E7D32" : s.status === "active" ? C.purple : s.status === "error" ? "#C62828" : C.muted }}>{s.label}</div>
            {s.detail && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{s.detail}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DonorRegister({ navigate, user, onLogout }) {
  const [step, setStep]       = useState(0);
  const [form, setForm]       = useState(empty);
  const [loading, setLoading] = useState(false);
  const [step0Error, setStep0Error] = useState("");

  const handleStep0Continue = () => {
    setStep0Error("");
    if (!isValidPhone(form.phone)) {
      setStep0Error("Please enter a valid 10-digit mobile number (e.g. 9876543210).");
      return;
    }
    setStep(1);
  };

  const [mlResults, setMlResults]       = useState(null);
  const [donorPos, setDonorPos]         = useState(null);
  const [resolvedCity, setResolvedCity] = useState("");
  const [geoLabel, setGeoLabel]         = useState("");
  const [stages, setStages]             = useState([]);
  const [running, setRunning]           = useState(false);
  const [pipeErr, setPipeErr]           = useState("");

  const [cityHint, setCityHint] = useState("");
  useEffect(() => {
    const detected = detectCity(`${form.city} ${form.pickupAddress}`);
    setCityHint(detected || "");
  }, [form.city, form.pickupAddress]);

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  // ── Food item helpers ─────────────────────────────────────
  const updateFoodItem = (id, field, value) => {
    setForm(f => ({ ...f, foodItems: f.foodItems.map(item => item.id === id ? { ...item, [field]: value } : item) }));
  };
  const addFoodItem = () => {
    setForm(f => ({ ...f, foodItems: [...f.foodItems, newFoodItem()] }));
  };
  const removeFoodItem = (id) => {
    setForm(f => ({ ...f, foodItems: f.foodItems.filter(item => item.id !== id) }));
  };

  // Derived summary fields for ML & submit
  const foodSummaryName = form.foodItems.map(i => i.name).filter(Boolean).join(", ");
  const foodSummaryQty  = form.foodItems.reduce((s, i) => s + (parseFloat(i.quantity) || 0), 0);
  const allFoodFilled   = form.foodItems.every(i => i.name.trim() && i.quantity);

  const combinedDT = form.cookedDate && form.cookedTime
    ? new Date(`${form.cookedDate}T${form.cookedTime}`) : null;

  const safety = (() => {
    if (!combinedDT) return null;
    const hrs = (new Date() - combinedDT) / 3600000;
    if (hrs < 0)  return { ok: false, msg: "⚠️ Cooked time is in the future." };
    if (hrs > 6)  return { ok: false, msg: "🚫 Food cooked more than 6 hours ago — not safe to donate." };
    if (hrs > 3)  return { ok: true, warn: true, msg: `✅ Safe but ageing (${Math.round(hrs)}h old) — deliver within 1 hour.` };
    return          { ok: true, msg: "✅ Food is fresh and safe to donate." };
  })();

  const upd = (idx, patch) => setStages(s => s.map((x, i) => i === idx ? { ...x, ...patch } : x));

  const runPipeline = async () => {
    setRunning(true); setMlResults(null); setDonorPos(null); setPipeErr("");
    setStages([
      { label: "Step 1 — Detecting city from your address",          status: "waiting", detail: "" },
      { label: "Step 2 — Locating your pickup point on Google Maps", status: "waiting", detail: "" },
      { label: "Step 3 — Fetching ALL real NGOs & temples from DB",          status: "waiting", detail: "" },
      { label: "Step 4 — ML ranks by exact distance from your address",       status: "waiting", detail: "" },
    ]);
    try {
      upd(0, { status: "active", detail: `Scanning: "${form.city}" and "${form.pickupAddress}"…` });
      await new Promise(r => setTimeout(r, 300));
      const geo  = await smartGeocode(form.city, form.pickupAddress);
      const city = geo.city || "Kanchipuram";
      upd(0, { status: "done", detail: `City identified: ${city}` });
      upd(1, { status: "active", detail: `Pinpointing: "${form.pickupAddress || form.city}"…` });
      setDonorPos({ lat: geo.lat, lng: geo.lng });
      setGeoLabel(geo.formattedAddress);
      setResolvedCity(city);
      upd(1, { status: "done", detail: geo.isApproximate ? `📍 ${geo.formattedAddress} (city center)` : `📍 ${geo.formattedAddress}` });
      upd(2, { status: "active", detail: `Searching all NGOs & temples near your location…` });
      let receivers = [];
      try {
        receivers = await fetchNearbyReceivers({ lat: geo.lat, lng: geo.lng, qty: foodSummaryQty || 10, foodType: form.foodType || "veg" });
      } catch {
        upd(2, { status: "error", detail: "Backend not reachable. Run: npm run dev" });
        setPipeErr("network"); setRunning(false); return;
      }
      if (!receivers || receivers.length === 0) {
        upd(2, { status: "error", detail: `No receivers found for "${city}". Run: npm run seed` });
        setPipeErr("no_results"); setRunning(false); return;
      }
      upd(2, { status: "done", detail: `${receivers.length} real NGOs & temples found near your address` });
      upd(3, { status: "active", detail: "Scoring by distance, need, food type, capacity…" });
      await new Promise(r => setTimeout(r, 400));
      setMlResults(receivers);
      const best = receivers.find(r => r.score > 0 && !r.servedToday);
      upd(3, { status: "done", detail: best ? `Best match: ${best.name} (${best.distanceKm} km, score ${best.score})` : "No available receiver found today" });
    } catch (err) {
      console.error(err);
      upd(0, { status: "error", detail: "Unexpected error. Check console." });
      setPipeErr("error");
    }
    setRunning(false);
  };

  const enterReview = () => { setStep(2); runPipeline(); };
  const bestMatch = mlResults?.find(r => r.score > 0 && !r.servedToday) || null;

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await submitDonation({
        donorName: form.name, donorEmail: form.email, donorPhone: form.phone,
        foodName:  foodSummaryName,
        foodItems: form.foodItems,
        quantity:  foodSummaryQty,
        unit:      "mixed",
        foodType:  form.foodType,
        cookedAt:  combinedDT?.toISOString(),
        pickupAddress: form.pickupAddress, location: form.city, city: resolvedCity,
        landmark: form.landmark, donorLat: donorPos?.lat, donorLng: donorPos?.lng,
        matchedReceiverId: bestMatch?._id || bestMatch?.id, mlScore: bestMatch?.score, status: "assigned",
      });
    } catch (err) { console.warn("submitDonation failed:", err); }
    setTimeout(() => {
      setLoading(false);
      navigate("match", { ...form, foodName: foodSummaryName, quantity: foodSummaryQty, unit: "kg", cookedAt: combinedDT?.toISOString() || "", mlResults, matched: bestMatch, donorLat: donorPos?.lat, donorLng: donorPos?.lng, geocodedAddress: geoLabel, resolvedCity });
    }, 800);
  };

  if (loading) return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:${C.bg}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: C.bg, gap: 24 }}>
        <div style={{ width: 60, height: 60, borderRadius: "50%", border: `4px solid ${C.purpleLight}`, borderTopColor: C.pink, animation: "spin 1s linear infinite" }} />
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, fontWeight: 700, color: C.dark }}>Confirming donation…</h2>
        {["✅ Match confirmed", "📱 Sending demo alerts", "📋 Saving to database"].map((t, i) => (
          <div key={i} style={{ fontSize: 14, color: C.muted, animation: `blink 1.5s ease ${i * .4}s infinite` }}>{t}</div>
        ))}
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
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeIn .5s ease both}
        .food-row{animation:slideDown .3s ease both}
        @media(max-width:860px){.review-grid{grid-template-columns:1fr!important}}
      `}</style>

      {/* Navbar */}
      <Navbar navigate={navigate} user={user} onLogout={onLogout} scrolled={true} />

      <div style={{ minHeight: "100vh", paddingTop: 80, background: C.bg }}>
        <div style={{ background: gradBanner, padding: "48px 40px 80px", textAlign: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 3, color: "rgba(255,255,255,0.7)", textTransform: "uppercase" }}>Donate food</span>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(28px,4vw,44px)", fontWeight: 700, color: C.white, marginTop: 10 }}>Share Your Extra Food</h1>
          <p style={{ color: "rgba(255,255,255,0.75)", marginTop: 10, fontSize: 16 }}>Add one or more food items · ML finds the best nearby receiver</p>
        </div>

        <div style={{ maxWidth: step === 2 ? 980 : 640, margin: "-48px auto 60px", padding: "0 24px", transition: "max-width 0.4s ease" }}>
          <div style={{ background: C.white, borderRadius: 24, padding: "40px 48px", boxShadow: `0 24px 64px ${C.purple}18` }}>
            <StepBar steps={STEPS} current={step} />
            <form onSubmit={submit}>

              {/* ── STEP 0 ── */}
              {step === 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: C.dark }}>Your details</h3>
                  <Field label="Your name" name="name" value={form.name} onChange={set} placeholder="e.g. Ramesh Kumar / ABC Catering" required />
                  <Field label="Email address" type="email" name="email" value={form.email} onChange={set} placeholder="your@email.com" required />
                  <div>
                    <Field label="Phone number" type="tel" name="phone" value={form.phone} onChange={set} placeholder="9876543210" required hint="We'll send donation updates to this number" />
                    <span style={{ fontSize: 11, color: C.muted, display: "block", marginTop: 4 }}>
                      📱 Must be a valid 10-digit mobile number.
                    </span>
                  </div>

                  {step0Error && (
                    <div style={{ color: "#C62828", background: "#FFEBEE", border: "1px solid #EF9A9A", padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                      ⚠️ {step0Error}
                    </div>
                  )}

                  <Btn onClick={handleStep0Continue} disabled={!form.name || !form.email || !form.phone}
                    style={{ background: gradAccent, color: C.white, padding: "14px", borderRadius: 12, fontSize: 15, marginTop: 8 }}>
                    Continue →
                  </Btn>
                </div>
              )}

              {/* ── STEP 1 ── */}
              {step === 1 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: C.dark }}>Food details</h3>

                  {/* ── MULTI-FOOD ITEMS ── */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: C.mid }}>
                        Food items <span style={{ color: C.pink }}>*</span>
                        <span style={{ fontSize: 11, color: C.muted, fontWeight: 400, marginLeft: 8 }}>You can add multiple items</span>
                      </label>
                      {form.foodItems.length > 0 && (
                        <span style={{ fontSize: 12, color: C.purple, fontWeight: 600 }}>
                          Total: ~{foodSummaryQty} units
                        </span>
                      )}
                    </div>

                    {/* Column headers */}
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 36px", gap: 8, paddingLeft: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Food Name</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Qty</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Unit</span>
                      <span />
                    </div>

                    {/* Food item rows */}
                    {form.foodItems.map((item, idx) => (
                      <div key={item.id} className="food-row" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 36px", gap: 8, alignItems: "center", background: C.offWhite, borderRadius: 12, padding: "10px 12px", border: `1.5px solid ${C.purpleLight}22` }}>
                        {/* Food name */}
                        <input
                          value={item.name}
                          onChange={e => updateFoodItem(item.id, "name", e.target.value)}
                          placeholder={`e.g. ${["Sambar rice", "Chapati", "Biryani", "Dal", "Idli"][idx % 5]}`}
                          required
                          style={{ ...iStyle, padding: "10px 12px", background: C.white }}
                          onFocus={e => e.target.style.borderColor = C.purple}
                          onBlur={e => e.target.style.borderColor = `${C.purpleLight}88`}
                        />
                        {/* Quantity */}
                        <input
                          type="number" min="0.1" step="0.1"
                          value={item.quantity}
                          onChange={e => updateFoodItem(item.id, "quantity", e.target.value)}
                          placeholder="e.g. 5"
                          required
                          style={{ ...iStyle, padding: "10px 12px", background: C.white }}
                          onFocus={e => e.target.style.borderColor = C.purple}
                          onBlur={e => e.target.style.borderColor = `${C.purpleLight}88`}
                        />
                        {/* Unit */}
                        <select
                          value={item.unit}
                          onChange={e => updateFoodItem(item.id, "unit", e.target.value)}
                          style={{ ...iStyle, padding: "10px 10px", background: C.white, cursor: "pointer" }}
                        >
                          <option value="kg">kg</option>
                          <option value="plates">plates</option>
                          <option value="litres">litres</option>
                          <option value="packets">packets</option>
                          <option value="boxes">boxes</option>
                          <option value="pieces">pieces</option>
                        </select>
                        {/* Remove button */}
                        {form.foodItems.length > 1 ? (
                          <button type="button" onClick={() => removeFoodItem(item.id)}
                            style={{ width: 30, height: 30, borderRadius: "50%", background: "#FFEBEE", border: "none", color: "#C62828", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            ✕
                          </button>
                        ) : (
                          <div style={{ width: 30 }} />
                        )}
                      </div>
                    ))}

                    {/* Add another item button */}
                    <button type="button" onClick={addFoodItem}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", borderRadius: 10, background: C.white, border: `1.5px dashed ${C.purple}`, color: C.purple, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", width: "fit-content", transition: "background 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.purplePale}
                      onMouseLeave={e => e.currentTarget.style.background = C.white}
                    >
                      <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
                      Add another food item
                    </button>

                    {/* Summary pill when multiple items */}
                    {form.foodItems.length > 1 && allFoodFilled && (
                      <div style={{ background: C.purplePale, border: `1px solid ${C.purpleLight}`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: C.purple }}>
                        <strong>📋 Summary:</strong> {form.foodItems.filter(i => i.name).map(i => `${i.name} (${i.quantity} ${i.unit})`).join(" · ")}
                      </div>
                    )}
                  </div>

                  {/* Food type */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: C.mid }}>Overall food type <span style={{ color: C.pink }}>*</span></label>
                    <div style={{ display: "flex", gap: 10 }}>
                      {[{ v: "veg", l: "🌿 All Vegetarian" }, { v: "nonveg", l: "🍗 Includes Non-veg" }].map(opt => (
                        <div key={opt.v} onClick={() => setForm(f => ({ ...f, foodType: opt.v }))} style={{ flex: 1, padding: "12px", borderRadius: 12, textAlign: "center", border: `2px solid ${form.foodType === opt.v ? C.purple : `${C.purpleLight}66`}`, background: form.foodType === opt.v ? C.purplePale : C.white, color: form.foodType === opt.v ? C.purple : C.muted, cursor: "pointer", fontWeight: 600, fontSize: 14, transition: "all 0.2s" }}>{opt.l}</div>
                      ))}
                    </div>
                    <span style={{ fontSize: 12, color: C.muted }}>If even one item is non-veg, select "Includes Non-veg"</span>
                  </div>

                  {/* Date + Time */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: C.mid }}>When was the food cooked? <span style={{ color: C.pink }}>*</span></label>
                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>📅 Date</span>
                        <input type="date" name="cookedDate" value={form.cookedDate} onChange={set} required max={new Date().toISOString().split("T")[0]} style={iStyle} onFocus={e => e.target.style.borderColor = C.purple} onBlur={e => e.target.style.borderColor = `${C.purpleLight}88`} />
                      </div>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>🕐 Time</span>
                        <input type="time" name="cookedTime" value={form.cookedTime} onChange={set} required style={iStyle} onFocus={e => e.target.style.borderColor = C.purple} onBlur={e => e.target.style.borderColor = `${C.purpleLight}88`} />
                      </div>
                    </div>
                    {safety && (
                      <div style={{ background: safety.ok ? (safety.warn ? "#FFF8E1" : "#E8F5E9") : "#FFEBEE", border: `1px solid ${safety.ok ? (safety.warn ? "#FFD54F" : "#A5D6A7") : "#EF9A9A"}`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: safety.ok ? (safety.warn ? "#E65100" : "#2E7D32") : "#C62828", fontWeight: 500 }}>{safety.msg}</div>
                    )}
                  </div>

                  {/* City */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: C.mid }}>Your city / area <span style={{ color: C.pink }}>*</span></label>
                    <input name="city" value={form.city} onChange={set} required placeholder="e.g. Kanchipuram or Sriperumbadur" list="city-suggestions" style={iStyle} onFocus={e => e.target.style.borderColor = C.purple} onBlur={e => e.target.style.borderColor = `${C.purpleLight}88`} />
                    <datalist id="city-suggestions">
                      <option value="Kanchipuram" /><option value="Sriperumbadur" />
                    </datalist>
                    {cityHint && cityHint !== form.city && (
                      <div style={{ background: "#E8F5E9", border: "1px solid #A5D6A7", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#2E7D32", display: "flex", alignItems: "center", gap: 8 }}>
                        ✅ <span>Detected city: <strong>{cityHint}</strong> — NGOs & temples from {cityHint} will be fetched</span>
                      </div>
                    )}
                  </div>

                  <Field label="Full pickup address" type="textarea" name="pickupAddress" value={form.pickupAddress} onChange={set} placeholder="e.g. No 36/107, Gandhi Road, Kanchipuram 631501" required hint="Full address where the receiver collects from" />
                  <Field label="Landmark (optional)" name="landmark" value={form.landmark} onChange={set} placeholder="e.g. Near bus stand, opposite temple" />

                  <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                    <Btn onClick={() => setStep(0)} style={{ flex: 1, background: C.purplePale, color: C.purple, padding: "14px", borderRadius: 12 }}>← Back</Btn>
                    <Btn onClick={enterReview}
                      disabled={!allFoodFilled || !form.cookedDate || !form.cookedTime || !form.pickupAddress || !form.city || (safety && !safety.ok)}
                      style={{ flex: 2, background: gradAccent, color: C.white, padding: "14px", borderRadius: 12 }}>
                      Find nearby NGOs from database →
                    </Btn>
                  </div>
                </div>
              )}

              {/* ── STEP 2 ── */}
              {step === 2 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                    <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: C.dark }}>
                      Nearby receivers{resolvedCity ? ` in ${resolvedCity}` : ""}
                    </h3>
                    {geoLabel && (
                      <div style={{ fontSize: 12, background: "#E8F5E9", color: "#2E7D32", borderRadius: 20, padding: "5px 14px", fontWeight: 600, maxWidth: 320, textAlign: "right" }}>
                        📍 {geoLabel}
                      </div>
                    )}
                  </div>

                  <div className="review-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    {/* Left */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {/* Summary */}
                      <div style={{ background: C.purplePale, borderRadius: 16, padding: "18px", border: `1px solid ${C.purpleLight}66` }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.purple, marginBottom: 10, letterSpacing: 0.5 }}>YOUR DONATION</div>
                        {/* Food items list */}
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.purple, marginBottom: 6 }}>🍱 Food Items ({form.foodItems.length})</div>
                          {form.foodItems.map((item, idx) => (
                            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.purpleLight}22`, fontSize: 13 }}>
                              <span style={{ color: C.mid }}>#{idx + 1} {item.name}</span>
                              <span style={{ color: C.dark, fontWeight: 600 }}>{item.quantity} {item.unit}</span>
                            </div>
                          ))}
                          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                            <span style={{ color: C.purple, fontWeight: 700 }}>Total quantity</span>
                            <span style={{ color: C.purple, fontWeight: 700 }}>~{foodSummaryQty} units</span>
                          </div>
                        </div>

                        {[
                          ["👤 Donor",   form.name],
                          ["🌿 Type",    form.foodType === "veg" ? "All Vegetarian" : "Includes Non-veg"],
                          ["📅 Date",    form.cookedDate ? new Date(form.cookedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"],
                          ["🕐 Time",    form.cookedTime ? (() => { const [h, m] = form.cookedTime.split(":"); const hh = parseInt(h); return `${hh % 12 || 12}:${m} ${hh >= 12 ? "PM" : "AM"}`; })() : "—"],
                          ["🏙️ City",    resolvedCity || form.city],
                          ["📍 Pickup",  form.pickupAddress],
                        ].map(([k, v]) => (
                          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.purpleLight}33`, fontSize: 13 }}>
                            <span style={{ color: C.muted }}>{k}</span>
                            <span style={{ color: C.dark, fontWeight: 600, textAlign: "right", maxWidth: "55%", fontSize: 12 }}>{v || "—"}</span>
                          </div>
                        ))}
                      </div>

                      {/* Pipeline */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.purple, marginBottom: 8, letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 8 }}>
                          🤖 ML PIPELINE
                          {running && <div style={{ width: 11, height: 11, borderRadius: "50%", border: `2px solid ${C.purpleLight}`, borderTopColor: C.pink, animation: "spin 1s linear infinite" }} />}
                          {!running && mlResults && <span style={{ fontSize: 11, color: "#2E7D32", fontWeight: 600 }}>✅ {mlResults.length} receivers from DB</span>}
                        </div>
                        {stages.length > 0 && <Pipeline stages={stages} />}
                        {pipeErr === "network" && !running && (
                          <div style={{ marginTop: 10, background: "#FFEBEE", border: "1px solid #EF9A9A", borderRadius: 12, padding: "14px 16px", fontSize: 13, color: "#C62828" }}>
                            <div style={{ fontWeight: 600, marginBottom: 6 }}>Backend not reachable</div>
                            <div style={{ color: C.muted, marginBottom: 10 }}>Run: <code style={{ background: "#f5f5f5", padding: "2px 6px", borderRadius: 4 }}>cd foodshare-backend && npm run dev</code></div>
                            <Btn onClick={runPipeline} style={{ background: gradAccent, color: C.white, padding: "9px 18px", borderRadius: 50, fontSize: 13 }}>Retry</Btn>
                          </div>
                        )}
                        {pipeErr === "no_results" && !running && (
                          <div style={{ marginTop: 10, background: "#FFF3E0", border: "1px solid #FFCC80", borderRadius: 12, padding: "14px 16px", fontSize: 13, color: "#E65100" }}>
                            <div style={{ fontWeight: 600, marginBottom: 6 }}>No receivers found for "{resolvedCity}"</div>
                            <div style={{ color: C.muted, marginBottom: 10 }}>Run: <code>node seed/seedData.js</code></div>
                            <Btn onClick={runPipeline} style={{ background: gradAccent, color: C.white, padding: "9px 18px", borderRadius: 50, fontSize: 13 }}>Try again</Btn>
                          </div>
                        )}
                        {mlResults && !running && (
                          <div className="fade-in" style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8, maxHeight: 280, overflowY: "auto" }}>
                            {mlResults.map((r, i) => {
                              const isTop = i === 0 && !r.servedToday && r.score > 0;
                              return (
                                <div key={r.id || r._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: isTop ? C.purplePale : r.servedToday ? "#FFF3E0" : C.offWhite, border: `1.5px solid ${isTop ? C.purple : r.servedToday ? "#FFCC8088" : C.purpleLight + "22"}` }}>
                                  <div style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0, background: isTop ? gradAccent : `${C.purpleLight}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: isTop ? C.white : C.muted }}>{i + 1}</div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                      {r.type === "ngo" ? "🏛️" : r.type === "temple" ? "🛕" : "🏥"} {r.name}
                                    </div>
                                    <div style={{ fontSize: 11, color: C.muted }}>{r.distanceKm} km · {r.address}</div>
                                  </div>
                                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: C.purple }}>Score {r.score}</div>
                                    <div style={{ fontSize: 10, fontWeight: 700, borderRadius: 20, padding: "2px 8px", background: isTop ? "#E8F5E9" : r.inNeed ? C.purplePale : r.servedToday ? "#FFF3E0" : "#F5F5F5", color: isTop ? "#2E7D32" : r.inNeed ? C.purple : r.servedToday ? "#E65100" : C.muted }}>
                                      {isTop ? "✅ Best match" : r.inNeed ? "🔵 In need" : r.servedToday ? "⚠️ Served" : "📍 Available"}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Map */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.purple, marginBottom: 8, letterSpacing: 0.5 }}>
                        📍 GOOGLE MAP — {(resolvedCity || form.city).toUpperCase()}
                        <span style={{ marginLeft: 8, fontSize: 11, color: C.muted, fontWeight: 400 }}>Click any pin for details</span>
                      </div>
                      <LiveMap donorLat={donorPos?.lat} donorLng={donorPos?.lng} donorLabel={geoLabel} ranked={mlResults || []} />
                    </div>
                  </div>

                  {safety?.warn && (
                    <div style={{ background: "#FFF8E1", border: "1px solid #FFD54F", borderRadius: 12, padding: "12px 14px", fontSize: 13, color: "#E65100" }}>
                      <strong>⚠️</strong> Deliver within the next hour — food is close to the safe time limit.
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 12, borderTop: `1px solid ${C.purpleLight}33`, paddingTop: 20 }}>
                    <Btn onClick={() => setStep(1)} style={{ flex: 1, background: C.purplePale, color: C.purple, padding: "14px", borderRadius: 12 }}>← Back</Btn>
                    <Btn type="submit" disabled={running || !mlResults || !bestMatch}
                      style={{ flex: 3, background: gradAccent, color: C.white, padding: "14px", borderRadius: 12, fontSize: 15, boxShadow: `0 6px 24px ${C.pink}44` }}>
                      {running ? "⏳ Loading…" : !mlResults ? "⏳ Analysing…" : !bestMatch ? "❌ No receiver available today" : `🚀 Confirm — Assign to ${bestMatch.name}`}
                    </Btn>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      </div>
    </>
  );
}
