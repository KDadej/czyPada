const citySelect = document.querySelector("#city");
const checkButton = document.querySelector("#check-weather");
const locationButton = document.querySelector("#use-location");
const statusText = document.querySelector("#status");
const resultBox = document.querySelector("#result");
const weatherLocation = document.querySelector("#weather-location");
const rainStatus = document.querySelector("#rain-status");
const details = document.querySelector("#details");

checkButton.addEventListener("click", checkWeather);
locationButton.addEventListener("click", checkLocationWeather);

function checkWeather() {
  const option = citySelect.selectedOptions[0];
  const [lat, lon] = option.value.split(",");
  const stationName = option.dataset.station;
  loadWeather(lat, lon, option.textContent, stationName);
}

function checkLocationWeather() {
  if (!navigator.geolocation) {
    statusText.textContent = "Ta przeglądarka nie obsługuje lokalizacji urządzenia.";
    return;
  }

  setLoading("Pobieram Twoją lokalizację...");
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      const place = `Twoja lokalizacja (${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)})`;
      loadWeather(coords.latitude, coords.longitude, place);
    },
    error => {
      const message = error.code === error.PERMISSION_DENIED
        ? "Brak zgody na lokalizację. Możesz wybrać miasto poniżej."
        : error.code === error.POSITION_UNAVAILABLE
          ? "Nie udało się ustalić lokalizacji urządzenia."
          : "Ustalanie lokalizacji trwało zbyt długo. Spróbuj ponownie.";
      statusText.textContent = message;
      setButtonsDisabled(false);
    },
    { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 }
  );
}

async function loadWeather(lat, lon, place, stationName) {
  setLoading("Pobieram aktualne dane pogodowe...");
  resultBox.hidden = true;

  try {
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${lat}&longitude=${lon}` +
      "&current=precipitation,rain,showers,snowfall,weather_code,temperature_2m" +
      "&minutely_15=precipitation&forecast_minutely_15=4" +
      "&timezone=Europe%2FWarsaw";

    const response = await fetch(url);
    if (!response.ok) throw new Error("Serwer pogodowy zwrócił błąd.");
    const data = await response.json();

    const current = data.current;
    const raining = current.precipitation > 0;
    const snowing = current.snowfall > 0;

    // Prognoza na najbliższą godzinę (4 x 15 min)
    const next = data.minutely_15?.precipitation ?? [];
    const willRain = next.some(v => v > 0);

    if (raining) {
      rainStatus.textContent = snowing ? "🌨️ Teraz pada śnieg" : "🌧️ Teraz pada";
    } else if (willRain) {
      rainStatus.textContent = "🌦️ Nie pada, ale w ciągu godziny może zacząć";
    } else {
      rainStatus.textContent = "🌤️ Teraz nie pada";
    }

    let text =
      `Opad teraz: ${current.precipitation} mm. ` +
      `Temperatura: ${current.temperature_2m}°C. `;

    if (stationName) {
      try {
        const imgw = await fetchImgwStation(stationName);
        if (imgw) {
          text +=
            `Stacja IMGW ${imgw.stacja}: pomiar z ${imgw.data_pomiaru}, ` +
            `godz. ${imgw.godzina_pomiaru}:00, suma opadu ${imgw.suma_opadu} mm.`;
        }
      } catch {
        // IMGW data is supplementary; Open-Meteo remains the primary result.
      }
    }

    weatherLocation.textContent = place;
    details.textContent = text;
    resultBox.hidden = false;
    statusText.textContent =
      `Zaktualizowano: ${new Date().toLocaleTimeString("pl-PL")}`;
  } catch (error) {
    statusText.textContent = `Nie udało się pobrać danych pogodowych: ${error.message}`;
  } finally {
    setButtonsDisabled(false);
  }
}

function setLoading(message) {
  setButtonsDisabled(true);
  statusText.textContent = message;
  resultBox.hidden = true;
}

function setButtonsDisabled(disabled) {
  checkButton.disabled = disabled;
  locationButton.disabled = disabled;
}

async function fetchImgwStation(name) {
  const response = await fetch("https://danepubliczne.imgw.pl/api/data/synop");
  if (!response.ok) return null;
  const stations = await response.json();
  return stations.find(s => normalize(s.stacja) === normalize(name)) ?? null;
}

function normalize(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}