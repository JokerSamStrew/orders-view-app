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
- **Category legend** — click to toggle categories on/off; "Show All" restores everything
- **Auto-fit** — Generate and Reset buttons auto-scale the viewport to the data range

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
| **← → keys** | Pan 1 hour at a time |
| **+ / − keys** | Zoom in/out |
| **0 key** | Reset view |
| **Hover bar** | Show detail tooltip |
| **Mini-map click** | Jump to time range |
| **Legend click** | Toggle category visibility |

## Data generation

Click **Generate Data** (or regenerate) with configurable:

- **Count** — number of intervals (1–50,000)
- **Avg Duration** — average booking length in minutes (1–1440); actual duration varies 0.5×–2.0× around the average

8 color-coded categories: Confirmed, Pending, Cancelled, Checked-in, No-show, Rescheduled, VIP, Group.
