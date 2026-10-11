const citySelect = document.querySelector("#city");
const checkButton = document.querySelector("#check-weather");
const statusText = document.querySelector("#status");
const resultBox = document.querySelector("#result");
const rainStatus = document.querySelector("#rain-status");
const details = document.querySelector("#details");

checkButton.addEventListener("click", checkWeather);

async function checkWeather() {
  const option = citySelect.selectedOptions[0];
  const [lat, lon] = option.value.split(",");
  const stationName = option.dataset.station;

  checkButton.disabled = true;
  statusText.textContent = "Pobieram dane...";
  resultBox.hidden = true;

  try {
    // 1. Bieżący opad (Open-Meteo) – główne źródło
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
      `Opad: ${current.precipitation} mm (ostatnie 15 min). ` +
      `Temperatura: ${current.temperature_2m}°C. `;

    // 2. Ostatni pomiar ze stacji IMGW – informacja dodatkowa
    try {
      const imgw = await fetchImgwStation(stationName);
      if (imgw) {
        text +=
          `Stacja IMGW ${imgw.stacja}: pomiar z ${imgw.data_pomiaru}, ` +
          `godz. ${imgw.godzina_pomiaru}:00, suma opadu ${imgw.suma_opadu} mm.`;
      }
    } catch {
      // brak danych IMGW nie blokuje wyniku
    }

    details.textContent = text;
    resultBox.hidden = false;
    statusText.textContent =
      `Zaktualizowano: ${new Date().toLocaleTimeString("pl-PL")}`;
  } catch (error) {
    statusText.textContent = `Nie udało się pobrać danych: ${error.message}`;
  } finally {
    checkButton.disabled = false;
  }
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