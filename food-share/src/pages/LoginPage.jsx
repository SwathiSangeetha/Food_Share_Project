import { useState } from "react";
import { C, gradAccent, gradHero, Btn, isValidPhone, validateStrongPassword } from "../shared";
import { loginUser, registerUser } from "../api";

export default function LoginPage({ navigate, setUser }) {
  const [isLogin, setIsLogin]   = useState(true);
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [role, setRole]         = useState("donor");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate phone and password for sign up
    if (!isLogin) {
      if (!isValidPhone(phone)) {
        setError("Phone number must be a valid 10-digit mobile number (e.g. 9876543210).");
        return;
      }
      const passCheck = validateStrongPassword(password);
      if (!passCheck.valid) {
        setError(passCheck.message);
        return;
      }
    }

    setLoading(true);

    try {
      let res;
      if (isLogin) {
        res = await loginUser(email, password);
      } else {
        res = await registerUser({ name, email, password, phone, role });
      }

      if (res.token && res.user) {
        localStorage.setItem("token", res.token);
        setUser(res.user);

        navigate("/home");
      } else {
        setError(res.message || "Invalid email or password");
      }
    } catch (err) {
      setError("Server connection failed. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap');
        .login-card { animation: slideUp 0.6s ease both; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: gradHero, padding: "20px", position: "relative", overflow: "hidden"
      }}>
        {/* Background decoration */}
        <div style={{ position: "absolute", top: "-10%", left: "-10%", width: "40%", height: "40%", background: "rgba(255,255,255,0.05)", borderRadius: "50%", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-10%", width: "40%", height: "40%", background: "rgba(0,0,0,0.1)", borderRadius: "50%", filter: "blur(80px)" }} />

        <div className="login-card" style={{
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(12px)",
          padding: "48px 40px",
          borderRadius: 32,
          width: "100%",
          maxWidth: 440,
          boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
          position: "relative", zIndex: 10
        }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div
              onClick={() => navigate("/home")}
              style={{ width: 56, height: 56, background: gradAccent, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px", cursor: "pointer", boxShadow: `0 8px 24px ${C.pink}44` }}
            >🍱</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, color: C.dark, marginBottom: 8 }}>
              {isLogin ? "Welcome Back" : "Create Account"}
            </h1>
            <p style={{ fontSize: 14, color: C.muted }}>
              {isLogin ? "Login to continue sharing joy" : "Join the food rescue movement"}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {!isLogin && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.mid }}>Account Role</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setRole("donor")}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: 10,
                      border: `1.5px solid ${role === "donor" ? C.purple : `${C.purpleLight}55`}`,
                      background: role === "donor" ? C.purplePale : C.white,
                      color: role === "donor" ? C.purple : C.muted,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    🍽️ Food Donor
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("admin")}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: 10,
                      border: `1.5px solid ${role === "admin" ? C.purple : `${C.purpleLight}55`}`,
                      background: role === "admin" ? C.purplePale : C.white,
                      color: role === "admin" ? C.purple : C.muted,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    🛡️ Administrator
                  </button>
                </div>
              </div>
            )}

            {!isLogin && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.mid }}>Full Name</label>
                <input
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Swathi Sangeetha"
                  style={{ padding: "12px 16px", borderRadius: 12, border: `1.5px solid ${C.purpleLight}44`, outline: "none", fontSize: 15 }}
                />
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.mid }}>Email Address</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                style={{ padding: "12px 16px", borderRadius: 12, border: `1.5px solid ${C.purpleLight}44`, outline: "none", fontSize: 15 }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.mid }}>Password</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ padding: "12px 16px", borderRadius: 12, border: `1.5px solid ${C.purpleLight}44`, outline: "none", fontSize: 15 }}
              />
              {!isLogin && (
                <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.4 }}>
                  🔒 Must be at least 8 characters with uppercase, lowercase, number, and special character.
                </span>
              )}
            </div>

            {!isLogin && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: C.mid }}>Phone Number</label>
                <input
                  type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="9876543210"
                  maxLength={10}
                  style={{ padding: "12px 16px", borderRadius: 12, border: `1.5px solid ${C.purpleLight}44`, outline: "none", fontSize: 15 }}
                />
                <span style={{ fontSize: 11, color: C.muted }}>
                  📱 Enter your 10-digit mobile number
                </span>
              </div>
            )}

            {error && <div style={{ color: "#E91E63", fontSize: 13, fontWeight: 600, textAlign: "center" }}>{error}</div>}

            <Btn
              type="submit" disabled={loading}
              style={{ background: gradAccent, color: C.white, padding: "14px", borderRadius: 12, fontSize: 16, marginTop: 10, boxShadow: `0 8px 24px ${C.pink}44` }}
            >
              {loading ? "Processing..." : isLogin ? "Login →" : "Sign Up →"}
            </Btn>
          </form>

          <div style={{ textAlign: "center", marginTop: 22 }}>
            <span style={{ fontSize: 14, color: C.muted }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              onClick={() => { setIsLogin(!isLogin); setError(""); }}
              style={{ background: "none", border: "none", color: C.purple, fontWeight: 700, fontSize: 14, cursor: "pointer", padding: 0 }}
            >
              {isLogin ? "Sign Up" : "Login"}
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.purpleLight}33` }}>
            <button
              type="button"
              onClick={() => navigate("/ngo-register")}
              style={{ background: "none", border: "none", color: C.pink, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
            >
              🏛️ Register as an NGO & upload 12A Certificate →
            </button>
          </div>

          {/* Quick Demo Helper Hint */}
          <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: C.muted }}>
            Admin Access: <span style={{ fontWeight: 600, color: C.purple }}>admin@foodshare.org</span> / <span style={{ fontWeight: 600, color: C.purple }}>Admin@FoodShare2024!</span>
          </div>
        </div>
      </div>
    </>
  );
}
