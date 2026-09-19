# EVS Prototype — Phase 2: Map View

A live, color-coded map of every submitted environmental report (tree cutting/planting, water pollution), built with plain HTML/CSS/JS and Leaflet.js. No backend, no build step.

## Project structure

evs-phase2-map/
├── index.html              # Home screen: links to map + report flow
├── map.html                # The Map View page
├── css/
│   ├── theme.css           # Shared design tokens (colors, spacing, typography)
│   └── map.css             # Map-page-specific styles
├── js/
│   ├── storage.js          # localStorage read/write/seed helpers for reports
│   ├── sample-data.js      # 18 sample reports across real Bangalore locations
│   ├── map.js              # Map init, pin rendering, popups, legend, filters
│   └── utils.js            # Shared helpers (date formatting, color/icon lookup)
├── assets/
│   └── icons/              # Standalone leaf/droplet SVG reference icons
└── README.md

## Running it locally

You need a local static server — opening index.html directly via file:// will break Leaflet's tile loading in some browsers, so use one of:

**Option A — VS Code Live Server**
1. Open the evs-phase2-map folder in VS Code.
2. Install the "Live Server" extension if you don't have it.
3. Right-click index.html → **Open with Live Server**.
4. It'll open at something like http://127.0.0.1:5500/index.html.

**Option B — Python's built-in server**
cd evs-phase2-map
python3 -m http.server 8000
Then visit http://localhost:8000 in your browser.

## How the data works

- All report data lives under a single localStorage key: evs_reports.
- storage.js is the only file that should touch that key directly. It exposes:
  - getAllReports() — returns the current list, seeding it from sample-data.js the very first time (empty storage).
  - saveReport(report) — appends one new report and persists it.
  - saveAllReports(reports) — overwrites the whole list (bulk writes).
  - resetToSampleData() — wipes storage and re-seeds from sample-data.js.
- Because everything goes through storage.js, the map, a future timeline view, and the Phase 1 report form can all read/write the same key consistently without stepping on each other.
- **Reset sample data button**: on map.html, inside the legend panel. It's dev-only — wired to resetToSampleData() in storage.js and called from map.js. Delete the button markup in map.js's renderLegend() and the #reset-sample-btn wiring before a real launch.

## Design notes

- Colors, spacing, and typography are centralized as CSS custom properties in css/theme.css so any future page (timeline, calculator) can reuse them.
- Pins are custom inline SVGs (leaf for tree reports, droplet for water reports), colored by category — except "alert" subtypes (cut, trash, dead_fish), which always render in the amber/terracotta accent color regardless of category, so severity stands out at a glance.
- On screens narrower than 720px, the legend/filter panel becomes a bottom sheet instead of a floating card.

## Running strictly on localhost
 
- No API keys, accounts, or cloud tokens are needed.
- Map tiles are loaded directly from the public OpenStreetMap server (`tile.openstreetmap.org`).
- Data is read from a local static file (`reports.json`) sitting next to `map.html`.
- Run using `python -m http.server 8000 --bind 127.0.0.1` or VS Code Live Server.