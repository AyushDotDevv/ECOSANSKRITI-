/* ============================================================
   utils.js — shared helpers, custom SVG icons, map marker
   builders, formatters, and export utilities for EVS.
   ============================================================ */

/**
 * Subtypes that always trigger amber/red alert styling for high visibility.
 */
const EVS_ALERT_SUBTYPES = new Set(["dead_fish", "trash", "cut", "foam"]);

const EVS_CATEGORY_LABELS = {
  tree: "Forestry & Greenery",
  water: "Water Bodies & Hydrology",
};

const EVS_SUBTYPE_LABELS = {
  cut: "Illegal Tree Felling",
  planted: "Community Tree Plantation",
  foam: "Toxic Lake Foam",
  algae: "Algae Bloom Mat",
  trash: "Waste & Plastic Dumping",
  dead_fish: "Aquatic Life Mortality",
  odor: "Severe Chemical / Sewage Odor",
};

const EVS_SUBTYPE_ICONS = {
  cut: "🪓",
  planted: "🌱",
  foam: "🫧",
  algae: "🌿",
  trash: "🗑️",
  dead_fish: "🐟",
  odor: "💨",
};

/**
 * Detailed SVG glyphs embedded inside marker pins for each subtype.
 */
const EVS_SUBTYPE_SVG_GLYPHS = {
  cut: `<path d="M12 4l-4 4 4 4M8 8h10M17 14l-3 6M11 17l6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`,
  planted: `<path d="M12 10a6 6 0 00-6-6H4v2a6 6 0 006 6M12 10a6 6 0 016-6h2v2a6 6 0 01-6 6M12 10v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  foam: `<circle cx="8" cy="14" r="3" stroke="currentColor" stroke-width="1.8"/><circle cx="15" cy="11" r="4" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="7" r="2.5" stroke="currentColor" stroke-width="1.8"/>`,
  algae: `<path d="M6 18c0-3 3-4 3-7s-2-4-2-7M12 18c0-4 4-5 4-9s-3-5-3-9M18 18c0-3-2-4-2-7s3-4 3-7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  trash: `<path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  dead_fish: `<path d="M4 12c4-5 12-5 16 0-4 5-12 5-16 0zM17 12l4-3v6l-4-3zM9 10l2 2M11 10l-2 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>`,
  odor: `<path d="M6 8c3-2 5-2 8 0s5 2 8 0M4 13c3-2 5-2 8 0s5 2 8 0M7 18c2.5-1.5 4-1.5 6.5 0s4 1.5 6.5 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
};

/**
 * Returns distinct themed colors for each report based on severity & category.
 */
function getReportColor(report) {
  if (report.subtype === "dead_fish") return "#ef4444"; // critical red
  if (report.subtype === "cut") return "#f97316";       // warning orange
  if (report.subtype === "trash") return "#f59e0b";     // amber
  if (report.subtype === "foam") return "#06b6d4";      // vibrant cyan
  if (report.subtype === "planted") return "#10b981";   // emerald green
  if (report.subtype === "algae") return "#14b8a6";     // teal
  if (report.subtype === "odor") return "#8b5cf6";      // purple
  
  return report.category === "tree" ? "#10b981" : "#0284c7";
}

function getCategoryLabel(category) {
  return EVS_CATEGORY_LABELS[category] || category;
}

function getSubtypeLabel(subtype) {
  return EVS_SUBTYPE_LABELS[subtype] || subtype;
}

function getSubtypeIcon(subtype) {
  return EVS_SUBTYPE_ICONS[subtype] || "📍";
}

/**
 * Formats relative time (e.g., "2 hours ago", "yesterday").
 */
function timeAgo(isoString) {
  const then = new Date(isoString);
  if (isNaN(then.getTime())) return "recently";

  const now = new Date();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 30) return `${diffDay} days ago`;

  return then.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatFullDate(isoString) {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Builds the professional SVG marker pin with high-end glass glow,
 * specular highlight, and embedded subtype glyph.
 */
function buildPinSVG(report, color) {
  const isAlert = EVS_ALERT_SUBTYPES.has(report.subtype);
  const glyph = EVS_SUBTYPE_SVG_GLYPHS[report.subtype] || `<circle cx="12" cy="12" r="3" fill="currentColor"/>`;
  const pulseClass = isAlert ? "evs-pin-alert-pulse" : "";

  return `
    <div class="evs-pin-marker ${pulseClass}">
      <svg class="evs-pin-svg" viewBox="0 0 38 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="grad-${report.id}" cx="50%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.4"/>
            <stop offset="60%" stop-color="${color}" stop-opacity="0.95"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="1"/>
          </radialGradient>
          <filter id="shadow-${report.id}" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.5"/>
          </filter>
        </defs>

        <!-- Teardrop Pin Body -->
        <path d="M19 47C19 47 4 33.5 4 19C4 10.7157 10.7157 4 19 4C27.2843 4 34 10.7157 34 19C34 33.5 19 47 19 47Z" 
              fill="url(#grad-${report.id})" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
        
        <!-- Inner Frosted Icon Medallion -->
        <circle cx="19" cy="19" r="10.5" fill="rgba(15, 23, 42, 0.85)" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>
        
        <!-- Icon Glyph Container -->
        <g transform="translate(7, 7) scale(1)" color="${color}">
          ${glyph}
        </g>
      </svg>
    </div>
  `;
}

/**
 * Builds the prominent pulsating User GPS Pointer HTML with concentric radar rings.
 */
function buildUserMarkerHTML() {
  return `
    <div class="user-gps-container" title="Your Current Location">
      <div class="user-gps-ring"></div>
      <div class="user-gps-ring"></div>
      <div class="user-gps-ring"></div>
      <div class="user-gps-heading"></div>
      <div class="user-gps-core"></div>
    </div>
  `;
}

/**
 * Minimal HTML-escaping so free-text cannot break formatting.
 */
function escapeHTML(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Export reports as JSON file download.
 */
function exportReportsJSON(reports) {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reports, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `evs-reports-${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Export reports as CSV file download.
 */
function exportReportsCSV(reports) {
  if (!reports || !reports.length) return;
  const headers = ["ID", "Category", "Subtype", "Location Name", "Latitude", "Longitude", "Timestamp", "Note"];
  const rows = reports.map((r) => [
    r.id,
    r.category,
    r.subtype,
    `"${(r.locationName || "").replace(/"/g, '""')}"`,
    r.lat,
    r.lng,
    r.timestamp,
    `"${(r.note || "").replace(/"/g, '""')}"`,
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `evs-reports-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
