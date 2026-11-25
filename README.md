# Skydash Weather Dashboard

A responsive weather dashboard built with plain HTML, CSS, and JavaScript. It uses the free [Open-Meteo](https://open-meteo.com/) geocoding and forecast APIs, so no API key or build step is required.

## Run locally

Open `index.html` in a browser, or serve this directory with any static web server:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>. Weather and city search require an internet connection. Browser geolocation requires permission and a secure context (localhost is supported).

## Features

- Search by city name and see local conditions
- Current temperature, feels-like temperature, humidity, wind, precipitation, and sunrise
- Hourly and seven-day forecasts
- Celsius/Fahrenheit and matching wind speed units
- Optional browser geolocation
- Responsive layout and loading/error feedback

Weather data is provided by Open-Meteo. Review its [terms](https://open-meteo.com/en/terms) before commercial use.
