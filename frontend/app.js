const configuredApi = new URLSearchParams(window.location.search).get("api");
const API_BASE = configuredApi || window.localStorage.getItem("ridefare-api") || "http://127.0.0.1:5000";
const form = document.querySelector("#prediction-form");
const errorBox = document.querySelector("#error-message");
const submitButton = document.querySelector("#submit-button");
const apiStatus = document.querySelector("#api-status");
const apiPill = document.querySelector(".api-pill");
const resultTitle = document.querySelector("#result-title");
const resultSummary = document.querySelector("#result-summary");
const fareValue = document.querySelector("#probability-value");
const fareMeter = document.querySelector("#probability-meter");
const resultSymbol = document.querySelector(".result-symbol");
const mapStatus = document.querySelector("#map-status");
const mapInstructions = document.querySelector("#map-instructions");
const featureNames = ["Weather", "pickup_longitude", "pickup_latitude", "dropoff_longitude", "dropoff_latitude", "passenger_count", "hour", "day", "month", "weekday", "year", "jfk_dist", "ewr_dist", "lga_dist", "sol_dist", "nyc_dist", "distance", "bearing"];
const airportCoordinates = {
  jfk_dist: [40.6413, -73.7781],
  ewr_dist: [40.6895, -74.1745],
  lga_dist: [40.7769, -73.8740],
  sol_dist: [40.6892, -74.0445],
  nyc_dist: [40.7580, -73.9855]
};
let map;
let pickupMarker;
let dropoffMarker;
let routeLine;
let selectingPoint = "pickup";
const newYorkBounds = [
  [40.4774, -74.2591],
  [40.9176, -73.7004]
];

function milesBetween(first, second) {
  const earthRadiusMiles = 3958.8;
  const latDelta = (second[0] - first[0]) * Math.PI / 180;
  const lngDelta = (second[1] - first[1]) * Math.PI / 180;
  const latitude = Math.cos(first[0] * Math.PI / 180) * Math.cos(second[0] * Math.PI / 180);
  const a = Math.sin(latDelta / 2) ** 2 + latitude * Math.sin(lngDelta / 2) ** 2;
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateBearing(first, second) {
  const firstLat = first[0] * Math.PI / 180;
  const secondLat = second[0] * Math.PI / 180;
  const longitudeDelta = (second[1] - first[1]) * Math.PI / 180;
  const y = Math.sin(longitudeDelta) * Math.cos(secondLat);
  const x = Math.cos(firstLat) * Math.sin(secondLat) - Math.sin(firstLat) * Math.cos(secondLat) * Math.cos(longitudeDelta);
  const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  return bearing > 180 ? bearing - 360 : bearing;
}

function setCoordinate(name, value) {
  form.elements[name].value = value.toFixed(6);
}

function updateDerivedFields() {
  if (!pickupMarker) return;
  const pickup = [pickupMarker.getLatLng().lat, pickupMarker.getLatLng().lng];
  for (const [name, coordinates] of Object.entries(airportCoordinates)) {
    form.elements[name].value = milesBetween(pickup, coordinates).toFixed(1);
  }
  if (!dropoffMarker) return;
  const dropoff = [dropoffMarker.getLatLng().lat, dropoffMarker.getLatLng().lng];
  form.elements.distance.value = Math.max(0.1, milesBetween(pickup, dropoff)).toFixed(1);
  form.elements.bearing.value = calculateBearing(pickup, dropoff).toFixed(1);
}

function updateMapStatus() {
  mapStatus.textContent = `Pickup: ${pickupMarker ? "selected" : "not selected"} · Drop-off: ${dropoffMarker ? "selected" : "not selected"}`;
  mapInstructions.textContent = pickupMarker && dropoffMarker
    ? "Both points are set. Click either marker or use Clear points to choose again."
    : pickupMarker ? "Now click the map to set your drop-off point." : "Click the map to set your pickup point, then click again for drop-off.";
}

function randomNewYorkPoint() {
  const southWest = newYorkBounds[0];
  const northEast = newYorkBounds[1];
  return [
    southWest[0] + Math.random() * (northEast[0] - southWest[0]),
    southWest[1] + Math.random() * (northEast[1] - southWest[1])
  ];
}

function placePoint(latitude, longitude) {
  const point = [latitude, longitude];
  if (selectingPoint === "pickup") {
    if (pickupMarker) pickupMarker.setLatLng(point);
    else pickupMarker = L.marker(point, { title: "Pickup" }).addTo(map).bindTooltip("Pickup", { permanent: true, direction: "top" });
    setCoordinate("pickup_latitude", latitude);
    setCoordinate("pickup_longitude", longitude);
    selectingPoint = "dropoff";
  } else {
    if (dropoffMarker) dropoffMarker.setLatLng(point);
    else dropoffMarker = L.marker(point, { title: "Drop-off" }).addTo(map).bindTooltip("Drop-off", { permanent: true, direction: "top" });
    setCoordinate("dropoff_latitude", latitude);
    setCoordinate("dropoff_longitude", longitude);
    selectingPoint = "pickup";
  }
  if (routeLine) routeLine.remove();
  if (pickupMarker && dropoffMarker) {
    routeLine = L.polyline([pickupMarker.getLatLng(), dropoffMarker.getLatLng()], { color: "#f04b24", weight: 3, dashArray: "7 7" }).addTo(map);
    map.fitBounds(L.latLngBounds(pickupMarker.getLatLng(), dropoffMarker.getLatLng()), {
      padding: [45, 45],
      maxZoom: 13
    });
  }
  updateDerivedFields();
  updateMapStatus();
}

function setupMap() {
  if (!window.L) {
    mapInstructions.textContent = "The map could not load. You can enter coordinates manually below.";
    return;
  }
  map = L.map("trip-map", {
    maxBounds: newYorkBounds,
    maxBoundsViscosity: 1,
    minZoom: 10,
    maxZoom: 18
  }).fitBounds(newYorkBounds, { padding: [12, 12] });
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
    attribution: "&copy; Esri, Maxar, Earthstar Geographics",
    maxZoom: 19
  }).addTo(map);
  map.on("click", (event) => placePoint(event.latlng.lat, event.latlng.lng));
  placePoint(40.748, -73.985);
  placePoint(40.752, -73.977);
}

function setApiStatus(connected) {
  apiStatus.textContent = connected ? "API connected" : "API offline";
  apiPill.classList.toggle("connected", connected);
  apiPill.classList.toggle("offline", !connected);
}

async function checkApi() {
  try {
    const response = await fetch(`${API_BASE}/`, { method: "GET" });
    setApiStatus(response.ok);
  } catch {
    setApiStatus(false);
  }
}

function clearResult() {
  errorBox.hidden = true;
  resultTitle.textContent = "Your estimated fare will appear here.";
  resultSummary.textContent = "Complete the trip details, then select “Predict fare”.";
  fareValue.textContent = "—";
  fareMeter.style.width = "0%";
  resultSymbol.textContent = "↗";
  resultSymbol.style.color = "var(--accent)";
}

function setDefaultDateTime() {
  const now = new Date();
  document.querySelector("#date").value = now.toISOString().slice(0, 10);
  document.querySelector("#time").value = `${String(now.getHours()).padStart(2, "0")}:00`;
}

function collectFeatures() {
  const date = document.querySelector("#date").value;
  const time = document.querySelector("#time").value;
  const dateObject = new Date(`${date}T00:00:00`);
  const features = {};
  for (const name of featureNames) {
    const field = form.elements[name];
    if (field) features[name] = Number(field.value);
  }
  features.hour = Number(time.split(":")[0]);
  features.day = dateObject.getDate();
  features.month = dateObject.getMonth() + 1;
  features.weekday = (dateObject.getDay() + 6) % 7;
  features.year = dateObject.getFullYear();
  return features;
}

function randomize() {
  form.elements.passenger_count.value = String(Math.floor(Math.random() * 6) + 1);
  form.elements.Weather.value = String(Math.floor(Math.random() * 5));
  setDefaultDateTime();
  clearResult();
  if (map) {
    const pickup = randomNewYorkPoint();
    let dropoff = randomNewYorkPoint();
    while (milesBetween(pickup, dropoff) < 1) {
      dropoff = randomNewYorkPoint();
    }
    selectingPoint = "pickup";
    placePoint(...pickup);
    placePoint(...dropoff);
  }
}

document.querySelector("#randomize-inputs").addEventListener("click", randomize);
document.querySelector("#clear-map").addEventListener("click", () => {
  if (pickupMarker) pickupMarker.remove();
  if (dropoffMarker) dropoffMarker.remove();
  if (routeLine) routeLine.remove();
  pickupMarker = undefined;
  dropoffMarker = undefined;
  routeLine = undefined;
  selectingPoint = "pickup";
  for (const name of [
    "pickup_latitude", "pickup_longitude", "dropoff_latitude", "dropoff_longitude",
    "distance", "bearing", ...Object.keys(airportCoordinates)
  ]) {
    form.elements[name].value = "";
  }
  updateMapStatus();
});
document.querySelector("#reset-form").addEventListener("click", () => {
  form.reset();
  setDefaultDateTime();
  clearResult();
  if (map) {
    document.querySelector("#clear-map").click();
    placePoint(40.748, -73.985);
    placePoint(40.752, -73.977);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.checkValidity()) { form.reportValidity(); return; }
  errorBox.hidden = true;
  submitButton.disabled = true;
  submitButton.innerHTML = "Predicting… <span>↻</span>";
  try {
    const response = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features: collectFeatures() })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || payload.detail || "The API rejected the request.");
    const fare = Number(payload.prediction ?? payload.fare);
    if (!Number.isFinite(fare)) throw new Error("The API response did not include a valid fare.");
    const cappedFare = Math.max(0, Math.min(100, fare));
    fareValue.textContent = `$${fare.toFixed(2)}`;
    fareMeter.style.width = `${cappedFare}%`;
    resultTitle.textContent = "Estimated ride fare";
    resultSummary.textContent = `The model estimates this trip will cost approximately $${fare.toFixed(2)}.`;
    resultSymbol.textContent = "$";
    resultSymbol.style.color = "var(--success)";
    document.querySelector("#result-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    errorBox.textContent = error instanceof TypeError
      ? `Can't reach the API at ${API_BASE}. Start the backend or open the page with ?api=YOUR_API_URL.`
      : (error.message || "Something went wrong. Please try again.");
    errorBox.hidden = false;
    await checkApi();
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = "Predict fare <span>↗</span>";
  }
});

setDefaultDateTime();
setupMap();
checkApi();
