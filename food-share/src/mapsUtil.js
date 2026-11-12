// ── Google Maps API Key ───────────────────────────────────────
export const GOOGLE_KEY = "AIzaSyDMSt0zVzU-LOmcHds0zNx4tFu0Xq35nxM";
// Replace with your own: console.cloud.google.com
// Enable: Maps JavaScript API + Places API
// ─────────────────────────────────────────────────────────────

// ── Known landmarks / areas mapped to their city ──────────────
// Add any landmark the user might type → we map it to the right city
const LANDMARK_TO_CITY = {
  // ── Kanchipuram city & core landmarks ─────────────────────
  "kanchipuram":            "Kanchipuram",
  "kanchi":                 "Kanchipuram",
  "silk city":              "Kanchipuram",
  "kancheepuram":           "Kanchipuram",

  // Kanchipuram temples (major + minor)
  "ekambareswarar":         "Kanchipuram",
  "ekambaranathar":         "Kanchipuram",
  "kamakshi":               "Kanchipuram",
  "kamakshi amman":         "Kanchipuram",
  "varadharaja":            "Kanchipuram",
  "varadharaja perumal":    "Kanchipuram",
  "devaraja swami":         "Kanchipuram",
  "kailasanathar":          "Kanchipuram",
  "vaikunta perumal":       "Kanchipuram",
  "ulagalanda perumal":     "Kanchipuram",
  "chitragupta":            "Kanchipuram",
  "kachabeswarar":          "Kanchipuram",
  "kumarakottam":           "Kanchipuram",
  "onakanthan":             "Kanchipuram",
  "tiruttanka":             "Kanchipuram",

  // Kanchipuram colleges & institutions
  "rajalakshmi":            "Kanchipuram",
  "rajalakshmi college":    "Kanchipuram",
  "rajalakshmi engineering":"Kanchipuram",
  "rec":                    "Kanchipuram",
  "sacs mavmm":             "Kanchipuram",
  "sacs college":           "Kanchipuram",
  "government arts college kanchipuram": "Kanchipuram",

  // Kanchipuram roads & areas
  "gandhi road":            "Kanchipuram",
  "car street":             "Kanchipuram",
  "gst road kanchipuram":   "Kanchipuram",
  "hospital road kanchipuram": "Kanchipuram",
  "nellukara street":       "Kanchipuram",
  "nethaji nagar":          "Kanchipuram",
  "vishnu kanchi":          "Kanchipuram",
  "shiva kanchi":           "Kanchipuram",
  "periya kanchipuram":     "Kanchipuram",

  // Kanchipuram taluk towns & villages
  "walajabad":              "Kanchipuram",
  "uthiramerur":            "Kanchipuram",
  "uttiramerur":            "Kanchipuram",
  "madurantagam":           "Kanchipuram",
  "madurantakam":           "Kanchipuram",
  "thandalam":              "Kanchipuram",
  "karunguzhi":             "Kanchipuram",
  "cheyyur":                "Kanchipuram",
  "lathur":                 "Kanchipuram",
  "tirukalukundram":        "Kanchipuram",
  "tiruporur":              "Kanchipuram",
  "kovalam":                "Kanchipuram",
  "perungalathur":          "Kanchipuram",
  "pillaipakkam":           "Kanchipuram",
  "padalam":                "Kanchipuram",
  "acharapakkam":           "Kanchipuram",
  "kunrathur":              "Kanchipuram",
  "mannivakkam":            "Kanchipuram",
  "poonamallee":            "Kanchipuram",
  "selaiyur":               "Kanchipuram",
  "pallavaram":             "Kanchipuram",
  "vandalur":               "Kanchipuram",
  "urapakkam":              "Kanchipuram",
  "guduvancheri":           "Kanchipuram",
  "maraimalai nagar":       "Kanchipuram",
  "chengalpattu":           "Kanchipuram",  // Chengalpattu taluk → use Kanchipuram DB
  "chengalpet":             "Kanchipuram",

  // Kanchipuram NGOs & hospitals (for address matching)
  "nambikkai illam":        "Kanchipuram",
  "ramakrishna mission":    "Kanchipuram",
  "government hospital kanchipuram": "Kanchipuram",
  "esi hospital kanchipuram":        "Kanchipuram",

  // Kanchipuram pincodes (631xxx)
  "631502":                 "Kanchipuram",
  "631501":                 "Kanchipuram",
  "631601":                 "Kanchipuram",
  "631606":                 "Kanchipuram",
  "631":                    "Kanchipuram",  // catch-all for 631xxx pincodes
  "603":                    "Kanchipuram",  // 603xxx — southern Kanchipuram district

  // ── Sriperumbadur / Sriperumbudur ─────────────────────────
  "sriperumbadur":          "Sriperumbadur",
  "sriperumbudur":          "Sriperumbadur",
  "sipcot":                 "Sriperumbadur",
  "ramanujar":              "Sriperumbadur",
  "ramanujar temple":       "Sriperumbadur",
  "adikesava perumal":      "Sriperumbadur",
  "oragadam":               "Sriperumbadur",
  "irungattukottai":        "Sriperumbadur",
  "singaperumalkoil":       "Sriperumbadur",
  "sunguvarchatram":        "Sriperumbadur",
  "maduramangalam":         "Sriperumbadur",
  "vallakottai":            "Sriperumbadur",
  "rajiv gandhi national institute": "Sriperumbadur",
  "rgniyd":                 "Sriperumbadur",
  "nehru nagar sriperumbudur": "Sriperumbadur",
  "vergal":                 "Sriperumbadur",
  "karunakarya sriperumbudur": "Sriperumbadur",

  // Sriperumbadur pincodes (602xxx)
  "602105":                 "Sriperumbadur",
  "602106":                 "Sriperumbadur",
  "602":                    "Sriperumbadur", // catch-all for 602xxx pincodes
};
 
// ── Known city names with their center coordinates ────────────
const CITY_COORDS = {
  "Kanchipuram":   { lat: 12.8342, lng: 79.7036 },
  "Sriperumbadur": { lat: 12.9740, lng: 79.9460 },
};
 
// ── Detect city from any free-text address ────────────────────
export function detectCity(text) {
  const lower = (text || "").toLowerCase().trim();
  for (const [keyword, city] of Object.entries(LANDMARK_TO_CITY)) {
    if (lower.includes(keyword)) return city;
  }
  return null;
}
 
// ── Load Google Maps SDK (for geocoding only) ─────────────────
let googleLoaded = false;
let googleQueue  = [];
 
export function loadMaps(cb) {
  if (googleLoaded && window.google?.maps) { cb(); return; }
  googleQueue.push(cb);
  if (document.getElementById("gmaps-sdk")) return;
  const s   = document.createElement("script");
  s.id      = "gmaps-sdk";
  s.async   = true;
  s.src     = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=geometry`;
  s.onload  = () => { googleLoaded = true; googleQueue.forEach(fn => fn()); googleQueue = []; };
  s.onerror = () => { googleQueue.forEach(fn => fn()); googleQueue = []; };
  document.head.appendChild(s);
}
 
// ── Master geocoding function ─────────────────────────────────
// Strategy:
//   1. Detect city from landmark keywords (instant, no API)
//   2. Try to geocode the full address with Google Geocoding API
//   3. Fallback to city center coordinates from CITY_COORDS
//   4. Last resort: Kanchipuram default
export async function smartGeocode(cityField, pickupAddress) {
  // Combine both fields for keyword detection
  const combined = `${cityField} ${pickupAddress}`.toLowerCase();
 
  // ── Step 1: Detect city from keywords ────────────────────
  const detectedCity = detectCity(combined);
 
  // ── Step 2: Try Google Geocoding API ─────────────────────
  await new Promise(res => loadMaps(res));
 
  const tryGeocode = (query) => new Promise(resolve => {
    if (!window.google?.maps?.Geocoder) { resolve(null); return; }
    new window.google.maps.Geocoder().geocode(
      { address: query },
      (results, status) => {
        if (status === "OK" && results?.[0]) {
          const loc = results[0].geometry.location;
          resolve({
            lat: loc.lat(),
            lng: loc.lng(),
            formattedAddress: results[0].formatted_address,
          });
        } else resolve(null);
      }
    );
  });
 
  // Try geocoding strategies in order
  const queries = [];
 
  // If we detected a specific landmark, try geocoding it with city context
  if (pickupAddress?.trim()) {
    if (detectedCity) {
      queries.push(`${pickupAddress.trim()}, ${detectedCity}, Tamil Nadu, India`);
    }
    queries.push(`${pickupAddress.trim()}, Tamil Nadu, India`);
  }
  if (cityField?.trim()) {
    queries.push(`${cityField.trim()}, Tamil Nadu, India`);
  }
  if (detectedCity) {
    queries.push(`${detectedCity}, Tamil Nadu, India`);
  }
 
  let geoResult = null;
  for (const q of queries) {
    const r = await tryGeocode(q);
    if (r) { geoResult = r; break; }
  }
 
  // ── Step 3: Use detected city coords if geocoding failed ──
  if (!geoResult && detectedCity && CITY_COORDS[detectedCity]) {
    const coords = CITY_COORDS[detectedCity];
    return {
      lat:             coords.lat,
      lng:             coords.lng,
      formattedAddress:`${detectedCity}, Tamil Nadu (approximate)`,
      city:            detectedCity,
      method:          "city-keyword",
      isApproximate:   true,
    };
  }
 
  // ── Step 4: Use geocoded result, detect city from it ─────
  if (geoResult) {
    const cityFromGeo = detectCity(geoResult.formattedAddress) ||
                        detectCity(combined) ||
                        guessCityFromCoords(geoResult.lat, geoResult.lng);
    return {
      lat:             geoResult.lat,
      lng:             geoResult.lng,
      formattedAddress:geoResult.formattedAddress,
      city:            cityFromGeo,
      method:          "geocoded",
      isApproximate:   false,
    };
  }
 
  // ── Step 5: Browser GPS ───────────────────────────────────
  try {
    const pos = await new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
    );
    const city = guessCityFromCoords(pos.coords.latitude, pos.coords.longitude);
    return {
      lat:             pos.coords.latitude,
      lng:             pos.coords.longitude,
      formattedAddress:"Your GPS location",
      city,
      method:          "gps",
      isApproximate:   false,
    };
  } catch (_) {}
 
  // ── Step 6: Absolute fallback ─────────────────────────────
  return {
    lat:             12.8342,
    lng:             79.7036,
    formattedAddress:"Kanchipuram, Tamil Nadu (default)",
    city:            "Kanchipuram",
    method:          "default",
    isApproximate:   true,
  };
}
 
// ── Guess city from coordinates ───────────────────────────────
// If coords are within ~15km of a known city center, assign that city
function guessCityFromCoords(lat, lng) {
  let closest = null;
  let minDist = 999;
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    const d = haversine(lat, lng, coords.lat, coords.lng);
    if (d < minDist) { minDist = d; closest = city; }
  }
  // Within 30km → use that city's DB data
  return minDist < 30 ? closest : "Kanchipuram";
}
 
// ── Haversine distance (km) ───────────────────────────────────
export function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
    Math.sin(dLng/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 10) / 10;
}