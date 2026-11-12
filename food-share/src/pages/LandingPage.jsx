import { useState, useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
import { C, gradAccent, gradHero, gradBanner, Btn } from "../shared";
import { store } from "../store";

function FadeIn({ children, delay = 0 }) {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.style.opacity = "1"; el.style.transform = "translateY(0)"; }
    }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: 0, transform: "translateY(32px)", transition: `opacity 0.75s ease ${delay}s, transform 0.75s ease ${delay}s` }}>
      {children}
    </div>
  );
}

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

const URGENCY = {
  high:   { bg: "#FFEBEE", color: "#C62828", label: "🔴 Urgent" },
  medium: { bg: "#FFF8E1", color: "#E65100", label: "🟡 Needed" },
  low:    { bg: "#E8F5E9", color: "#2E7D32", label: "🟢 Requested" },
};
const TYPE_ICON  = { ngo: "🏛️", temple: "🛕", hospital: "🏥" };
const TYPE_LABEL = { ngo: "NGO", temple: "Temple", hospital: "Hospital" };

export default function LandingPage({ navigate, user, onLogout }) {
  const [scrolled, setScrolled]   = useState(false);
  const [needPosts, setNeedPosts] = useState([...store.needPosts]);
  const [newPostId, setNewPostId] = useState(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Subscribe to store — updates when NGO submits form
  useEffect(() => {
    const unsub = store.subscribe(posts => {
      setNeedPosts([...posts]);
      setNewPostId(posts[0]?.id || null);
      setTimeout(() => setNewPostId(null), 3000);
    });
    return unsub;
  }, []);

  const sec       = { padding: "100px 0", width: "100%" };
  const container = { maxWidth: 1100, margin: "0 auto", padding: "0 40px" };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{font-family:'DM Sans',sans-serif;margin:0;padding:0;background:${C.bg};color:${C.dark};overflow-x:hidden}
        img{display:block}
        @keyframes fadeUp{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes pulse{0%,100%{box-shadow:0 0 0 0 ${C.pink}55}60%{box-shadow:0 0 0 14px ${C.pink}00}}
        @keyframes slideIn{from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:translateY(0)}}
        .ht1{animation:fadeUp .85s ease .1s both}
        .ht2{animation:fadeUp .85s ease .3s both}
        .ht3{animation:fadeUp .85s ease .5s both}
        .ht4{animation:fadeUp .85s ease .7s both}
        .float{animation:float 3.2s ease-in-out infinite}
        .new-card{animation:slideIn .45s ease both;outline:2px solid ${C.pink};outline-offset:2px}
        @media(max-width:820px){
          .two-col{grid-template-columns:1fr!important}
          .steps-grid{grid-template-columns:1fr 1fr!important}
          .stats-grid{grid-template-columns:1fr!important}
          .hero-btns{flex-direction:column!important;align-items:center!important}
          .need-grid{grid-template-columns:1fr!important}
        }
        @media(max-width:480px){.steps-grid{grid-template-columns:1fr!important}}
      `}</style>

      <div style={{ background: C.bg }}>

        {/* ── NAVBAR ── */}
        <nav style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: scrolled ? "14px 40px" : "22px 40px",
          background: scrolled ? "rgba(255,255,255,0.97)" : "transparent",
          boxShadow: scrolled ? `0 2px 24px ${C.purple}18` : "none",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          transition: "all 0.3s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: gradAccent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🍱</div>
            <span style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, fontWeight: 700, color: scrolled ? C.dark : C.white, transition: "color 0.3s" }}>FoodShare</span>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {user ? (
              <>
                {user.role === "admin" && (
                  <Btn onClick={() => navigate("/admin-dashboard")} style={{ background: scrolled ? C.purplePale : "rgba(255,255,255,0.18)", color: scrolled ? C.purple : C.white, padding: "9px 22px", borderRadius: 50, border: scrolled ? `1.5px solid ${C.purpleLight}` : "1.5px solid rgba(255,255,255,0.4)" }}>Dashboard</Btn>
                )}
                <Btn onClick={onLogout} style={{ background: "transparent", color: scrolled ? C.mid : C.white, padding: "9px 18px", borderRadius: 50, border: scrolled ? `1.5px solid ${C.purpleLight}` : "1.5px solid rgba(255,255,255,0.4)" }}>Logout</Btn>
              </>
            ) : (
              <Btn onClick={() => navigate("/")} style={{ background: scrolled ? C.purplePale : "rgba(255,255,255,0.18)", color: scrolled ? C.purple : C.white, padding: "9px 22px", borderRadius: 50, border: scrolled ? `1.5px solid ${C.purpleLight}` : "1.5px solid rgba(255,255,255,0.4)" }}>Login</Btn>
            )}
            <Btn onClick={() => navigate("ngo")} style={{ background: gradAccent, color: C.white, padding: "9px 22px", borderRadius: 50, boxShadow: `0 4px 18px ${C.pink}44` }}>Join Us</Btn>
          </div>
        </nav>

        {/* ── HERO ── */}
        <div style={{ position: "relative", width: "100%", height: "100vh", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", overflow: "hidden" }}>
          <img src="https://t3.ftcdn.net/jpg/05/01/47/88/360_F_501478827_eDHczzbWUeA3YZaiXDPV8milCG77yD6x.jpg" alt="" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
          <div style={{ position: "absolute", inset: 0, background: gradHero }} />

          <div className="float" style={{ position: "absolute", top: "20%", right: "8%", background: C.white, borderRadius: 14, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, boxShadow: `0 8px 32px ${C.purple}28`, fontSize: 13, fontWeight: 600, color: C.dark, zIndex: 10 }}>
            <MapPin size={15} color={C.pink} /> Sriperumbadur
          </div>

          {/* Live requests count — static, no auto-increment */}
          <div className="float" style={{ position: "absolute", bottom: "22%", left: "6%", background: C.white, borderRadius: 14, padding: "12px 18px", boxShadow: `0 8px 32px ${C.purple}28`, zIndex: 10, animationDelay: "1s" }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>Active food requests</div>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Playfair Display',serif", background: gradAccent, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              {needPosts.length} today
            </div>
          </div>

          <div style={{ position: "relative", zIndex: 10, maxWidth: 820, padding: "0 24px" }}>
            <div className="ht1" style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 50, padding: "6px 18px", fontSize: 13, color: C.white, fontWeight: 500, letterSpacing: 1, marginBottom: 28 }}>
              🌟 Food rescue platform 
            </div>
            <h1 className="ht2" style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(42px,7vw,78px)", fontWeight: 900, color: C.white, lineHeight: 1.1, marginBottom: 24 }}>
              Share Your Joy,<br />Feed a Soul
            </h1>
            <p className="ht3" style={{ fontSize: "clamp(15px,2vw,19px)", color: "rgba(255,255,255,0.88)", lineHeight: 1.75, maxWidth: 560, margin: "0 auto 44px" }}>
              Connecting bulk food donors with NGOs, temples, and hospitals across Sriperumbadur — so no meal goes to waste.
            </p>
            <div className="ht4 hero-btns" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <Btn onClick={() => navigate("/ngo-register")} style={{ background: C.white, color: C.purple, padding: "14px 32px", borderRadius: 50, fontSize: 16, boxShadow: "0 8px 28px rgba(0,0,0,0.18)", animation: "pulse 2.2s infinite" }}>
                🏛️ I am a NGO 
              </Btn>
              <Btn onClick={() => navigate("/donor-register")} style={{ background: "rgba(255,255,255,0.15)", color: C.white, padding: "14px 32px", borderRadius: 50, fontSize: 16, border: "2px solid rgba(255,255,255,0.45)" }}>
                🍽️ I am a Donar
              </Btn>
            </div>
          </div>

          <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 10 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", letterSpacing: 2, textTransform: "uppercase" }}>scroll</span>
            <div style={{ width: 1, height: 40, background: "linear-gradient(white, transparent)" }} />
          </div>
        </div>

        

        {/* ── LIVE NGO NEED FEED ── */}
        <div style={{ ...sec, background: C.purplePale }}>
          <div style={container}>
            <FadeIn>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 3, color: C.pink, textTransform: "uppercase" }}>Live feed</span>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4CAF50", boxShadow: "0 0 0 3px #4CAF5033", animation: "pulse 1.5s infinite" }} />
                  </div>
                  <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(28px,4vw,42px)", fontWeight: 700, color: C.dark }}>
                    NGOs in need of food
                  </h2>
                  <p style={{ fontSize: 14, color: C.muted, marginTop: 8 }}>
                    These organisations have posted that they need food today. New registrations appear here instantly.
                  </p>
                </div>
              </div>
            </FadeIn>

            <div className="need-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 20 }}>
              {needPosts.map((post) => {
                const urg    = URGENCY[post.urgency] || URGENCY.medium;
                const isNew  = post.id === newPostId;
                return (
                  <div key={post.id} className={isNew ? "new-card" : ""} style={{
                    background: C.white, borderRadius: 20, padding: "24px",
                    border: `1.5px solid ${post.urgency === "high" ? "#EF9A9A" : C.purpleLight + "44"}`,
                    boxShadow: `0 8px 32px ${C.purple}10`,
                    transition: "transform 0.2s, box-shadow 0.2s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 16px 48px ${C.purple}18`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = `0 8px 32px ${C.purple}10`; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.purplePale, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                          {TYPE_ICON[post.type]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 15, color: C.dark }}>{post.ngoName}</div>
                          <div style={{ fontSize: 12, color: C.muted }}>{post.location}</div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                            <span style={{ background: C.purplePale, color: C.purple, borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>{TYPE_LABEL[post.type]}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                        <span style={{ background: urg.bg, color: urg.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{urg.label}</span>
                        <span style={{ fontSize: 11, color: C.muted }}>{timeAgo(post.postedAt)}</span>
                        {isNew && <span style={{ fontSize: 10, background: C.pink, color: C.white, borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>NEW</span>}
                      </div>
                    </div>

                    <p style={{ fontSize: 14, color: C.mid, lineHeight: 1.65, marginBottom: 14 }}>{post.message}</p>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, paddingTop: 12, borderTop: `1px solid ${C.purpleLight}33` }}>
                      <div style={{ display: "flex", gap: 16 }}>
                        <div style={{ fontSize: 13, color: C.muted }}>👥 <strong style={{ color: C.dark }}>{post.peopleCount}</strong> people</div>
                        <div style={{ fontSize: 13, color: C.muted }}>📞 {post.contact}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── HOW IT WORKS ── */}
        <div style={{ ...sec, background: C.offWhite }}>
          <div style={container}>
            <FadeIn>
              <div style={{ textAlign: "center", marginBottom: 60 }}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 3, color: C.pink, textTransform: "uppercase" }}>The process</span>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(30px,4vw,46px)", fontWeight: 700, marginTop: 12, color: C.dark }}>How it works</h2>
              </div>
            </FadeIn>
            <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24 }}>
              {[
                { icon: "📋", num: "01", title: "Post your food",  desc: "Enter food name, quantity, cooked time, and pickup location in under 2 minutes." },
                { icon: "📍", num: "02", title: "Real-time map",   desc: "Google Maps shows nearby NGOs, temples and hospitals at their real locations." },
                { icon: "🤖", num: "03", title: "ML matching",     desc: "Our model scores each receiver by distance, need, capacity and food type." },
                { icon: "🚚", num: "04", title: "Food delivered",  desc: "Receiver gets a demo alert, collects and marks done. Nothing wasted." },
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 0.12}>
                  <div style={{ background: C.white, border: `1px solid ${C.purpleLight}44`, borderRadius: 20, padding: "32px 24px", textAlign: "center", height: "100%", transition: "transform 0.2s, box-shadow 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-6px)"; e.currentTarget.style.boxShadow = `0 20px 48px ${C.pink}22`; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.purplePale, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 16px" }}>{item.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.pink, letterSpacing: 2, marginBottom: 8 }}>STEP {item.num}</div>
                    <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 18, fontWeight: 700, marginBottom: 10, color: C.dark }}>{item.title}</h3>
                    <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.75 }}>{item.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>

        {/* ── SECTION 1 ── */}
        <div style={{ ...sec, background: C.pinkPale }}>
          <div style={container}>
            <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
              <FadeIn>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 3, color: C.pink, textTransform: "uppercase" }}>The problem</span>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(30px,3.5vw,50px)", fontWeight: 700, lineHeight: 1.2, margin: "14px 0 20px", color: C.dark }}>Reduce food<br />waste, today</h2>
                <p style={{ color: C.mid, fontSize: 16, lineHeight: 1.8, marginBottom: 32, maxWidth: 420 }}>Every day in Sriperumbadur, wedding halls, factories, and restaurants discard tons of edible food. Your one post can feed dozens.</p>
              </FadeIn>
              <FadeIn delay={0.18}>
                <div style={{ position: "relative" }}>
                  <img src="https://blog.bigbasket.com/wp-content/uploads/2023/04/South-Indian-main_584509564.jpeg" alt="Food" style={{ width: "100%", height: 420, objectFit: "cover", borderRadius: 32 }} />
                </div>
              </FadeIn>
            </div>
          </div>
        </div>

        {/* ── SECTION 2 ── */}
        <div style={{ ...sec, background: C.bg }}>
          <div style={container}>
            <div className="two-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
              <FadeIn delay={0.1}>
                <div style={{ position: "relative" }}>
                  <img src="https://childvikasfoundation.org/assets/images/food-distribution/2.jpg" alt="NGO" style={{ width: "100%", height: 420, objectFit: "cover", borderRadius: 32 }} />
               
                </div>
              </FadeIn>
              <FadeIn delay={0.2}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 3, color: C.purple, textTransform: "uppercase" }}>The solution</span>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(30px,3.5vw,50px)", fontWeight: 700, lineHeight: 1.2, margin: "14px 0 20px", color: C.dark }}>Support local<br />NGOs & temples</h2>
                <p style={{ color: C.mid, fontSize: 16, lineHeight: 1.8, marginBottom: 32, maxWidth: 420 }}>We ensure every receiver gets food only once per day — so the impact spreads fairly. No NGO is left out, none overloaded.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {["Quantity-based smart assignment", "No duplicate serving guarantee", "Real-time status tracking"].map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: gradAccent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: C.white, flexShrink: 0 }}>✓</div>
                      <span style={{ color: C.mid, fontSize: 15 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </FadeIn>
            </div>
          </div>
        </div>

        {/* ── CTA ── */}
        <div style={{ padding: "80px 40px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", background: gradBanner, borderRadius: 28, padding: "64px 56px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 32 }}>
              <div>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: "clamp(26px,3vw,42px)", fontWeight: 700, color: C.white, marginBottom: 10 }}>Ready to make a difference?</h2>
                <p style={{ color: "rgba(255,255,255,0.78)", fontSize: 16 }}>Join the food rescue movement in Sriperumbadur today.</p>
              </div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <Btn onClick={() => navigate("/ngo-register")} style={{ background: C.white, color: C.purple, padding: "13px 28px", borderRadius: 50 }}>I am a NGO</Btn>
              </div>
            </div>
          </div>
        </div>

        

      </div>
    </>
  );
}
