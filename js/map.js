/* ============================================================
   map.js — Professional Leaflet Map implementation for EVS.
   Multi-layer switcher, prominent pulsating GPS user pointer,
   custom subtype pins, real-time search, interactive report modal,
   glassmorphic popups, filter panel, and data export.
   ============================================================ */

const EVS_CENTER = [12.9716, 77.5946]; // Bangalore regional default
const EVS_DEFAULT_ZOOM = 12;

// Active filter state
const evsFilterState = {
  tree: true,
  water: true,
  hiddenSubtypes: new Set(),
  searchQuery: "",
};

let evsMap = null;
let evsMarkersLayer = null;
let evsUserLocationLayer = null;
let evsTileLayers = {};
let currentActiveTile = "street";
let evsAllReports = [];
let markerRegistry = new Map(); // id -> L.marker
let userMarker = null;
let userAccuracyCircle = null;
let userCoordinates = null;

/** Entry point on DOMContentLoaded */
function initEvsMap() {
  // 1. Initialize Map
  evsMap = L.map("map", {
    zoomControl: true,
    attributionControl: false,
  }).setView(EVS_CENTER, EVS_DEFAULT_ZOOM);

  // 2. Setup Tile Layer Provider (Free OpenStreetMap — no key or account required)
  evsTileLayers.street = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  });

  // Default to OpenStreetMap
  evsTileLayers.street.addTo(evsMap);

  // 3. Layer groups
  evsUserLocationLayer = L.layerGroup().addTo(evsMap);
  evsMarkersLayer = L.layerGroup().addTo(evsMap);

  // 4. Load reports from storage
  evsAllReports = getAllReports();

  // 5. Render UI & Pins
  renderMarkers();
  renderLegend();
  updateStatsChip();
  wireHeaderControls();
  wireMapClickEvent();
  wireReportModal();

  // 6. Check URL params (e.g. ?lat=...&lng=... or ?report=id)
  checkURLParameters();

  // 7. Request User Location proactively
  requestUserLocation(false);
}

/** Wire header search, layer switcher, locate button, and report button */
function wireHeaderControls() {
  // Layer Switchers
  const layerBtns = document.querySelectorAll(".layer-btn");
  layerBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const layerType = btn.getAttribute("data-layer");
      if (layerType === currentActiveTile) return;

      evsMap.removeLayer(evsTileLayers[currentActiveTile]);
      evsTileLayers[layerType].addTo(evsMap);
      currentActiveTile = layerType;

      layerBtns.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      showToast(`Map layer: ${btn.textContent.trim()}`);
    });
  });

  // Search Input
  const searchInput = document.getElementById("map-search-input");
  const clearBtn = document.getElementById("map-search-clear");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      evsFilterState.searchQuery = e.target.value.trim().toLowerCase();
      if (clearBtn) {
        clearBtn.classList.toggle("is-active", evsFilterState.searchQuery.length > 0);
      }
      renderMarkers();
      highlightFirstSearchResult();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = "";
        evsFilterState.searchQuery = "";
        clearBtn.classList.remove("is-active");
        renderMarkers();
      }
    });
  }

  // Locate Me Buttons (Header and FAB)
  const locateBtn = document.getElementById("locate-me-btn");
  const locateFab = document.getElementById("locate-me-fab");
  if (locateBtn) {
    locateBtn.addEventListener("click", () => requestUserLocation(true));
  }
  if (locateFab) {
    locateFab.addEventListener("click", () => requestUserLocation(true));
  }

  // Report Incident Trigger Buttons
  const headerReportBtn = document.getElementById("header-report-btn");
  const fabReportBtn = document.getElementById("fab-report-btn");
  if (headerReportBtn) {
    headerReportBtn.addEventListener("click", () => openReportModal());
  }
  if (fabReportBtn) {
    fabReportBtn.addEventListener("click", () => openReportModal());
  }

  // Reset Zoom FAB
  const resetZoomFab = document.getElementById("reset-zoom-fab");
  if (resetZoomFab) {
    resetZoomFab.addEventListener("click", () => {
      evsMap.flyTo(EVS_CENTER, EVS_DEFAULT_ZOOM, { duration: 1.2 });
      showToast("Reset map view to default");
    });
  }
}

/** Request user location with prominent GPS animation */
function requestUserLocation(shouldFlyTo = false) {
  if (!navigator.geolocation) {
    if (shouldFlyTo) showToast("Geolocation is not supported by your browser.");
    return;
  }

  const locateBtn = document.getElementById("locate-me-btn");
  const locateFab = document.getElementById("locate-me-fab");
  if (locateBtn) locateBtn.classList.add("is-active");
  if (locateFab) locateFab.classList.add("is-active");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy || 40;
      userCoordinates = [lat, lng];

      plotUserLocation(lat, lng, accuracy);

      if (shouldFlyTo) {
        evsMap.flyTo([lat, lng], 15, { duration: 1.5 });
        showToast("Centered on your current location");
      }
    },
    (err) => {
      console.warn("Geolocation permission or error:", err.message);
      // Fallback: Place user pointer near Bangalore center for demonstration if denied
      if (!userCoordinates) {
        userCoordinates = [12.973, 77.603];
        plotUserLocation(userCoordinates[0], userCoordinates[1], 80);
      }
      if (shouldFlyTo) {
        evsMap.flyTo(userCoordinates, 14, { duration: 1.2 });
        showToast("Centered on demo user position");
      }
      if (locateBtn) locateBtn.classList.remove("is-active");
      if (locateFab) locateFab.classList.remove("is-active");
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

/** Plot the prominent pulsating User Pointer on the map */
function plotUserLocation(lat, lng, accuracy) {
  evsUserLocationLayer.clearLayers();

  // 1. Accuracy Circle
  userAccuracyCircle = L.circle([lat, lng], {
    radius: Math.max(accuracy, 30),
    color: "#0284c7",
    weight: 1.5,
    opacity: 0.6,
    fillColor: "#38bdf8",
    fillOpacity: 0.12,
    dashArray: "4, 6",
  }).addTo(evsUserLocationLayer);

  // 2. High-Visibility Pulsing Marker Icon
  const userIcon = L.divIcon({
    className: "evs-user-marker",
    html: buildUserMarkerHTML(),
    iconSize: [54, 54],
    iconAnchor: [27, 27],
  });

  userMarker = L.marker([lat, lng], {
    icon: userIcon,
    zIndexOffset: 10000,
  }).addTo(evsUserLocationLayer);

  // Bind Glassmorphic User Popup
  const userPopupHTML = `
    <div class="popup-glass">
      <div class="popup-glass__header">
        <div class="popup-glass__icon-badge" style="background:var(--gradient-water);">
          <span style="font-size:1.2rem;">📍</span>
        </div>
        <div class="popup-glass__title-wrap">
          <div class="popup-glass__title">You Are Here</div>
          <span class="badge badge-water">Current Location</span>
        </div>
      </div>
      <p class="popup-glass__location">
        GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)} (±${Math.round(accuracy)}m)
      </p>
      <div class="popup-glass__actions">
        <button class="btn btn-primary popup-glass__btn" onclick="openReportModal({lat: ${lat}, lng: ${lng}})">
          📝 Report Incident Here
        </button>
      </div>
    </div>
  `;

  userMarker.bindPopup(userPopupHTML);
}

/**
 * Clears and redraws all pins on the map based on active filters and search.
 */
function renderMarkers() {
  evsMarkersLayer.clearLayers();
  markerRegistry.clear();

  const visibleReports = evsAllReports.filter(isReportVisible);

  visibleReports.forEach((report, index) => {
    const marker = buildMarkerForReport(report);
    if (!marker) return;

    markerRegistry.set(report.id, marker);

    // Subtle stagger
    setTimeout(() => {
      marker.addTo(evsMarkersLayer);
    }, Math.min(index * 20, 350));
  });

  updateEmptyState(visibleReports.length === 0 && evsAllReports.length > 0);
  updateStatsChip();
}

/** Determines if report passes all filter criteria */
function isReportVisible(report) {
  if (!evsFilterState[report.category]) return false;
  if (evsFilterState.hiddenSubtypes.has(report.subtype)) return false;

  if (evsFilterState.searchQuery) {
    const q = evsFilterState.searchQuery;
    const matchLoc = (report.locationName || "").toLowerCase().includes(q);
    const matchNote = (report.note || "").toLowerCase().includes(q);
    const matchSubtype = getSubtypeLabel(report.subtype).toLowerCase().includes(q);
    if (!matchLoc && !matchNote && !matchSubtype) return false;
  }

  return true;
}

/** Builds a Leaflet marker with custom subtype icon & popup */
function buildMarkerForReport(report) {
  if (typeof report.lat !== "number" || typeof report.lng !== "number") return null;

  const color = getReportColor(report);
  const svgHTML = buildPinSVG(report, color);

  const icon = L.divIcon({
    className: "evs-pin-container",
    html: svgHTML,
    iconSize: [40, 50],
    iconAnchor: [20, 48],
    popupAnchor: [0, -42],
  });

  const marker = L.marker([report.lat, report.lng], { icon });
  marker.bindPopup(buildPopupHTML(report));
  return marker;
}

/** Builds rich glassmorphic popup HTML */
function buildPopupHTML(report) {
  const color = getReportColor(report);
  const categoryLabel = getCategoryLabel(report.category);
  const subtypeLabel = getSubtypeLabel(report.subtype);
  const subtypeIcon = getSubtypeIcon(report.subtype);
  const relativeDate = timeAgo(report.timestamp);
  const fullDate = formatFullDate(report.timestamp);
  const isAlert = EVS_ALERT_SUBTYPES.has(report.subtype);
  const noteText = report.note && report.note.trim() ? escapeHTML(report.note) : "No specific notes provided.";
  const location = report.locationName ? escapeHTML(report.locationName) : "Bangalore Coordinates";

  const badgeClass = isAlert ? "badge-alert" : report.category === "tree" ? "badge-tree" : "badge-water";

  const photoHTML = report.photo
    ? `<img src="${report.photo}" class="popup-glass__photo" alt="Incident Photo" onclick="window.open('${report.photo}', '_blank')" title="Click to view full image"/>`
    : "";

  return `
    <div class="popup-glass">
      <div class="popup-glass__header">
        <div class="popup-glass__icon-badge" style="background:${color}22; border:1px solid ${color}55; color:${color}">
          <span style="font-size:1.2rem;">${subtypeIcon}</span>
        </div>
        <div class="popup-glass__title-wrap">
          <div class="popup-glass__title">${subtypeLabel}</div>
          <span class="badge ${badgeClass}">${categoryLabel}</span>
        </div>
      </div>

      <div class="popup-glass__location">
        <span>📍</span> <strong>${location}</strong>
      </div>

      ${photoHTML}

      <div class="popup-glass__note">"${noteText}"</div>

      <div class="popup-glass__meta">
        <span title="${fullDate}">🕒 ${relativeDate}</span>
        <span>${report.lat.toFixed(4)}, ${report.lng.toFixed(4)}</span>
      </div>

      <div class="popup-glass__actions">
        <button class="btn btn-secondary popup-glass__btn" onclick="copyCoordinates(${report.lat}, ${report.lng})">
          📋 Copy Coordinates
        </button>
      </div>
    </div>
  `;
}

/** Copy coordinates helper */
function copyCoordinates(lat, lng) {
  const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  navigator.clipboard.writeText(text).then(() => {
    showToast(`Copied GPS: ${text}`);
  }).catch(() => {
    showToast(`GPS: ${text}`);
  });
}

/** Highlight first search result and pan map to it */
function highlightFirstSearchResult() {
  if (!evsFilterState.searchQuery) return;
  const visible = evsAllReports.filter(isReportVisible);
  if (visible.length > 0) {
    const first = visible[0];
    const marker = markerRegistry.get(first.id);
    if (marker) {
      evsMap.flyTo([first.lat, first.lng], 14, { duration: 1.0 });
      marker.openPopup();
    }
  }
}

/**
 * Renders the floating Glassmorphic Legend & Filter panel.
 */
function renderLegend() {
  const panel = document.getElementById("legend-panel");
  if (!panel) return;

  const subtypeCounts = {};
  evsAllReports.forEach((r) => {
    subtypeCounts[r.subtype] = (subtypeCounts[r.subtype] || 0) + 1;
  });

  const subtypeItemsHTML = Object.keys(EVS_SUBTYPE_LABELS)
    .map((subtype) => {
      const count = subtypeCounts[subtype] || 0;
      const checked = !evsFilterState.hiddenSubtypes.has(subtype);
      const icon = getSubtypeIcon(subtype);
      const color = getReportColor({ subtype, category: subtype === "planted" || subtype === "cut" ? "tree" : "water" });

      return `
        <div class="subtype-chip">
          <label>
            <input type="checkbox" data-subtype="${subtype}" class="evs-subtype-checkbox" ${checked ? "checked" : ""} />
            <span class="subtype-icon-badge" style="background:${color}25; color:${color}; border:1px solid ${color}40;">
              ${icon}
            </span>
            <span>${getSubtypeLabel(subtype)}</span>
          </label>
          <span class="subtype-count">${count}</span>
        </div>
      `;
    })
    .join("");

  panel.innerHTML = `
    <div class="legend-panel__header">
      <h3 class="legend-panel__title">
        <span>🛡️</span> Vigilance Filters
      </h3>
      <div class="legend-header-actions">
        <button id="filter-all-btn" class="legend-filter-quick" title="Show all types">All</button>
        <button id="filter-none-btn" class="legend-filter-quick" title="Hide all types">None</button>
        <button id="legend-close-btn" class="legend-close-icon" title="Hide legend panel">✕</button>
      </div>
    </div>

    <!-- Category Toggles -->
    <div class="legend-group">
      <div class="legend-group-title">Domains</div>
      <div class="legend-toggle-row">
        <label for="toggle-tree">
          <span class="brand-dot tree"></span> Forestry &amp; Trees
        </label>
        <span class="switch">
          <input type="checkbox" id="toggle-tree" ${evsFilterState.tree ? "checked" : ""} />
          <span class="switch-track"></span>
        </span>
      </div>
      <div class="legend-toggle-row">
        <label for="toggle-water">
          <span class="brand-dot water"></span> Lakes &amp; Water
        </label>
        <span class="switch water">
          <input type="checkbox" id="toggle-water" ${evsFilterState.water ? "checked" : ""} />
          <span class="switch-track"></span>
        </span>
      </div>
    </div>

    <!-- Subtypes List -->
    <div class="legend-group">
      <div class="legend-group-title">Incident Classifications</div>
      <div class="subtype-list">
        ${subtypeItemsHTML}
      </div>
    </div>

    <!-- Utility buttons -->
    <div class="legend-utils">
      <div style="display:flex;gap:6px;">
        <button id="export-json-btn" class="btn btn-glass" style="flex:1;font-size:var(--fs-xs);padding:8px;" type="button">
          📥 Export JSON
        </button>
        <button id="export-csv-btn" class="btn btn-glass" style="flex:1;font-size:var(--fs-xs);padding:8px;" type="button">
          📊 Export CSV
        </button>
      </div>
      <button id="reset-sample-btn" class="btn btn-danger-glass" style="font-size:var(--fs-xs);padding:8px;width:100%;margin-top:4px;" type="button">
        🔄 Reset Sample Data
      </button>
    </div>
  `;

  wireLegendEvents();
}

/** Attaches change listeners for legend toggles and action buttons */
function wireLegendEvents() {
  const panel = document.getElementById("legend-panel");
  const legendToggleBtn = document.getElementById("legend-toggle-fab");
  const legendCloseBtn = document.getElementById("legend-close-btn");

  // Collapse / Expand Legend Panel
  if (legendCloseBtn && panel) {
    legendCloseBtn.addEventListener("click", () => {
      panel.classList.add("is-collapsed");
      if (legendToggleBtn) legendToggleBtn.classList.add("is-visible");
    });
  }

  if (legendToggleBtn && panel) {
    legendToggleBtn.addEventListener("click", () => {
      panel.classList.remove("is-collapsed");
      legendToggleBtn.classList.remove("is-visible");
    });
  }

  // Categories
  const treeToggle = document.getElementById("toggle-tree");
  const waterToggle = document.getElementById("toggle-water");

  if (treeToggle) {
    treeToggle.addEventListener("change", (e) => {
      evsFilterState.tree = e.target.checked;
      renderMarkers();
    });
  }
  if (waterToggle) {
    waterToggle.addEventListener("change", (e) => {
      evsFilterState.water = e.target.checked;
      renderMarkers();
    });
  }

  // Subtype checkboxes
  document.querySelectorAll(".evs-subtype-checkbox").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const subtype = e.target.getAttribute("data-subtype");
      if (e.target.checked) {
        evsFilterState.hiddenSubtypes.delete(subtype);
      } else {
        evsFilterState.hiddenSubtypes.add(subtype);
      }
      renderMarkers();
    });
  });

  // Filter All / None
  const allBtn = document.getElementById("filter-all-btn");
  const noneBtn = document.getElementById("filter-none-btn");

  if (allBtn) {
    allBtn.addEventListener("click", () => {
      evsFilterState.tree = true;
      evsFilterState.water = true;
      evsFilterState.hiddenSubtypes.clear();
      renderLegend();
      renderMarkers();
      showToast("Showing all reports");
    });
  }

  if (noneBtn) {
    noneBtn.addEventListener("click", () => {
      Object.keys(EVS_SUBTYPE_LABELS).forEach((sub) => evsFilterState.hiddenSubtypes.add(sub));
      renderLegend();
      renderMarkers();
      showToast("Hidden all classifications");
    });
  }

  // Export JSON & CSV
  const jsonBtn = document.getElementById("export-json-btn");
  const csvBtn = document.getElementById("export-csv-btn");

  if (jsonBtn) {
    jsonBtn.addEventListener("click", () => {
      exportReportsJSON(evsAllReports);
      showToast("Exported reports to JSON");
    });
  }
  if (csvBtn) {
    csvBtn.addEventListener("click", () => {
      exportReportsCSV(evsAllReports);
      showToast("Exported reports to CSV");
    });
  }

  // Reset Sample Data
  const resetBtn = document.getElementById("reset-sample-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      evsAllReports = resetToSampleData();
      evsFilterState.tree = true;
      evsFilterState.water = true;
      evsFilterState.hiddenSubtypes.clear();
      renderLegend();
      renderMarkers();
      showToast("Sample data restored.");
    });
  }
}

/** Update Live Stats Badge in Header */
function updateStatsChip() {
  const statsEl = document.getElementById("map-stats-summary");
  if (!statsEl) return;

  const stats = getReportStats();
  const visibleCount = evsAllReports.filter(isReportVisible).length;
  statsEl.innerHTML = `
    <span>Active: <strong>${visibleCount}</strong> / ${stats.total}</span>
    <span style="opacity:0.4;">|</span>
    <span style="color:#34d399;">🌲 ${stats.tree}</span>
    <span style="opacity:0.4;">|</span>
    <span style="color:#38bdf8;">💧 ${stats.water}</span>
    <span style="opacity:0.4;">|</span>
    <span style="color:#fb923c;">⚠️ ${stats.alerts}</span>
  `;
}

/** Shows/hides empty state overlay */
function updateEmptyState(forceFilteredEmpty = false) {
  const overlay = document.getElementById("empty-state");
  if (!overlay) return;

  const noReportsAtAll = evsAllReports.length === 0;
  const titleEl = overlay.querySelector(".empty-state__title");
  const bodyEl = overlay.querySelector(".empty-state__body");

  if (noReportsAtAll) {
    if (titleEl) titleEl.textContent = "No reports found";
    if (bodyEl) bodyEl.textContent = "No environmental reports have been logged yet. Be the first to report an incident!";
    overlay.classList.add("is-visible");
  } else if (forceFilteredEmpty) {
    if (titleEl) titleEl.textContent = "No matching incidents";
    if (bodyEl) bodyEl.textContent = "Try adjusting your filters, clearing search, or enabling categories in the legend.";
    overlay.classList.add("is-visible");
  } else {
    overlay.classList.remove("is-visible");
  }
}

/** Allows clicking directly on the map to pre-fill coordinates for a new report */
function wireMapClickEvent() {
  evsMap.on("contextmenu", (e) => {
    openReportModal({ lat: e.latlng.lat, lng: e.latlng.lng });
  });

  // Long press / click info
  evsMap.on("click", (e) => {
    // If click was directly on map (not marker)
    if (e.originalEvent && e.originalEvent.target && e.originalEvent.target.id === "map") {
      // Prompt quick report option
      const popup = L.popup()
        .setLatLng(e.latlng)
        .setContent(`
          <div style="padding:10px;text-align:center;">
            <div style="font-weight:700;margin-bottom:6px;font-size:13px;">Report an Incident here?</div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:8px;">${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}</div>
            <button class="btn btn-primary" style="padding:5px 12px;font-size:12px;" 
                    onclick="openReportModal({lat:${e.latlng.lat}, lng:${e.latlng.lng}}); evsMap.closePopup();">
              📝 Submit Report
            </button>
          </div>
        `)
        .openOn(evsMap);
    }
  });
}

/* ============================================================
   REPORT INCIDENT MODAL HANDLING
   ============================================================ */

let selectedCategory = "tree";
let selectedSubtype = "cut";
let attachedPhotoBase64 = null;

function wireReportModal() {
  const modal = document.getElementById("report-modal");
  const closeBtn = document.getElementById("report-modal-close");
  const form = document.getElementById("report-form");

  if (!modal || !form) return;

  if (closeBtn) {
    closeBtn.addEventListener("click", () => closeReportModal());
  }

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeReportModal();
  });

  // Category toggle buttons
  const catBtns = document.querySelectorAll(".cat-pill-btn");
  catBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      catBtns.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      selectedCategory = btn.getAttribute("data-category");
      renderSubtypePicker();
    });
  });

  renderSubtypePicker();

  // GPS auto-detect button in form
  const getGpsBtn = document.getElementById("modal-get-gps-btn");
  if (getGpsBtn) {
    getGpsBtn.addEventListener("click", () => {
      getGpsBtn.textContent = "Detecting...";
      if (userCoordinates) {
        document.getElementById("modal-lat").value = userCoordinates[0].toFixed(5);
        document.getElementById("modal-lng").value = userCoordinates[1].toFixed(5);
        getGpsBtn.textContent = "✓ Found";
        setTimeout(() => (getGpsBtn.textContent = "📍 Auto GPS"), 1500);
      } else {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            document.getElementById("modal-lat").value = pos.coords.latitude.toFixed(5);
            document.getElementById("modal-lng").value = pos.coords.longitude.toFixed(5);
            getGpsBtn.textContent = "✓ Found";
            setTimeout(() => (getGpsBtn.textContent = "📍 Auto GPS"), 1500);
          },
          () => {
            document.getElementById("modal-lat").value = EVS_CENTER[0].toFixed(5);
            document.getElementById("modal-lng").value = EVS_CENTER[1].toFixed(5);
            getGpsBtn.textContent = "City Center";
            setTimeout(() => (getGpsBtn.textContent = "📍 Auto GPS"), 1500);
          }
        );
      }
    });
  }

  // Photo file upload & preview
  const photoInput = document.getElementById("modal-photo-input");
  const photoDrop = document.getElementById("modal-photo-drop");
  const photoPreviewWrap = document.getElementById("modal-photo-preview-wrap");
  const photoPreviewImg = document.getElementById("modal-photo-preview");
  const removePhotoBtn = document.getElementById("modal-photo-remove");

  if (photoDrop && photoInput) {
    photoDrop.addEventListener("click", () => photoInput.click());

    photoInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          attachedPhotoBase64 = loadEvt.target.result;
          photoPreviewImg.src = attachedPhotoBase64;
          photoPreviewWrap.style.display = "block";
          photoDrop.style.display = "none";
        };
        reader.readAsDataURL(file);
      }
    });
  }

  if (removePhotoBtn) {
    removePhotoBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      attachedPhotoBase64 = null;
      photoInput.value = "";
      photoPreviewWrap.style.display = "none";
      photoDrop.style.display = "block";
    });
  }

  // Form submit
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const locationName = document.getElementById("modal-location-name").value.trim() || "Observed Area";
    const lat = parseFloat(document.getElementById("modal-lat").value);
    const lng = parseFloat(document.getElementById("modal-lng").value);
    const note = document.getElementById("modal-note").value.trim();

    if (isNaN(lat) || isNaN(lng)) {
      showToast("Please enter valid latitude and longitude.");
      return;
    }

    const newReport = {
      id: "evs-" + Date.now(),
      category: selectedCategory,
      subtype: selectedSubtype,
      locationName: locationName,
      lat: lat,
      lng: lng,
      timestamp: new Date().toISOString(),
      note: note,
      photo: attachedPhotoBase64,
    };

    const success = saveReport(newReport);
    if (success) {
      evsAllReports = getAllReports();
      renderMarkers();
      renderLegend();
      closeReportModal();
      showToast("Incident report submitted successfully! 🎉");

      // Fly to new marker and open popup
      setTimeout(() => {
        evsMap.flyTo([lat, lng], 15, { duration: 1.2 });
        setTimeout(() => {
          const marker = markerRegistry.get(newReport.id);
          if (marker) marker.openPopup();
        }, 1300);
      }, 400);
    } else {
      showToast("Failed to save report. Please check storage.");
    }
  });
}

/** Render subtype selector options for the chosen category */
function renderSubtypePicker() {
  const container = document.getElementById("modal-subtype-grid");
  if (!container) return;

  const validSubtypes =
    selectedCategory === "tree" ? ["cut", "planted"] : ["foam", "algae", "trash", "dead_fish", "odor"];

  if (!validSubtypes.includes(selectedSubtype)) {
    selectedSubtype = validSubtypes[0];
  }

  container.innerHTML = validSubtypes
    .map((st) => {
      const isActive = st === selectedSubtype;
      const icon = getSubtypeIcon(st);
      return `
        <button type="button" class="subtype-grid-btn ${isActive ? "is-active" : ""}" data-subtype="${st}">
          <span style="font-size:1.1rem;">${icon}</span>
          <span>${getSubtypeLabel(st)}</span>
        </button>
      `;
    })
    .join("");

  container.querySelectorAll(".subtype-grid-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".subtype-grid-btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      selectedSubtype = btn.getAttribute("data-subtype");
    });
  });
}

/** Open Report Modal with optional pre-filled coordinates */
function openReportModal(prefill = {}) {
  const modal = document.getElementById("report-modal");
  if (!modal) return;

  const latInput = document.getElementById("modal-lat");
  const lngInput = document.getElementById("modal-lng");

  if (prefill.lat && prefill.lng) {
    latInput.value = prefill.lat.toFixed(5);
    lngInput.value = prefill.lng.toFixed(5);
  } else if (!latInput.value) {
    if (userCoordinates) {
      latInput.value = userCoordinates[0].toFixed(5);
      lngInput.value = userCoordinates[1].toFixed(5);
    } else {
      latInput.value = EVS_CENTER[0].toFixed(5);
      lngInput.value = EVS_CENTER[1].toFixed(5);
    }
  }

  modal.classList.add("is-open");
}

function closeReportModal() {
  const modal = document.getElementById("report-modal");
  if (modal) modal.classList.remove("is-open");
}

/** Check URL parameters for direct link to a report or coordinates */
function checkURLParameters() {
  const params = new URLSearchParams(window.location.search);
  const repId = params.get("report");
  const lat = parseFloat(params.get("lat"));
  const lng = parseFloat(params.get("lng"));

  if (repId) {
    const report = evsAllReports.find((r) => r.id === repId);
    if (report) {
      setTimeout(() => {
        evsMap.flyTo([report.lat, report.lng], 15, { duration: 1.2 });
        const marker = markerRegistry.get(report.id);
        if (marker) marker.openPopup();
      }, 600);
    }
  } else if (!isNaN(lat) && !isNaN(lng)) {
    setTimeout(() => {
      evsMap.flyTo([lat, lng], 14, { duration: 1.2 });
    }, 600);
  }
}

/** Professional Toast notification */
function showToast(message) {
  let toast = document.getElementById("evs-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "evs-toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>⚡</span> <span>${message}</span>`;
  toast.classList.add("is-visible");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

document.addEventListener("DOMContentLoaded", initEvsMap);
