
const citySelect = document.querySelector("#city");
const checkButton = document.querySelector("#check-weather");
const statusText = document.querySelector("#status");
const resultBox = document.querySelector("#result");
const rainStatus = document.querySelector("#rain-status");
const details = document.querySelector("#details");

checkButton.addEventListener("click", checkWeather);

async function checkWeather() {
  const city = citySelect.value;

  checkButton.disabled = true;
  statusText.textContent = "Pobieram dane z IMGW...";
  resultBox.hidden = true;

  try {
    const response = await fetch(
      "https://danepubliczne.imgw.pl/api/data/synop"
    );

    if (!response.ok) {
      throw new Error("Serwer IMGW zwrócił błąd.");
    }

    const stations = await response.json();

    const station = stations.find(
      item => normalize(item.stacja) === normalize(city)
    );

    if (!station) {
      throw new Error(
        `Nie znaleziono stacji dla miasta: ${city}`
      );
    }

    const precipitation = Number(station.suma_opadu);

    if (!Number.isFinite(precipitation)) {
      throw new Error("Brak prawidłowego pomiaru opadu.");
    }

    rainStatus.textContent =
      precipitation > 0
        ? "🌧️ Odnotowano opad"
        : "🌤️ Brak opadu w pomiarze";

    details.textContent =
      `Stacja: ${station.stacja}. ` +
      `Pomiar: ${station.data_pomiaru}, ` +
      `godz. ${station.godzina_pomiaru}. ` +
      `Suma opadu: ${precipitation} mm. ` +
      `Temperatura: ${station.temperatura}°C.`;

    resultBox.hidden = false;
    statusText.textContent =
      `Dane pomiarowe z dnia ${station.data_pomiaru}.`;
  } catch (error) {
    statusText.textContent =
      `Nie udało się pobrać danych: ${error.message}`;
  } finally {
    checkButton.disabled = false;
  }
}

function normalize(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
