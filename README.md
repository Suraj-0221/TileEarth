# Earth, right now (TileEarth) 🌍🛰️

A quiet planetary atlas visualizing live natural events tracked by NASA over global satellite imagery.

Built with plain modern web standards (**HTML5**, **CSS3**, and **vanilla ES Modules**) without build tools, bundlers, or API keys. Powered by [globe.gl](https://globe.gl/) (Three.js), streaming real observations from **NASA EONET v3** and real-time tiles from **NASA Global Imagery Browse Services (GIBS)**.

---

## 🧭 How It Works

1. **3D Planetary Canvas**:
   - Renders Earth on a Three.js WebGL globe using `globe.gl` (v2.45.3).
   - Dynamically loads high-resolution WMTS satellite tiles from NASA GIBS with strict max-zoom bounds (`MODIS Terra True Color`, `VIIRS City Lights`, `MODIS Surface Temperature`).
   - Defaults satellite imagery to yesterday to ensure fully assembled daily orbital mosaics.

2. **Bespoke Event Markers (Phase 2)**:
   - Replaces generic colored dots with distinctive Lucide-style inline SVG vector symbols for each natural event category:
     - 🔥 **Wildfires**: Flame
     - 🌀 **Severe Storms**: Spiral cyclone
     - 🌋 **Volcanoes**: Volcano peak with plume
     - 🌊 **Floods**: Ocean waves
     - ❄️ **Sea & Lake Ice**: Snowflake
     - ⚡ **Earthquakes**: Seismograph zigzag
     - ⛰️ **Landslides**: Sloped terrain with falling blocks
     - 💨 **Dust & Haze**: Atmospheric wind lines
     - ☀️ **Drought**: Sun over cracked soil
     - 🌡️ **Temperature Extremes**: Thermometer
   - Visible HTML markers (`htmlElementsData`) automatically hide when rotated to the far side of the globe using `htmlElementVisibilityModifier`.
   - Subtle outer ring for observations recorded in the past 48 hours.
   - Fully accessible: `tabindex="0"`, `role="button"`, `aria-label`, visible keyboard focus ring, and Space/Enter navigation.

3. **Restrained Editorial Design (Phase 3)**:
   - Replaces the generic sci-fi/gamer HUD with an **observatory field journal / modern almanac** aesthetic.
   - **Typography**: Newsreader (editorial serif for titles and headings) paired with Plus Jakarta Sans (warm humanist UI sans) and tabular figures (`font-variant-numeric: tabular-nums`) for measurements.
   - **Color Palette**: Deep space ink (`#080b11`), warm slate cards (`#131824`), warm off-white text (`#f8fafc`), and a single warm ochre accent (`#f59e0b`).
   - **Emil Kowalski Motion Principles**:
     - Fast, purposeful UI transitions (140ms–220ms) using custom easing curves (`cubic-bezier(0.23, 1, 0.32, 1)`).
     - Responsive press feedback (`transform: scale(0.97)` on `:active`).
     - Automatic compliance with `prefers-reduced-motion` (disabling auto-rotation and transitions).
     - Cinematic 1.4s eased camera fly-to animations.

---

## 🚀 Running Locally

```bash
# From the project directory:
python -m http.server 8000
```
Open **`http://localhost:8000`** in any modern web browser.

---

## 📜 Mandatory Acknowledgment

> *We acknowledge the use of imagery provided by services from NASA's Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS).*
>
> *Event data: NASA EONET.*
