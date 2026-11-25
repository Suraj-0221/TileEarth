/**
 * EARTH EVENTS GLOBE
 * NASA EONET v3 + NASA GIBS Satellite Tiles Web App
 * ES Module Architecture
 */

// --- CONFIGURATION & CONSTANTS ---
const EONET_API_BASE = 'https://eonet.gsfc.nasa.gov/api/v3';
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes cache
const BLUE_MARBLE_FALLBACK = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';

// Distinct category colors for visual clarity
const CATEGORY_COLORS = {
  wildfires: '#f97316',       // Orange
  severeStorms: '#a855f7',    // Purple
  volcanoes: '#ef4444',       // Red
  floods: '#3b82f6',          // Blue
  seaLakeIce: '#06b6d4',      // Cyan
  earthquakes: '#eab308',     // Yellow
  landslides: '#84cc16',      // Lime
  dustHaze: '#d97706',        // Amber
  drought: '#b45309',         // Brown
  snow: '#e0f2fe',            // Ice light blue
  tempExtremes: '#f43f5e',    // Rose
  waterColor: '#14b8a6',      // Teal
  manmade: '#94a3b8'          // Slate
};

const DEFAULT_COLOR = '#38bdf8';

// Supported Verified Basemap layers
const BASEMAP_LAYERS = {
  truecolor: {
    id: 'MODIS_Terra_CorrectedReflectance_TrueColor',
    ext: 'jpg',
    matrix: 'GoogleMapsCompatible_Level9',
    maxZoom: 9,
    dated: true
  },
  night: {
    id: 'VIIRS_CityLights_2012',
    ext: 'jpg',
    matrix: 'GoogleMapsCompatible_Level8',
    maxZoom: 8,
    dated: false // Static night lights composite
  },
  temp: {
    id: 'MODIS_Terra_Land_Surface_Temp_Day',
    ext: 'png',
    matrix: 'GoogleMapsCompatible_Level7',
    maxZoom: 7,
    dated: true
  }
};

// --- APPLICATION STATE ---
const state = {
  allEvents: [],
  filteredEvents: [],
  categories: [],
  selectedCategoryIds: new Set(),
  activeLayerKey: 'truecolor',
  selectedDate: getFormattedDate(1), // Default to yesterday
  daysOffset: 1,
  includeClosed: false,
  searchQuery: '',
  selectedEvent: null,
  isAutoRotating: true,
  globeInstance: null
};

// --- UTILITIES ---
function getFormattedDate(daysAgo = 1) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function getCategoryColor(categoryId) {
  return CATEGORY_COLORS[categoryId] || DEFAULT_COLOR;
}

function formatCoordinates(lat, lng) {
  const latStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lngStr}`;
}

// --- NORMALIZATION ---
/**
 * Normalizes an EONET event into a clean, predictable shape:
 * - centroid / latest position [lon, lat]
 * - full historical track coordinates
 * - formatted date and category
 */
function normalizeEvent(raw) {
  if (!raw || !raw.geometry || raw.geometry.length === 0) return null;

  const geometries = [...raw.geometry];
  // Sort by date ascending to ensure track ordering
  geometries.sort((a, b) => new Date(a.date) - new Date(b.date));

  const latestGeom = geometries[geometries.length - 1];
  let lat = null;
  let lng = null;

  // Handle Point vs Polygon vs MultiPoint
  if (latestGeom.type === 'Point' && Array.isArray(latestGeom.coordinates)) {
    lng = Number(latestGeom.coordinates[0]);
    lat = Number(latestGeom.coordinates[1]);
  } else if (latestGeom.type === 'Polygon' && Array.isArray(latestGeom.coordinates)) {
    // Calculate centroid or take the first coordinate ring
    const ring = latestGeom.coordinates[0] || [];
    if (ring.length > 0) {
      let sumLng = 0, sumLat = 0;
      ring.forEach(pt => {
        sumLng += Number(pt[0]);
        sumLat += Number(pt[1]);
      });
      lng = sumLng / ring.length;
      lat = sumLat / ring.length;
    }
  }

  if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
    return null;
  }

  const primaryCat = (raw.categories && raw.categories[0]) ? raw.categories[0] : { id: 'other', title: 'Other' };
  const catColor = getCategoryColor(primaryCat.id);
  
  // Extract historical track path (array of [lat, lng])
  const trackPath = [];
  geometries.forEach(g => {
    if (g.type === 'Point' && Array.isArray(g.coordinates)) {
      trackPath.push([Number(g.coordinates[1]), Number(g.coordinates[0])]);
    }
  });

  const lastUpdated = new Date(latestGeom.date || raw.closed || Date.now());
  const hoursAgo = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60);
  const isRecent = hoursAgo <= 48;

  return {
    id: raw.id,
    title: raw.title || 'Unnamed Event',
    description: raw.description || '',
    category: primaryCat,
    categoryColor: catColor,
    sources: raw.sources || [],
    geometry: geometries,
    lat,
    lng,
    altitude: 0.015,
    trackPath: trackPath.length > 1 ? trackPath : null,
    lastUpdatedDate: lastUpdated,
    lastUpdatedStr: lastUpdated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    isRecent,
    closed: !!raw.closed,
    magnitude: latestGeom.magnitudeValue ? `${latestGeom.magnitudeValue} ${latestGeom.magnitudeUnit || ''}` : null
  };
}

// --- DATA FETCHING & SESSION CACHING ---
async function fetchWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function fetchCategories() {
  try {
    const res = await fetchWithTimeout(`${EONET_API_BASE}/categories`, 8000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.categories || [];
  } catch (err) {
    console.warn('Failed to fetch categories, using defaults:', err);
    return [
      { id: 'wildfires', title: 'Wildfires' },
      { id: 'severeStorms', title: 'Severe Storms' },
      { id: 'volcanoes', title: 'Volcanoes' },
      { id: 'floods', title: 'Floods' },
      { id: 'seaLakeIce', title: 'Sea and Lake Ice' },
      { id: 'earthquakes', title: 'Earthquakes' },
      { id: 'landslides', title: 'Landslides' },
      { id: 'dustHaze', title: 'Dust and Haze' },
      { id: 'drought', title: 'Drought' }
    ];
  }
}

async function fetchEvents(daysParam = 0, retryCount = 1) {
  const cacheKey = `eonet_events_days_${daysParam}`;
  const cached = sessionStorage.getItem(cacheKey);
  const cachedTime = sessionStorage.getItem(`${cacheKey}_time`);

  if (cached && cachedTime && (Date.now() - Number(cachedTime) < CACHE_DURATION_MS)) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.warn('Corrupt cache:', e);
    }
  }

  // Construct URL - limit to 200 as specified in project prompt
  let url = `${EONET_API_BASE}/events?limit=200`;
  if (daysParam > 0) {
    url += `&days=${daysParam}`;
  } else {
    url += `&status=open`;
  }

  try {
    const res = await fetchWithTimeout(url, 20000);
    if (!res.ok) throw new Error(`EONET API request failed with status: ${res.status}`);
    const data = await res.json();
    
    if (data && data.events) {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(data.events));
        sessionStorage.setItem(`${cacheKey}_time`, String(Date.now()));
      } catch (e) {
        console.warn('Session storage quota exceeded or disabled');
      }
      return data.events;
    }
    return [];
  } catch (err) {
    if (retryCount > 0) {
      console.warn(`Fetch failed (${err.message}), retrying once...`);
      return fetchEvents(daysParam, retryCount - 1);
    }
    throw err;
  }
}

// --- GLOBE INITIALIZATION (Stage 1 & 2) ---
function initGlobe() {
  const container = document.getElementById('globeViz');
  
  const globe = Globe()(container)
    .backgroundColor('#030712')
    .showGlobe(true)
    .showAtmosphere(true)
    .atmosphereColor('#38bdf8')
    .atmosphereAltitude(0.18)
    .globeImageUrl(BLUE_MARBLE_FALLBACK); // Fallback image base

  // Configure Point visualization
  globe
    .pointsData([])
    .pointLat('lat')
    .pointLng('lng')
    .pointAltitude(0.015)
    .pointRadius(0.8)
    .pointColor('categoryColor')
    .pointResolution(16)
    .onPointHover(handlePointHover)
    .onPointClick(handlePointClick);

  // Configure Ring visualization (Pulsing rings for events updated in last 48h)
  globe
    .ringsData([])
    .ringLat('lat')
    .ringLng('lng')
    .ringAltitude(0.012)
    .ringColor(d => (t) => {
      // Self-propagating fading ripple ring
      return `rgba(255, 255, 255, ${Math.max(0, 0.9 * (1 - t))})`;
    })
    .ringMaxRadius(2.5)
    .ringPropagationSpeed(1.8)
    .ringRepeatPeriod(1800);

  // Configure Paths visualization (for storm & iceberg tracks)
  globe
    .pathsData([])
    .pathPoints('points')
    .pathPointLat(p => p[0])
    .pathPointLng(p => p[1])
    .pathColor(() => '#38bdf8')
    .pathStroke(2.5)
    .pathDashLength(0.05)
    .pathDashGap(0.02)
    .pathDashAnimateTime(2500);

  // Auto-rotation setup
  const controls = globe.controls();
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.5;
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  // Stop auto-rotation upon user interaction
  controls.addEventListener('start', () => {
    if (state.isAutoRotating) {
      controls.autoRotate = false;
      state.isAutoRotating = false;
      document.getElementById('btnToggleAutoRotate')?.classList.remove('active');
    }
  });

  // Tile engine setup with GIBS WMTS
  applyTileEngine(globe);

  state.globeInstance = globe;
  return globe;
}

// Wire the tiles into globe.gl via its tile-engine option
function applyTileEngine(globe) {
  const layerCfg = BASEMAP_LAYERS[state.activeLayerKey] || BASEMAP_LAYERS.truecolor;
  const dateStr = layerCfg.dated ? state.selectedDate : 'default';

  globe.globeTileEngineUrl((x, y, l) => {
    // Guard against requests exceeding the real max zoom level of the layer
    if (l > layerCfg.maxZoom) return null;
    return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layerCfg.id}/default/${dateStr}/${layerCfg.matrix}/${l}/${y}/${x}.${layerCfg.ext}`;
  });

  // Trigger cache refresh
  if (typeof globe.globeTileEngineClearCache === 'function') {
    globe.globeTileEngineClearCache();
  }
}

// --- HOVER & CLICK HANDLERS ---
let tooltipEl = null;

function handlePointHover(point, prevPoint) {
  const container = document.getElementById('globeViz');
  
  if (!point) {
    if (tooltipEl) {
      tooltipEl.remove();
      tooltipEl = null;
    }
    container.style.cursor = 'default';
    return;
  }

  container.style.cursor = 'pointer';

  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'globe-tooltip';
    document.body.appendChild(tooltipEl);
  }

  tooltipEl.innerHTML = `
    <div class="tooltip-category" style="color: ${point.categoryColor}">${point.category.title}</div>
    <div class="tooltip-title">${point.title}</div>
    <div class="tooltip-date">Updated: ${point.lastUpdatedStr} ${point.isRecent ? '• <span style="color:#22c55e">LIVE (&lt;48h)</span>' : ''}</div>
  `;

  const onMouseMove = (e) => {
    if (tooltipEl) {
      tooltipEl.style.left = `${e.clientX}px`;
      tooltipEl.style.top = `${e.clientY}px`;
    }
  };

  window.addEventListener('mousemove', onMouseMove, { once: true });
}

function handlePointClick(point) {
  if (!point) return;
  selectAndFlyToEvent(point);
}

function flyToEvent(point, altitude = 0.6, durationMs = 1500) {
  if (!state.globeInstance || !point) return;
  state.globeInstance.pointOfView({
    lat: point.lat,
    lng: point.lng,
    altitude
  }, durationMs);
}

function selectAndFlyToEvent(point) {
  state.selectedEvent = point;
  flyToEvent(point, 0.7, 1400);
  openDetailPanel(point);

  // Render movement track on the globe if present
  if (point.trackPath && point.trackPath.length > 1) {
    state.globeInstance.pathsData([{
      id: point.id,
      points: point.trackPath
    }]);
  } else {
    state.globeInstance.pathsData([]);
  }
}

// --- EVENT DETAIL PANEL (Stage 3) ---
function openDetailPanel(event) {
  const panel = document.getElementById('eventDetailPanel');
  const catBadge = document.getElementById('panelCategoryBadge');
  const title = document.getElementById('panelTitle');
  const status = document.getElementById('panelStatus');
  const lastDate = document.getElementById('panelLastDate');
  const coords = document.getElementById('panelCoords');
  const obsCount = document.getElementById('panelObsCount');
  const magRow = document.getElementById('panelMagnitudeRow');
  const magnitude = document.getElementById('panelMagnitude');
  const trackSection = document.getElementById('panelTrackSection');
  const trackPointsCount = document.getElementById('trackPointsCount');
  const sourcesList = document.getElementById('panelSourcesList');

  // Populate data
  catBadge.textContent = event.category.title.toUpperCase();
  catBadge.style.color = event.categoryColor;
  catBadge.style.borderColor = event.categoryColor;
  catBadge.style.backgroundColor = `${event.categoryColor}22`;

  title.textContent = event.title;
  status.textContent = event.closed ? 'CLOSED' : 'OPEN';
  status.style.color = event.closed ? '#94a3b8' : '#22c55e';
  lastDate.textContent = event.lastUpdatedStr;
  coords.textContent = formatCoordinates(event.lat, event.lng);
  obsCount.textContent = event.geometry.length;

  if (event.magnitude) {
    magRow.style.display = 'flex';
    magnitude.textContent = event.magnitude;
  } else {
    magRow.style.display = 'none';
  }

  if (event.trackPath && event.trackPath.length > 1) {
    trackSection.style.display = 'block';
    trackPointsCount.textContent = event.trackPath.length;
  } else {
    trackSection.style.display = 'none';
  }

  // Sources
  sourcesList.innerHTML = '';
  if (event.sources && event.sources.length > 0) {
    event.sources.forEach(src => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="${src.url}" target="_blank" rel="noopener noreferrer">${src.id || 'External Reference'} &nearr;</a>`;
      sourcesList.appendChild(li);
    });
  } else {
    sourcesList.innerHTML = '<li style="color: var(--text-dim); font-size: 11px;">No external sources linked.</li>';
  }

  panel.classList.add('open');
  // Close insight drawer if open to prevent overlap
  document.getElementById('insightDrawer')?.classList.remove('open');
}

function closeDetailPanel() {
  const panel = document.getElementById('eventDetailPanel');
  panel.classList.remove('open');
  if (state.globeInstance) {
    state.globeInstance.pathsData([]);
  }
  state.selectedEvent = null;
}

// --- FILTERING & RENDERING (Stage 4) ---
function filterEvents() {
  const query = state.searchQuery.trim().toLowerCase();
  
  state.filteredEvents = state.allEvents.filter(ev => {
    // 1. Category filter
    if (state.selectedCategoryIds.size > 0 && !state.selectedCategoryIds.has(ev.category.id)) {
      return false;
    }
    // 2. Search query filter
    if (query) {
      const matchTitle = ev.title.toLowerCase().includes(query);
      const matchCat = ev.category.title.toLowerCase().includes(query);
      if (!matchTitle && !matchCat) return false;
    }
    return true;
  });

  renderGlobeData();
  updateCategoryChipsCounts();
  buildSummary();
}

function renderGlobeData() {
  if (!state.globeInstance) return;

  // Update Points
  state.globeInstance.pointsData(state.filteredEvents);

  // Update Pulsing Rings for events updated in the last 48 hours
  const recentEvents = state.filteredEvents.filter(e => e.isRecent);
  state.globeInstance.ringsData(recentEvents);
}

// --- CATEGORY CHIPS UI ---
function renderCategoryChips() {
  const container = document.getElementById('categoryChips');
  container.innerHTML = '';

  state.categories.forEach(cat => {
    const chip = document.createElement('button');
    chip.className = `cat-chip ${state.selectedCategoryIds.has(cat.id) ? 'active' : ''}`;
    chip.style.setProperty('--chip-color', getCategoryColor(cat.id));
    chip.dataset.catId = cat.id;

    chip.innerHTML = `
      <span class="chip-dot"></span>
      <span>${cat.title}</span>
      <span class="chip-count" id="count_${cat.id}">0</span>
    `;

    chip.addEventListener('click', () => {
      if (state.selectedCategoryIds.has(cat.id)) {
        state.selectedCategoryIds.delete(cat.id);
      } else {
        state.selectedCategoryIds.add(cat.id);
      }
      
      const badge = document.getElementById('selectedCatCount');
      badge.textContent = state.selectedCategoryIds.size === 0 ? 'ALL' : `${state.selectedCategoryIds.size} ACTIVE`;

      chip.classList.toggle('active', state.selectedCategoryIds.has(cat.id));
      filterEvents();
    });

    container.appendChild(chip);
  });
}

function updateCategoryChipsCounts() {
  // Count by category across all events
  const counts = {};
  state.allEvents.forEach(e => {
    counts[e.category.id] = (counts[e.category.id] || 0) + 1;
  });

  state.categories.forEach(cat => {
    const el = document.getElementById(`count_${cat.id}`);
    if (el) {
      el.textContent = counts[cat.id] || 0;
    }
  });
}

// --- INSIGHT LAYER: TODAY'S SUMMARY & BARS (Stage 5) ---
function buildSummary() {
  const events = state.filteredEvents;
  const totalEl = document.getElementById('statTotalEvents');
  const recentEl = document.getElementById('statRecentEvents');
  const hotspotEl = document.getElementById('statHotspotRegion');
  const chartEl = document.getElementById('categoryBarChart');
  const recTitle = document.getElementById('recTitle');
  const recCat = document.getElementById('recCategory');
  const recDate = document.getElementById('recDate');
  const recFlyBtn = document.getElementById('recFlyBtn');

  totalEl.textContent = events.length;
  const recentCount = events.filter(e => e.isRecent).length;
  recentEl.textContent = recentCount;

  // 1. Calculate highest density hotspot region (simple lat/lon grid bucketing: 30° bins)
  const gridBins = {};
  events.forEach(e => {
    const latBin = Math.floor(e.lat / 30) * 30;
    const lngBin = Math.floor(e.lng / 45) * 45;
    const key = `${latBin >= 0 ? latBin + '°N' : Math.abs(latBin) + '°S'}, ${lngBin >= 0 ? lngBin + '°E' : Math.abs(lngBin) + '°W'}`;
    gridBins[key] = (gridBins[key] || 0) + 1;
  });

  let topHotspot = 'None';
  let topCount = 0;
  Object.entries(gridBins).forEach(([bin, count]) => {
    if (count > topCount) {
      topCount = count;
      topHotspot = `${bin} (${count} events)`;
    }
  });
  hotspotEl.textContent = topHotspot;

  // 2. Build Category Bar Chart (plain SVG / CSS bars)
  const catDistribution = {};
  events.forEach(e => {
    catDistribution[e.category.title] = {
      count: (catDistribution[e.category.title]?.count || 0) + 1,
      color: e.categoryColor
    };
  });

  const sortedCats = Object.entries(catDistribution).sort((a, b) => b[1].count - a[1].count);
  const maxCatCount = sortedCats[0] ? sortedCats[0][1].count : 1;

  chartEl.innerHTML = '';
  if (sortedCats.length === 0) {
    chartEl.innerHTML = '<div style="font-size: 11px; color: var(--text-dim); text-align: center; padding: 10px;">No events matching current criteria</div>';
  } else {
    sortedCats.forEach(([catTitle, data]) => {
      const percentage = Math.round((data.count / maxCatCount) * 100);
      const row = document.createElement('div');
      row.className = 'bar-row';
      row.innerHTML = `
        <div class="bar-labels">
          <span>${catTitle}</span>
          <span class="font-mono">${data.count}</span>
        </div>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${percentage}%; background-color: ${data.color}"></div>
        </div>
      `;
      chartEl.appendChild(row);
    });
  }

  // 3. Most recently updated event
  if (events.length > 0) {
    const sortedByDate = [...events].sort((a, b) => b.lastUpdatedDate - a.lastUpdatedDate);
    const mostRecent = sortedByDate[0];
    recTitle.textContent = mostRecent.title;
    recCat.textContent = mostRecent.category.title;
    recCat.style.color = mostRecent.categoryColor;
    recDate.textContent = mostRecent.lastUpdatedStr;

    recFlyBtn.onclick = () => {
      selectAndFlyToEvent(mostRecent);
    };
  } else {
    recTitle.textContent = 'No matching events';
    recCat.textContent = '-';
    recDate.textContent = '-';
    recFlyBtn.onclick = null;
  }
}

// --- INITIALIZATION & EVENT LISTENERS ---
async function loadFeedData(daysParam = 0) {
  const statusBadge = document.getElementById('liveFeedStatus');
  const statusLabel = document.getElementById('statusLabel');
  const retryBtn = document.getElementById('retryFeedBtn');

  statusBadge.className = 'status-badge loading';
  statusLabel.textContent = 'FETCHING EONET DATA...';
  if (retryBtn) retryBtn.style.display = 'none';

  try {
    const rawEvents = await fetchEvents(daysParam);
    state.allEvents = rawEvents.map(normalizeEvent).filter(Boolean);
    filterEvents();

    statusBadge.className = 'status-badge';
    statusLabel.textContent = `LIVE FEED // ${state.allEvents.length} EVENTS`;
  } catch (err) {
    console.error('Feed load error:', err);
    statusBadge.className = 'status-badge error';
    statusLabel.textContent = 'FEED ERROR: CHECK NETWORK';
    if (retryBtn) {
      retryBtn.style.display = 'inline-block';
      retryBtn.onclick = () => loadFeedData(state.includeClosed ? 30 : 0);
    }
  }
}

async function initApp() {
  const statusBadge = document.getElementById('liveFeedStatus');
  const statusLabel = document.getElementById('statusLabel');
  const retryBtn = document.getElementById('retryFeedBtn');

  try {
    // Initialize 3D Globe
    initGlobe();

    // Fetch Categories
    statusLabel.textContent = 'CONNECTING TO EONET...';
    state.categories = await fetchCategories();
    renderCategoryChips();

    // Fetch initial events
    await loadFeedData(0);

  } catch (err) {
    console.error('Initialization error:', err);
    statusBadge.className = 'status-badge error';
    statusLabel.textContent = 'FEED ERROR: CHECK NETWORK';
    if (retryBtn) {
      retryBtn.style.display = 'inline-block';
      retryBtn.onclick = () => initApp();
    }
  }

  setupEventListeners();
}

function setupEventListeners() {
  // Search box
  const searchInput = document.getElementById('eventSearch');
  const clearBtn = document.getElementById('clearSearchBtn');

  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    clearBtn.style.display = state.searchQuery ? 'block' : 'none';
    filterEvents();
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.searchQuery = '';
    clearBtn.style.display = 'none';
    filterEvents();
  });

  // Toggle: Open Only vs Include Closed
  const btnOpen = document.getElementById('btnOpenOnly');
  const btnClosed = document.getElementById('btnIncludeClosed');

  btnOpen.addEventListener('click', () => {
    if (btnOpen.classList.contains('active')) return;
    btnOpen.classList.add('active');
    btnClosed.classList.remove('active');
    state.includeClosed = false;
    loadFeedData(0);
  });

  btnClosed.addEventListener('click', () => {
    if (btnClosed.classList.contains('active')) return;
    btnClosed.classList.add('active');
    btnOpen.classList.remove('active');
    state.includeClosed = true;
    loadFeedData(30);
  });

  // Basemap Layer Switcher
  const layerButtons = document.querySelectorAll('.layer-btn');
  layerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      layerButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeLayerKey = btn.dataset.layer;
      applyTileEngine(state.globeInstance);
    });
  });

  // Date Slider for Imagery (0 to 30 days ago, default value=29 represents yesterday)
  const dateSlider = document.getElementById('imageryDateSlider');
  const currentDateDisplay = document.getElementById('currentDateDisplay');
  const dateOffsetTag = document.getElementById('dateOffsetTag');
  const imageryDateLabel = document.getElementById('imageryDateLabel');

  // Set initial display
  currentDateDisplay.textContent = state.selectedDate;

  dateSlider.addEventListener('input', (e) => {
    // 30 is today (0d), 29 is yesterday (1d), 0 is 30 days ago
    const sliderVal = Number(e.target.value);
    const daysAgo = 30 - sliderVal;
    
    // Protect: today (0 days ago) is often incomplete on GIBS, yesterday is safe
    const effectiveDays = Math.max(1, daysAgo);
    state.daysOffset = effectiveDays;
    state.selectedDate = getFormattedDate(effectiveDays);

    currentDateDisplay.textContent = state.selectedDate;
    dateOffsetTag.textContent = `-${effectiveDays}d`;
    imageryDateLabel.textContent = effectiveDays === 1 ? 'YESTERDAY' : `${effectiveDays}D AGO`;

    applyTileEngine(state.globeInstance);
  });

  // Event Detail Panel Close
  document.getElementById('closeDetailBtn')?.addEventListener('click', closeDetailPanel);

  // "View satellite imagery here" button
  document.getElementById('btnFocusImagery')?.addEventListener('click', () => {
    if (!state.selectedEvent) return;
    // Switch to truecolor if not already
    state.activeLayerKey = 'truecolor';
    document.querySelectorAll('.layer-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.layer === 'truecolor');
    });
    applyTileEngine(state.globeInstance);
    // Zoom in close to event location
    flyToEvent(state.selectedEvent, 0.25, 2000);
  });

  // Insight Drawer Toggle
  const insightDrawer = document.getElementById('insightDrawer');
  document.getElementById('summaryToggleBtn')?.addEventListener('click', () => {
    insightDrawer.classList.toggle('open');
    if (insightDrawer.classList.contains('open')) {
      closeDetailPanel();
    }
  });
  document.getElementById('closeInsightBtn')?.addEventListener('click', () => {
    insightDrawer.classList.remove('open');
  });

  // Auto-rotation toggle button
  const autoRotateBtn = document.getElementById('btnToggleAutoRotate');
  autoRotateBtn?.addEventListener('click', () => {
    const controls = state.globeInstance?.controls();
    if (!controls) return;
    state.isAutoRotating = !state.isAutoRotating;
    controls.autoRotate = state.isAutoRotating;
    autoRotateBtn.classList.toggle('active', state.isAutoRotating);
  });

  // Reset View button
  document.getElementById('btnResetView')?.addEventListener('click', () => {
    if (!state.globeInstance) return;
    state.globeInstance.pointOfView({ lat: 20, lng: 0, altitude: 2.2 }, 1500);
    closeDetailPanel();
  });
}

// Start application
window.addEventListener('DOMContentLoaded', initApp);
