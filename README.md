# Earth Events Globe 🌍🛰️

An interactive 3D WebGL globe visualizing live natural disasters and events across the planet over real NASA GIBS satellite imagery.

Built using plain modern static web standards (**HTML5**, **CSS3**, and **vanilla ES Modules**), powered by [globe.gl](https://globe.gl/) (Three.js), and streaming data directly from **NASA EONET v3** and **NASA Global Imagery Browse Services (GIBS)**.

---

## 🌟 Key Features

1. **Photorealistic 3D Globe & Dynamic GIBS Satellite Basemaps**:
   - Streamed directly from NASA's WMTS GIBS tile servers (EPSG:3857).
   - High-resolution layers:
     - **MODIS Terra True Color (Corrected Reflectance)** (Level 9 zoom)
     - **VIIRS City Lights** (Night composite)
     - **MODIS Terra Land Surface Temperature (Day)**
   - 30-day temporal slider: scrub backward in time to inspect terrain and atmospheric conditions during event progression.
   - Smooth auto-rotation with touch/mouse interruption and cinematic fly-to transitions.

2. **Real-Time Natural Event Feeds (NASA EONET v3)**:
   - Live tracking of Wildfires, Severe Storms, Volcanoes, Floods, Sea/Lake Ice, Earthquakes, and more.
   - Pulsing white ripple rings highlighting active events updated in the past 48 hours.
   - Intelligent geometry normalization supporting Points, MultiPoints, and Polygons (centroid computation).
   - Historical trajectory and movement tracks rendered as dashed 3D flight paths on the globe.

3. **Mission Control Glassmorphism HUD**:
   - Multi-select category filtering chips with live counters.
   - Search box with instant filter by title and geographical area.
   - Dual mode switch: "Open Events Only" vs "Include Closed (Past 30 Days)".
   - Detailed event inspection drawer featuring data sources, coordinates, observations count, and a direct "View satellite imagery here" fly-in action.

4. **Analytical Mission Insights**:
   - Live summary metrics: total events, active `<48h` updates.
   - Lat/Lon density grid bucketing algorithm calculating the highest event concentration hotspot.
   - Native SVG/CSS distribution bar chart breaking down events by classification.
   - Quick-access card pointing to the most recently detected satellite observation.

---

## 🚀 Getting Started

No build tools, bundlers, or API keys required.

### Run with Python HTTP Server:
```bash
# From the repository root
python -m http.server 8000
```
Then navigate to `http://localhost:8000` in any modern web browser (Chrome, Firefox, Safari, Edge).

### Deploy to GitHub Pages:
This project is 100% static and ready to be hosted as-is on GitHub Pages or any static file host (Netlify, Vercel, Cloudflare Pages).

---

## 🛰️ Data Sources & Architecture

- **NASA EONET v3**: `https://eonet.gsfc.nasa.gov/api/v3/events`
  - Fetched client-side with 10-minute session caching (`sessionStorage`) to eliminate redundant API requests and respect NASA rate limits.
- **NASA GIBS WMTS**: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/`
  - Integrated into `globe.gl`'s tile engine with boundary limits protecting zoom levels from 404s.

---

## 📜 Mandatory Acknowledgment

> *We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS).*
>
> *Event data: NASA EONET.*

---

## 🛠️ Code Structure

```
TileEarth/
├── index.html        # App layout, mission control HUD, drawers, and modal containers
├── style.css         # Dark NASA mission control theme, responsive layout, glassmorphism
├── app.js            # Modular ES application: fetchEvents, normalizeEvent, renderPoints, flyToEvent, buildSummary
└── README.md         # Documentation and project details
```
