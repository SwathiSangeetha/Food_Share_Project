
// ── Backend URL ───────────────────────────────────────────────
const BACKEND_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

export const API_BASE = `${BACKEND_URL}/api`;

// ── Auth ──────────────────────────────────────────────────────
export async function registerUser(data) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function loginUser(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

// ── ML: Fetch nearby receivers from MongoDB ───────────────────
export async function fetchNearbyReceivers({
  lat, lng, qty, foodType, city
}) {
  const params = new URLSearchParams({
    lat, lng, qty, foodType
  });

  if (city) params.append("city", city);

  const res = await fetch(
    `${API_BASE}/receivers/nearby?${params}`
  );

  const data = await res.json();
  return data.receivers || [];
}

// ── Submit donation to DB ─────────────────────────────────────
export async function submitDonation(data) {
  const res = await fetch(`${API_BASE}/donations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// ── Get active need posts for homepage ────────────────────────
export async function fetchNeedPosts() {
  const res = await fetch(`${API_BASE}/needposts`);
  return res.json();
}

// ── Post a need (NGO form submission) ─────────────────────────
export async function postNeed(data) {
  const res = await fetch(`${API_BASE}/needposts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

// ── NGO Certificate AI Analysis & Admin Review ────────────────
export async function uploadAndAnalyzeCertificate(formData) {
  const res = await fetch(
    `${API_BASE}/certificates/upload-and-analyze`,
    {
      method: "POST",
      body: formData,
    }
  );
  return res.json();
}

export async function fetchCertificates({
  status = "all",
  search = "",
  certType = "all"
} = {}) {
  const params = new URLSearchParams();

  if (status && status !== "all") {
    params.append("status", status);
  }

  if (search) params.append("search", search);

  if (certType && certType !== "all") {
    params.append("certType", certType);
  }

  const res = await fetch(
    `${API_BASE}/certificates?${params}`
  );

  return res.json();
}

export async function fetchCertificateById(id) {
  const res = await fetch(`${API_BASE}/certificates/${id}`);
  return res.json();
}

export async function updateCertificateStatus(
  id,
  { status, adminNotes, reviewedBy }
) {
  const res = await fetch(
    `${API_BASE}/certificates/${id}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        adminNotes,
        reviewedBy
      }),
    }
  );

  return res.json();
}

export async function deleteCertificate(id) {
  const res = await fetch(
    `${API_BASE}/certificates/${id}`,
    {
      method: "DELETE",
    }
  );

  return res.json();
}
