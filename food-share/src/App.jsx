
import React, { useState, useEffect } from "react";

import LandingPage from "./pages/LandingPage";
import NGORegister from "./pages/NGORegister";
import DonorRegister from "./pages/DonorRegister";
import MatchResult from "./pages/MatchResult";
import LoginPage from "./pages/LoginPage";
import AdminCertificates from "./pages/AdminCertificates";

// ---------------- SAFE STORAGE ----------------

const getSavedUser = () => {
  try {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error("Error reading user:", error);
    return null;
  }
};

// ---------------- PATH NORMALIZATION ----------------

function normalizePath(path) {
  let p = (path || "/").trim();
  if (!p.startsWith("/")) p = `/${p}`;
  p = p.replace(/\/+$/, "") || "/";

  const aliases = {
    "/": "/",
    "/login": "/",
    "/admin": "/admin-dashboard",
    "/admin-certs": "/admin-dashboard",
    "/admin-dashboard": "/admin-dashboard",
    "/ngo": "/ngo-register",
    "/ngo-register": "/ngo-register",
    "/match": "/match",
    "/home": "/home",
    "/donor": "/donor-register",
    "/donor-register": "/donor-register",
    "/donate": "/donor-register",
    "/donate-food": "/donor-register",
  };

  return aliases[p] || "/home";
}

// ---------------- ERROR BOUNDARY ----------------

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("FoodShare rendering error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "#FDF8FF",
          color: "#4A148C",
          padding: "30px",
          textAlign: "center"
        }}>
          <h1>Oops! Something went wrong.</h1>
          <p>FoodShare could not load this page.</p>

          <pre style={{
            color: "#C2185B",
            whiteSpace: "pre-wrap",
            maxWidth: "700px"
          }}>
            {this.state.error?.message}
          </pre>

          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 25px",
              background: "#E91E8C",
              color: "white",
              border: "none",
              borderRadius: "25px",
              cursor: "pointer"
            }}
          >
            Reload Website
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ---------------- MAIN APP ----------------

function AppContent() {

  const [currentPath, setCurrentPath] = useState(
    () => normalizePath(window.location.pathname)
  );

  const [donorData, setDonorData] = useState(null);

  const [user, setUser] = useState(getSavedUser);

  // ---------------- NAVIGATION ----------------

  const navigate = (path, data = null, replace = false) => {

    if (data !== null) {
      setDonorData(data);
    }

    const targetPath = normalizePath(path);

    setCurrentPath(targetPath);

    if (window.location.pathname !== targetPath) {

      if (replace) {
        window.history.replaceState(null, "", targetPath);
      } else {
        window.history.pushState(null, "", targetPath);
      }

    }

    window.scrollTo(0, 0);
  };

  // ---------------- BACK AND FORWARD ----------------

  useEffect(() => {

    const handlePopState = () => {
      setCurrentPath(normalizePath(window.location.pathname));
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };

  }, []);

  // ---------------- SAVE USER ----------------

  useEffect(() => {

    try {
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      } else {
        localStorage.removeItem("user");
      }
    } catch (error) {
      console.error("LocalStorage error:", error);
    }

  }, [user]);

  // ---------------- ROUTE PROTECTION ----------------

  useEffect(() => {

    if (!user) {

      if (currentPath === "/admin-dashboard") {
        navigate("/", null, true);
      }

      return;
    }

    const role = (user.role || "").toLowerCase();

    if (
      currentPath === "/admin-dashboard" &&
      role !== "admin"
    ) {
      navigate("/home", null, true);
      return;
    }

    if (
      currentPath === "/" ||
      currentPath === "/login"
    ) {
      navigate("/home", null, true);
    }

  }, [user, currentPath]);

  // ---------------- LOGOUT ----------------

  const handleLogout = () => {

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    setDonorData(null);

    navigate("/", null, true);
  };

  // ---------------- LOGIN ----------------

  if (!user && (currentPath === "/" || currentPath === "/login")) {
    return (
      <LoginPage
        navigate={navigate}
        setUser={setUser}
      />
    );
  }

  if (!user && currentPath === "/admin-dashboard") {
    return null;
  }

  // ---------------- ADMIN DASHBOARD ----------------

  if (currentPath === "/admin-dashboard") {

    return (
      <AdminCertificates
        navigate={navigate}
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  // ---------------- DONOR REGISTRATION ----------------

  if (currentPath === "/donor-register") {

    return (
      <DonorRegister
        navigate={navigate}
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  // ---------------- MATCH RESULT ----------------

  if (currentPath === "/match") {

    return (
      <MatchResult
        navigate={navigate}
        donorData={donorData}
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  // ---------------- NGO REGISTRATION ----------------

  if (currentPath === "/ngo-register") {

    return (
      <NGORegister
        navigate={navigate}
        user={user}
        setUser={setUser}
        onLogout={handleLogout}
      />
    );
  }

  // ---------------- DONOR HOME ----------------

  return (
    <LandingPage
      navigate={navigate}
      user={user}
      onLogout={handleLogout}
    />
  );
}

// ---------------- APP EXPORT ----------------

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
