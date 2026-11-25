const API = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const state = { unit: 'celsius', location: { name: 'San Francisco', admin1: 'California', country: 'United States', latitude: 37.7749, longitude: -122.4194 } };
const $ = (selector) => document.querySelector(selector);

const weatherDescriptions = {
  0: ['Clear sky', '☀️'], 1: ['Mainly clear', '🌤️'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'],
  45: ['Foggy', '🌫️'], 48: ['Rime fog', '🌫️'], 51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Heavy drizzle', '🌧️'],
  56: ['Freezing drizzle', '🌧️'], 57: ['Heavy freezing drizzle', '🌧️'], 61: ['Light rain', '🌦️'], 63: ['Rain', '🌧️'], 65: ['Heavy rain', '🌧️'],
  66: ['Freezing rain', '🌧️'], 67: ['Heavy freezing rain', '🌧️'], 71: ['Light snow', '🌨️'], 73: ['Snow', '🌨️'], 75: ['Heavy snow', '❄️'],
  77: ['Snow grains', '❄️'], 80: ['Light showers', '🌦️'], 81: ['Showers', '🌧️'], 82: ['Heavy showers', '🌧️'],
  85: ['Snow showers', '🌨️'], 86: ['Heavy snow showers', '❄️'], 95: ['Thunderstorm', '⛈️'], 96: ['Thunderstorm, hail', '⛈️'], 99: ['Heavy thunderstorm', '⛈️']
};

function weatherFor(code) { return weatherDescriptions[code] || ['Weather', '🌤️']; }
function temperature(value) { return `${Math.round(value)}°`; }
function timeLabel(value) {
  if (!value) return '—:—';
  const [hour, minute] = value.slice(11, 16).split(':').map(Number);
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, hour, minute));
}
function dayLabel(value, index) {
  if (index === 0) return 'Today';
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(`${value}T12:00:00`));
}
function setStatus(message = '', isError = false) {
  const status = $('#status');
  status.textContent = message;
  status.classList.toggle('error', isError);
}

async function searchLocation(query) {
  const url = new URL(GEOCODING_API);
  url.search = new URLSearchParams({ name: query, count: '1', language: 'en', format: 'json' });
  const response = await fetch(url);
  if (!response.ok) throw new Error('Could not search for that place. Please try again.');
  const data = await response.json();
  if (!data.results?.length) throw new Error(`No places found for “${query}”. Try another city name.`);
  return data.results[0];
}

async function loadWeather(location = state.location) {
  setStatus('Updating forecast…');
  const params = new URLSearchParams({
    latitude: location.latitude,
    longitude: location.longitude,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m',
    hourly: 'temperature_2m,weather_code,precipitation_probability',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset',
    timezone: 'auto', forecast_days: '7',
    temperature_unit: state.unit,
    wind_speed_unit: state.unit === 'celsius' ? 'kmh' : 'mph'
  });
  try {
    const response = await fetch(`${API}?${params}`);
    if (!response.ok) throw new Error('Weather data is temporarily unavailable. Please try again.');
    const data = await response.json();
    state.location = location;
    renderWeather(data, location);
    setStatus('');
  } catch (error) {
    setStatus(error.message || 'Something went wrong while loading the forecast.', true);
  }
}

function renderWeather(data, location) {
  const current = data.current;
  const daily = data.daily;
  const condition = weatherFor(current.weather_code);
  const placeParts = [location.name, location.admin1, location.country].filter(Boolean);
  $('#place-name').textContent = placeParts.join(', ');
  $('#date-line').textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${current.time.slice(0, 10)}T12:00:00`)) + ` · ${timeLabel(current.time)} local time`;
  $('#temperature').textContent = temperature(current.temperature_2m);
  $('#condition').textContent = condition[0];
  $('#condition-icon').textContent = condition[1];
  $('#feels-like').textContent = `Feels like ${temperature(current.apparent_temperature)}`;
  $('#today-high').textContent = temperature(daily.temperature_2m_max[0]);
  $('#today-low').textContent = temperature(daily.temperature_2m_min[0]);
  $('#humidity').textContent = `${current.relative_humidity_2m}%`;
  $('#wind').textContent = `${Math.round(current.wind_speed_10m)} ${state.unit === 'celsius' ? 'km/h' : 'mph'}`;
  $('#wind-note').textContent = 'Current wind speed';
  $('#precipitation').textContent = `${current.precipitation} mm`;
  $('#sunrise').textContent = timeLabel(daily.sunrise[0]);
  renderHourly(data.hourly, current.time);
  renderDaily(daily);
}

function renderHourly(hourly, currentTime) {
  const start = hourly.time.findIndex((time) => time >= currentTime);
  const first = Math.max(start, 0);
  const list = $('#hourly-list');
  list.replaceChildren();
  for (let i = first; i < Math.min(first + 24, hourly.time.length); i++) {
    const [description, icon] = weatherFor(hourly.weather_code[i]);
    const item = document.createElement('div');
    item.className = 'hour-item';
    item.innerHTML = `<span class="hour-time">${i === first ? 'Now' : timeLabel(hourly.time[i])}</span><span class="hour-icon" aria-label="${description}">${icon}</span><strong>${temperature(hourly.temperature_2m[i])}</strong><span class="hour-rain">${hourly.precipitation_probability[i] ?? 0}% rain</span>`;
    list.append(item);
  }
}

function renderDaily(daily) {
  const list = $('#daily-list');
  list.replaceChildren();
  daily.time.forEach((date, index) => {
    const [description, icon] = weatherFor(daily.weather_code[index]);
    const item = document.createElement('div');
    item.className = 'day-item';
    item.innerHTML = `<span class="day-name">${dayLabel(date, index)}</span><span class="day-condition"><span class="day-icon" aria-hidden="true">${icon}</span><span>${description}</span></span><span class="day-range"><span>${temperature(daily.temperature_2m_max[index])}</span><span class="low-temp">${temperature(daily.temperature_2m_min[index])}</span></span>`;
    list.append(item);
  });
}

$('#search-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const query = $('#city-input').value.trim();
  if (!query) return;
  setStatus('Searching…');
  try {
    const location = await searchLocation(query);
    $('#city-input').value = '';
    await loadWeather(location);
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.querySelectorAll('[data-unit]').forEach((button) => {
  button.addEventListener('click', () => {
    if (state.unit === button.dataset.unit) return;
    state.unit = button.dataset.unit;
    document.querySelectorAll('[data-unit]').forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    loadWeather();
  });
});

$('#location-button').addEventListener('click', () => {
  if (!navigator.geolocation) {
    setStatus('Location is not supported by this browser.', true);
    return;
  }
  setStatus('Finding your location…');
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => loadWeather({ name: 'Your location', latitude: coords.latitude, longitude: coords.longitude }),
    () => setStatus('Could not access your location. Check browser permissions and try again.', true),
    { enableHighAccuracy: false, timeout: 10000 }
  );
});

loadWeather();
