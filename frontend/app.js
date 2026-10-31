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
const featureNames = ["Weather", "pickup_longitude", "pickup_latitude", "dropoff_longitude", "dropoff_latitude", "passenger_count", "hour", "day", "month", "weekday", "year", "jfk_dist", "ewr_dist", "lga_dist", "sol_dist", "nyc_dist", "distance", "bearing"];

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
  const ranges = {
    passenger_count: [1, 6], distance: [1, 30], bearing: [-180, 180],
    jfk_dist: [0, 35], ewr_dist: [0, 35], lga_dist: [0, 25],
    sol_dist: [0, 15], nyc_dist: [0, 20]
  };
  for (const [name, [min, max]] of Object.entries(ranges)) {
    const field = form.elements[name];
    field.value = name === "bearing" ? (min + Math.random() * (max - min)).toFixed(1) : (min + Math.random() * (max - min)).toFixed(1);
  }
  form.elements.Weather.value = String(Math.floor(Math.random() * 5));
  for (const name of ["pickup_longitude", "dropoff_longitude"]) form.elements[name].value = (-74.02 + Math.random() * 0.1).toFixed(6);
  for (const name of ["pickup_latitude", "dropoff_latitude"]) form.elements[name].value = (40.68 + Math.random() * 0.15).toFixed(6);
  setDefaultDateTime();
  clearResult();
}

document.querySelector("#randomize-inputs").addEventListener("click", randomize);
document.querySelector("#reset-form").addEventListener("click", () => { form.reset(); setDefaultDateTime(); clearResult(); });

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
checkApi();
