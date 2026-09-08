# Booking Timeline Viewer

A single-page canvas-based application for visualizing and exploring booking time intervals. Renders thousands of intervals smoothly with instant hover tooltips, zoom, and pan.

## Features

- **Canvas rendering** — draws only visible bars; handles 50,000+ intervals at 60fps
- **Interval Tree** — O(log n) hover lookup for instant tooltips
- **Row packing** — greedy algorithm assigns non-overlapping rows to avoid bar collisions
- **Virtualization** — only renders visible rows, skipping off-screen items
- **Mini-map** — overview bar at the bottom; click to navigate to any time range
- **Zoom & pan** — mouse wheel zoom (4h–90d), click-drag to pan, keyboard shortcuts
- **Search** — filter by name, customer, or category (debounced)
- **Dynamic category legend** — categories and their colors are derived from your data; click a legend item to toggle that category on/off
- **JSON import / export** — load arbitrary JSON files, save your current view
- **Interval detail popup** — click any bar to open a detailed modal with all fields (including `metadata`)
- **Auto-fit** — Generate, Load Example, and Reset buttons auto-scale the viewport to the data range

## Tech

- Zero dependencies. Pure HTML + CSS + vanilla JS
- HTML5 Canvas for rendering (not DOM elements)
- Custom Interval Tree for fast hover queries
- Responsive, dark theme

## Getting started

Start the server:

```bash
uv run python -m http.server 8080
```

Open http://localhost:8080.

## Controls

| Control | Action |
|---|---|
| **Scroll wheel** | Zoom in/out (anchored to cursor) |
| **Click + drag** | Pan horizontally |
| **Click bar** | Open detail popup (modal) |
| **← → keys** | Pan 1 hour at a time |
| **+ / − keys** | Zoom in/out |
| **0 key** | Reset view |
| **Esc** | Close popup |
| **Hover bar** | Show tooltip |
| **Mini-map click** | Jump to time range |
| **Legend click** | Toggle category visibility |

## Data formats

### Import JSON

Click **Import** to load a `.json` file. Each interval must have at least `start` and `end`. Supported value types:

- `start` / `end` — ISO 8601 strings (`"2025-09-01T09:00:00Z"`), millisecond epoch numbers, or Date objects
- `duration` — optional (minutes); auto-computed from `end − start` if omitted
- `category` — optional (string); if present, a deterministic color is assigned. If omitted, bars render grey.
- `name`, `customer`, `id`, `metadata` — optional free-form fields preserved through import/export

Top-level JSON can be an array `[ {...}, ... ]` or an object with an `intervals` key `{ "intervals": [...] }`.

### Export JSON

Click **Export** to download the current data as `bookings.json` (ISO timestamps, all fields preserved).

### Load Example

Click **Load Example** to load `data/example.json` — 20 sample bookings across all 8 default categories.

### Data generation

Click **Generate Data** with configurable:

- **Count** — number of intervals (1–50,000; default: 100)
- **Avg Duration** — average booking length in minutes (1–1440; default: 500); actual duration varies 0.5×–2.0× around the average

Generated data uses 8 categories: Confirmed, Pending, Cancelled, Checked-in, No-show, Rescheduled, VIP, Group.

## Source tracking

The stats bar shows a source tag indicating how data was loaded:

- `[generated]` — from "Generate Data"
- `[filename.json]` — from "Import"
- `[example.json]` — from "Load Example"
- `[cleared]` — after "Clear"

No tag means data was loaded on initial page load (empty by default).