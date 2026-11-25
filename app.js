/**
 * EARTH, RIGHT NOW (TileEarth)
 * Editorial natural events atlas visualizing live NASA EONET data
 * over NASA GIBS satellite tiles on an interactive Globe.gl canvas.
 * Plain vanilla ES module.
 */

// --- CONFIGURATION & CONSTANTS ---
const EONET_API_BASE = 'https://eonet.gsfc.nasa.gov/api/v3';
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes cache
const BLUE_MARBLE_FALLBACK = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';

// Accessible, distinct, muted tones for categories
const CATEGORY_STYLES = {
  wildfires: {
    title: 'Wildfires',
    color: '#c2410c', // Warm rust
    icon: `<svg viewBox="0 0 24 24"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`
  },
  severeStorms: {
    title: 'Severe Storms',
    color: '#7e22ce', // Deep violet
    icon: `<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-1.74 19.85M12 6a6 6 0 0 1 5.66 4M12 10a2 2 0 0 0-1.9 2.6M7 16a6 6 0 0 1-1-3.5"/></svg>`
  },
  volcanoes: {
    title: 'Volcanoes',
    color: '#b91c1c', // Muted crimson
    icon: `<svg viewBox="0 0 24 24"><path d="m2 22 7-14h6l7 14H2z"/><path d="M10 8V3M14 8V2M12 8V4"/></svg>`
  },
  floods: {
    title: 'Floods',
    color: '#1d4ed8', // River blue
    icon: `<svg viewBox="0 0 24 24"><path d="M2 12c2.5-2 5.5-2 8 0s5.5 2 8 0 3.5-1 4-1"/><path d="M2 17c2.5-2 5.5-2 8 0s5.5 2 8 0 3.5-1 4-1"/></svg>`
  },
  seaLakeIce: {
    title: 'Sea & Lake Ice',
    color: '#0e7490', // Glacial teal
    icon: `<svg viewBox="0 0 24 24"><path d="m10 4 2 2 2-2M10 20l2-2 2 2M4 10l2 2-2 2M20 10l-2 2 2 2M2 12h20M12 2v20"/></svg>`
  },
  earthquakes: {
    title: 'Earthquakes',
    color: '#a16207', // Amber earth
    icon: `<svg viewBox="0 0 24 24"><path d="M2 12h5l2-6 4 12 3-8 2 4h4"/></svg>`
  },
  landslides: {
    title: 'Landslides',
    color: '#4d7c0f', // Forest moss
    icon: `<svg viewBox="0 0 24 24"><path d="m3 20 9-14 4 6 5-3v11H3z"/><rect x="15" y="10" width="3" height="3" rx="0.5"/><rect x="18" y="15" width="2.5" height="2.5" rx="0.5"/></svg>`
  },
  dustHaze: {
    title: 'Dust & Haze',
    color: '#9a3412', // Desert ochre
    icon: `<svg viewBox="0 0 24 24"><path d="M4 8h16M2 12h20M6 16h12M8 20h8"/></svg>`
  },
  drought: {
    title: 'Drought',
    color: '#78350f', // Parched soil
    icon: `<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M12 1v2M12 11v2M18 7h2M4 7h2M2 19h20M7 19l2 3M17 19l-2 3M12 19v3"/></svg>`
  },
  snow: {
    title: 'Snow',
    color: '#0284c7', // Winter sky
    icon: `<svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18M6.5 6.5l11 11M6.5 17.5l11-11"/></svg>`
  },
  tempExtremes: {
    title: 'Temperature Extremes',
    color: '#be123c', // Thermal rose
    icon: `<svg viewBox="0 0 24 24"><path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/></svg>`
  },
  waterColor: {
    title: 'Water Color',
    color: '#0f766e', // Deep sea
    icon: `<svg viewBox="0 0 24 24"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>`
  },
  manmade: {
    title: 'Manmade',
    color: '#475569', // Industrial slate
    icon: `<svg viewBox="0 0 24 24"><path d="M2 20h20M4 20V10l6 4V10l6 4v6M18 20V4h2v16"/></svg>`
  },
  unknown: {
    title: 'Natural Event',
    color: '#52525b', // Neutral zinc
    icon: `<svg viewBox="0 0 24 24"><path d="M12 2 2 12l10 10 10-10L12 2z"/></svg>`
  }
};

// Basemap layer parameters
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
    dated: false
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
  isAutoRotating: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  globeInstance: null,
  activeTooltipEl: null
};

// --- DATE & TIME HELPERS ---
function getFormattedDate(daysAgo = 1) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

function formatRelativeTime(date) {
  const dt = new Date(date);
  const diffMs = Date.now() - dt.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffHours < 1) return 'Updated just now';
  if (diffHours < 24) return `Updated ${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `Updated ${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatCoordinates(lat, lng) {
  const latStr = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(lng).toFixed(2)}°${lng >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lngStr}`;
}

function getCategoryConfig(categoryId) {
  return CATEGORY_STYLES[categoryId] || CATEGORY_STYLES.unknown;
}

// --- NORMALIZATION ---
function normalizeEvent(raw) {
  if (!raw || !raw.geometry || raw.geometry.length === 0) return null;

  const geometries = [...raw.geometry];
  geometries.sort((a, b) => new Date(a.date) - new Date(b.date));

  const latestGeom = geometries[geometries.length - 1];
  let lat = null;
  let lng = null;

  if (latestGeom.type === 'Point' && Array.isArray(latestGeom.coordinates)) {
    lng = Number(latestGeom.coordinates[0]);
    lat = Number(latestGeom.coordinates[1]);
  } else if (latestGeom.type === 'Polygon' && Array.isArray(latestGeom.coordinates)) {
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

  const primaryCat = (raw.categories && raw.categories[0]) ? raw.categories[0] : { id: 'unknown', title: 'Natural Event' };
  const catConfig = getCategoryConfig(primaryCat.id);

  // Extract track trajectory coordinates for storms, icebergs, etc.
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
    title: raw.title || 'Natural Event',
    category: primaryCat,
    categoryConfig: catConfig,
    sources: raw.sources || [],
    geometry: geometries,
    lat,
    lng,
    altitude: 0.015,
    trackPath: trackPath.length > 1 ? trackPath : null,
    lastUpdatedDate: lastUpdated,
    lastUpdatedRelative: formatRelativeTime(lastUpdated),
    isRecent,
    closed: !!raw.closed,
    magnitude: latestGeom.magnitudeValue ? `${latestGeom.magnitudeValue} ${latestGeom.magnitudeUnit || ''}` : null
  };
}

// --- DATA FETCHING WITH TIMEOUT & ROBUST CACHING ---
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
    console.warn('Categories API unavailable, using local catalog:', err);
    return Object.entries(CATEGORY_STYLES).map(([id, info]) => ({ id, title: info.title }));
  }
}

async function fetchEvents(daysParam = 0, retryCount = 1) {
  const cacheKey = `eonet_events_days_${daysParam}`;
  const cached = sessionStorage.getItem(cacheKey);
  const cachedTime = sessionStorage.getItem(`${cacheKey}_time`);

  if (cached && cachedTime && (Date.now() - Number(cachedTime) < CACHE_DURATION_MS)) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        return parsed; // Cache valid empty array too
      }
    } catch (e) {
      console.warn('Corrupt cache:', e);
    }
  }

  let url = `${EONET_API_BASE}/events?limit=200`;
  if (daysParam > 0) {
    url += `&days=${daysParam}`;
  } else {
    url += `&status=open`;
  }

  try {
    const res = await fetchWithTimeout(url, 20000);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    
    if (data && Array.isArray(data.events)) {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(data.events));
        sessionStorage.setItem(`${cacheKey}_time`, String(Date.now()));
      } catch (e) {
        console.warn('Session storage write failed');
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

// --- GLOBE INITIALIZATION (Phase 1 & Phase 2) ---
function initGlobe() {
  const container = document.getElementById('globeViz');
  if (!container) throw new Error('Globe container #globeViz not found');
  if (typeof Globe !== 'function') throw new Error('Globe.gl library is not loaded');

  const globe = Globe()(container)
    .backgroundColor('#080b11')
    .showGlobe(true)
    .showAtmosphere(true)
    .atmosphereColor('#fbbf24')
    .atmosphereAltitude(0.12)
    .globeImageUrl(BLUE_MARBLE_FALLBACK);

  // Configure HTML Elements Layer (Phase 2: bespoke category symbols)
  globe
    .htmlElementsData([])
    .htmlLat('lat')
    .htmlLng('lng')
    .htmlAltitude('altitude')
    .htmlElement(createEventMarkerElement)
    .htmlElementVisibilityModifier((el, isVisible) => {
      // Hide markers located on the far side of the globe
      el.style.opacity = isVisible ? '1' : '0';
      el.style.pointerEvents = isVisible ? 'auto' : 'none';
    });

  // Configure Movement Paths for tracking storms, icebergs, etc.
  globe
    .pathsData([])
    .pathPoints('points')
    .pathPointLat(p => p[0])
    .pathPointLng(p => p[1])
    .pathColor(() => '#fbbf24')
    .pathStroke(2.2)
    .pathDashLength(0.04)
    .pathDashGap(0.02)
    .pathDashAnimateTime(2000);

  // Auto-rotation controls
  const controls = globe.controls();
  controls.autoRotate = state.isAutoRotating;
  controls.autoRotateSpeed = 0.4;
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  controls.addEventListener('start', () => {
    if (state.isAutoRotating) {
      controls.autoRotate = false;
      state.isAutoRotating = false;
      document.getElementById('btnToggleAutoRotate')?.classList.remove('active');
    }
  });

  applyTileEngine(globe);
  state.globeInstance = globe;
  return globe;
}

// Slippy map GIBS tile engine
function applyTileEngine(globe) {
  if (typeof globe.globeTileEngineUrl !== 'function') return;

  const layerCfg = BASEMAP_LAYERS[state.activeLayerKey] || BASEMAP_LAYERS.truecolor;
  const dateStr = layerCfg.dated ? state.selectedDate : 'default';

  globe.globeTileEngineUrl((x, y, l) => {
    if (l > layerCfg.maxZoom) return null;
    return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layerCfg.id}/default/${dateStr}/${layerCfg.matrix}/${l}/${y}/${x}.${layerCfg.ext}`;
  });

  if (typeof globe.globeTileEngineClearCache === 'function') {
    globe.globeTileEngineClearCache();
  }
}

// --- PHASE 2: BESPOKE HTML EVENT MARKERS ---
function createEventMarkerElement(event) {
  const el = document.createElement('div');
  el.className = `event-globe-marker ${event.isRecent ? 'is-recent' : ''}`;
  el.style.backgroundColor = event.categoryConfig.color;
  el.setAttribute('tabindex', '0');
  el.setAttribute('role', 'button');
  el.setAttribute('aria-label', `${event.title}, ${event.category.title}`);

  el.innerHTML = event.categoryConfig.icon;

  if (event.clusterCount && event.clusterCount > 1) {
    const badge = document.createElement('span');
    badge.className = 'cluster-count-badge';
    badge.textContent = event.clusterCount;
    el.appendChild(badge);
  }

  // Hover Tooltip
  el.addEventListener('mouseenter', (e) => showQuietTooltip(event, e));
  el.addEventListener('mouseleave', hideQuietTooltip);

  // Click & Keyboard Focus Fly-to
  const activate = () => selectAndFlyToEvent(event);
  el.addEventListener('click', activate);
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate();
    }
  });

  return el;
}

// Quiet, restrained tooltip
function showQuietTooltip(event, e) {
  hideQuietTooltip();
  const tooltip = document.createElement('div');
  tooltip.className = 'globe-tooltip-quiet';
  tooltip.innerHTML = `
    <div class="tooltip-badge">
      ${event.categoryConfig.icon}
      <span>${event.category.title}</span>
    </div>
    <div class="tooltip-title-text">${event.title}</div>
    <div class="tooltip-rel-time">${event.lastUpdatedRelative}</div>
  `;
  document.body.appendChild(tooltip);

  const rect = e.target.getBoundingClientRect();
  tooltip.style.left = `${rect.left + rect.width / 2}px`;
  tooltip.style.top = `${rect.top}px`;
  state.activeTooltipEl = tooltip;
}

function hideQuietTooltip() {
  if (state.activeTooltipEl) {
    state.activeTooltipEl.remove();
    state.activeTooltipEl = null;
  }
}

// Camera Fly-To & Selection
function selectAndFlyToEvent(event) {
  state.selectedEvent = event;
  if (state.globeInstance) {
    state.globeInstance.pointOfView({
      lat: event.lat,
      lng: event.lng,
      altitude: 0.6
    }, 1400);

    // Render historical track path if storm/iceberg
    if (event.trackPath && event.trackPath.length > 1) {
      state.globeInstance.pathsData([{
        id: event.id,
        points: event.trackPath
      }]);
    } else {
      state.globeInstance.pathsData([]);
    }
  }

  openDetailPanel(event);
}

// --- EVENT DETAIL SHEET ---
function openDetailPanel(event) {
  const panel = document.getElementById('eventDetailPanel');
  const catBadge = document.getElementById('panelCategoryBadge');
  const catIcon = document.getElementById('panelCategoryIcon');
  const catName = document.getElementById('panelCategoryName');
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

  catIcon.innerHTML = event.categoryConfig.icon;
  catName.textContent = event.category.title;
  title.textContent = event.title;
  status.textContent = event.closed ? 'Closed' : 'Open';
  status.style.color = event.closed ? 'var(--status-closed)' : 'var(--status-open)';
  lastDate.textContent = event.lastUpdatedRelative;
  coords.textContent = formatCoordinates(event.lat, event.lng);
  obsCount.textContent = event.geometry.length;

  if (event.magnitude) {
    magRow.style.display = 'block';
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

  sourcesList.innerHTML = '';
  if (event.sources && event.sources.length > 0) {
    event.sources.forEach(src => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="${src.url}" target="_blank" rel="noopener noreferrer">${src.id || 'Scientific report source'} &nearr;</a>`;
      sourcesList.appendChild(li);
    });
  } else {
    sourcesList.innerHTML = '<li style="color: var(--text-tertiary); font-size: 12px;">No external sources linked.</li>';
  }

  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
}

function closeDetailPanel() {
  const panel = document.getElementById('eventDetailPanel');
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  if (state.globeInstance) {
    state.globeInstance.pathsData([]);
  }
  state.selectedEvent = null;
}

// --- FILTERING & CLUSTERING ---
function filterEvents() {
  const query = state.searchQuery.trim().toLowerCase();

  const filtered = state.allEvents.filter(ev => {
    if (state.selectedCategoryIds.size > 0 && !state.selectedCategoryIds.has(ev.category.id)) {
      return false;
    }
    if (query) {
      const matchTitle = ev.title.toLowerCase().includes(query);
      const matchCat = ev.category.title.toLowerCase().includes(query);
      if (!matchTitle && !matchCat) return false;
    }
    return true;
  });

  // Simple cluster / anti-overlap offset for markers closely positioned
  const clusters = {};
  filtered.forEach(e => {
    const key = `${Math.round(e.lat * 2) / 2}_${Math.round(e.lng * 2) / 2}`;
    if (!clusters[key]) clusters[key] = [];
    clusters[key].push(e);
  });

  const displayList = [];
  Object.values(clusters).forEach(group => {
    if (group.length === 1) {
      group[0].clusterCount = 1;
      displayList.push(group[0]);
    } else {
      // Offset overlapping markers slightly radially so each remains accessible
      group.forEach((item, idx) => {
        const angle = (idx / group.length) * 2 * Math.PI;
        item.clusterCount = group.length;
        // subtle offset
        item.lat = item.lat + Math.sin(angle) * 0.25;
        item.lng = item.lng + Math.cos(angle) * 0.25;
        displayList.push(item);
      });
    }
  });

  state.filteredEvents = displayList;

  if (state.globeInstance) {
    state.globeInstance.htmlElementsData(state.filteredEvents);
  }

  updateCategoryCounters();
  buildSummary();
}

// --- CATEGORY CHIPS RENDERING ---
function renderCategoryChips() {
  const container = document.getElementById('categoryChips');
  container.innerHTML = '';

  state.categories.forEach(cat => {
    const cfg = getCategoryConfig(cat.id);
    const chip = document.createElement('button');
    chip.className = `cat-item ${state.selectedCategoryIds.has(cat.id) ? 'active' : ''}`;
    chip.dataset.catId = cat.id;

    chip.innerHTML = `
      <span class="cat-icon-svg" style="color: ${cfg.color}">${cfg.icon}</span>
      <span class="cat-title">${cat.title}</span>
      <span class="cat-count" id="count_${cat.id}">0</span>
    `;

    chip.addEventListener('click', () => {
      if (state.selectedCategoryIds.has(cat.id)) {
        state.selectedCategoryIds.delete(cat.id);
      } else {
        state.selectedCategoryIds.add(cat.id);
      }

      const badge = document.getElementById('activeFilterBadge');
      badge.textContent = state.selectedCategoryIds.size === 0 ? 'All' : `${state.selectedCategoryIds.size} active`;

      chip.classList.toggle('active', state.selectedCategoryIds.has(cat.id));
      filterEvents();
    });

    container.appendChild(chip);
  });
}

function updateCategoryCounters() {
  const counts = {};
  state.allEvents.forEach(e => {
    counts[e.category.id] = (counts[e.category.id] || 0) + 1;
  });

  state.categories.forEach(cat => {
    const el = document.getElementById(`count_${cat.id}`);
    if (el) el.textContent = counts[cat.id] || 0;
  });
}

// --- SUMMARY / ALMANAC LAYER ---
function buildSummary() {
  const events = state.filteredEvents;
  const headlineEl = document.getElementById('summaryHeadline');
  const chartEl = document.getElementById('categoryBarChart');
  const recTitle = document.getElementById('recTitle');
  const recCat = document.getElementById('recCategory');
  const recDate = document.getElementById('recDate');
  const recFlyBtn = document.getElementById('recFlyBtn');

  if (events.length === 0) {
    headlineEl.textContent = 'Nothing matches that filter. Try clearing a category.';
    chartEl.innerHTML = '';
    recTitle.textContent = 'No events currently active';
    recCat.textContent = '—';
    recDate.textContent = '—';
    recFlyBtn.onclick = null;
    return;
  }

  // 1. Generate human editorial summary headline
  const catCounts = {};
  events.forEach(e => {
    catCounts[e.category.title] = (catCounts[e.category.title] || 0) + 1;
  });

  const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
  const leadingCat = sortedCats[0];
  headlineEl.textContent = `${events.length} active events. ${leadingCat[0]} lead with ${leadingCat[1]} across the globe.`;

  // 2. Build Category Bar Chart with matching icons
  const maxCount = leadingCat ? leadingCat[1] : 1;
  chartEl.innerHTML = '';

  sortedCats.slice(0, 5).forEach(([catTitle, count]) => {
    const matched = events.find(e => e.category.title === catTitle);
    const cfg = matched ? matched.categoryConfig : CATEGORY_STYLES.unknown;
    const percentage = Math.round((count / maxCount) * 100);

    const row = document.createElement('div');
    row.className = 'bar-row';
    row.innerHTML = `
      <div class="bar-meta">
        <div class="bar-cat-info">
          <span class="cat-icon-svg" style="color: ${cfg.color}; width: 14px; height: 14px;">${cfg.icon}</span>
          <span>${catTitle}</span>
        </div>
        <span class="bar-count font-tabular">${count}</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width: ${percentage}%; background-color: ${cfg.color}"></div>
      </div>
    `;
    chartEl.appendChild(row);
  });

  // 3. Latest Observation Card
  const sortedByDate = [...events].sort((a, b) => b.lastUpdatedDate - a.lastUpdatedDate);
  const mostRecent = sortedByDate[0];

  recTitle.textContent = mostRecent.title;
  recCat.textContent = mostRecent.category.title;
  recCat.style.color = mostRecent.categoryConfig.color;
  recDate.textContent = mostRecent.lastUpdatedRelative;

  recFlyBtn.onclick = () => selectAndFlyToEvent(mostRecent);
}

// --- INITIALIZATION ---
async function loadFeedData(daysParam = 0) {
  const statusBadge = document.getElementById('liveFeedStatus');
  const statusLabel = document.getElementById('statusLabel');
  const retryBtn = document.getElementById('retryFeedBtn');

  statusBadge.className = 'status-banner loading';
  statusLabel.textContent = "Loading today's events...";
  if (retryBtn) retryBtn.style.display = 'none';

  let rawEvents = [];
  try {
    rawEvents = await fetchEvents(daysParam);
  } catch (err) {
    console.error('NASA EONET fetch error:', err);
    statusBadge.className = 'status-banner error';
    statusLabel.textContent = err.status 
      ? `Couldn't reach NASA feed (HTTP ${err.status}).` 
      : "Couldn't reach NASA's event feed. Check connection.";
    if (retryBtn) {
      retryBtn.style.display = 'inline-block';
      retryBtn.onclick = () => loadFeedData(state.includeClosed ? 30 : 0);
    }
    return;
  }

  try {
    state.allEvents = rawEvents.map(normalizeEvent).filter(Boolean);
    filterEvents();

    statusBadge.className = 'status-banner';
    statusLabel.textContent = `${state.allEvents.length} events reported`;
  } catch (renderErr) {
    console.error('Drawing error:', renderErr);
    statusBadge.className = 'status-banner error';
    statusLabel.textContent = "Events loaded but couldn't be drawn.";
    if (retryBtn) {
      retryBtn.style.display = 'inline-block';
      retryBtn.onclick = () => filterEvents();
    }
  }
}

async function initApp() {
  const statusBadge = document.getElementById('liveFeedStatus');
  const statusLabel = document.getElementById('statusLabel');
  const retryBtn = document.getElementById('retryFeedBtn');

  // 1. Globe Initialization
  try {
    initGlobe();
  } catch (globeErr) {
    console.error('Globe failure:', globeErr);
    statusBadge.className = 'status-banner error';
    statusLabel.textContent = "The globe couldn't start.";
    if (retryBtn) {
      retryBtn.style.display = 'inline-block';
      retryBtn.onclick = () => initApp();
    }
    return;
  }

  // 2. Categories
  try {
    state.categories = await fetchCategories();
    renderCategoryChips();
  } catch (catErr) {
    console.warn('Categories fallback in place:', catErr);
  }

  // 3. Events Data
  await loadFeedData(0);

  setupEventListeners();
}

function setupEventListeners() {
  // Search
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

  // Open vs Past 30 Days toggle
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

  // Basemap switch
  const basemapButtons = document.querySelectorAll('.basemap-btn');
  basemapButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      basemapButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeLayerKey = btn.dataset.layer;
      applyTileEngine(state.globeInstance);
    });
  });

  // Date Slider
  const dateSlider = document.getElementById('imageryDateSlider');
  const currentDateDisplay = document.getElementById('currentDateDisplay');

  dateSlider.addEventListener('input', (e) => {
    const sliderVal = Number(e.target.value);
    const daysAgo = 30 - sliderVal;
    const effectiveDays = Math.max(1, daysAgo);
    state.daysOffset = effectiveDays;
    state.selectedDate = getFormattedDate(effectiveDays);

    currentDateDisplay.textContent = effectiveDays === 1 ? 'Yesterday' : `${effectiveDays} days ago`;
    applyTileEngine(state.globeInstance);
  });

  // Detail panel close button
  document.getElementById('closeDetailBtn')?.addEventListener('click', closeDetailPanel);

  // Focus imagery action
  document.getElementById('btnFocusImagery')?.addEventListener('click', () => {
    if (!state.selectedEvent) return;
    state.activeLayerKey = 'truecolor';
    document.querySelectorAll('.basemap-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.layer === 'truecolor');
    });
    applyTileEngine(state.globeInstance);
    if (state.globeInstance) {
      state.globeInstance.pointOfView({
        lat: state.selectedEvent.lat,
        lng: state.selectedEvent.lng,
        altitude: 0.25
      }, 1800);
    }
  });

  // Reset view button
  document.getElementById('btnResetView')?.addEventListener('click', () => {
    if (!state.globeInstance) return;
    state.globeInstance.pointOfView({ lat: 20, lng: 0, altitude: 2.2 }, 1400);
    closeDetailPanel();
  });

  // Auto-rotate toggle
  const autoRotateBtn = document.getElementById('btnToggleAutoRotate');
  autoRotateBtn?.addEventListener('click', () => {
    const controls = state.globeInstance?.controls();
    if (!controls) return;
    state.isAutoRotating = !state.isAutoRotating;
    controls.autoRotate = state.isAutoRotating;
    autoRotateBtn.classList.toggle('active', state.isAutoRotating);
  });
}

// Start application
window.addEventListener('DOMContentLoaded', initApp);
