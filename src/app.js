/* ═══════════════════════════════════════════════════════════
   Booking Timeline Viewer — Single-Page Canvas Application
   ═══════════════════════════════════════════════════════════ */

// ═══════════════════════════════════════════════════════════
// Global Constants — all "magic numbers" centralized here
// ═══════════════════════════════════════════════════════════

// Time constants (milliseconds)
const MS_PER_SECOND  = 1_000;
const MS_PER_MINUTE  = 60 * MS_PER_SECOND;       // 60,000 ms
const MS_PER_HOUR    = 60 * MS_PER_MINUTE;       // 3,600,000 ms
const MS_PER_DAY     = 24 * MS_PER_HOUR;         // 86,400,000 ms

// Viewport defaults
const DEFAULT_VIEW_DAYS   = 30;                    // 30 days default viewport span
const DEFAULT_VIEW_MS     = DEFAULT_VIEW_DAYS * MS_PER_DAY;

// Zoom bounds (milliseconds)
const MIN_ZOOM_MS   = 4 * MS_PER_HOUR;            // 4 hours minimum zoom range
const MAX_ZOOM_MS   = 90 * MS_PER_DAY;            // 90 days maximum zoom range

// Layout constants (pixels)
const ROW_HEIGHT          = 48;                    // Height of each booking row
const GAP                 = 4;                     // Vertical gap between rows
const BAR_RADIUS          = 4;                     // Border radius for booking bars
const PADDING_LEFT        = 0;                     // Left padding for bar labels
const PADDING_TOP         = 40;                    // Top padding (header space)
const TICK_HEIGHT         = 30;                    // Height of time axis labels area
const MINI_MAP_HEIGHT     = 60;                    // Height of the mini-map overview

// Data generation defaults
const DEFAULT_COUNT       = 5000;                   // Default number of sample intervals
const MAX_COUNT           = 50_000;                 // Maximum allowed sample intervals
const DEFAULT_DURATION    = 60;                     // Default average booking duration (minutes)

// Interaction constants
const PAN_STEP_MS         = 1 * MS_PER_HOUR;        // Keyboard pan step (1 hour)
const ZOOM_FACTOR_IN      = 0.75;                   // Zoom-in multiplier (factor passed to zoomBy)
const ZOOM_FACTOR_OUT     = 1.33;                   // Zoom-out multiplier (factor passed to zoomBy)
const WHEEL_ZOOM_FACTOR   = 1.15;                   // Mouse wheel zoom factor per delta
const AUTO_FIT_PADDING_PCT = 0.05;                  // 5% padding around auto-fit viewport
const TOOLTIP_MARGIN_PX   = 10;                     // Minimum pixel margin for tooltip from edges
const TOOLTIP_OFFSET_PX   = 14;                     // Horizontal offset for tooltip from cursor
const INITIAL_SAMPLE_COUNT = 3000;                  // Number of intervals on initial load
const LABEL_MIN_WIDTH_PX  = 50;                     // Minimum bar width to show text label
const LABEL_NAME_MAX_LEN  = 28;                     // Max characters before truncating name
const LABEL_NAME_TRUNCATE = 26;                     // Characters to keep when truncating
const HOVER_LINE_WIDTH    = 1.5;                    // Stroke width for hovered bar highlight
const DEFAULT_PADDING_MS  = 1000;                   // Default padding when no data (ms)

// Search & debounce
const SEARCH_DEBOUNCE_MS  = 150;                    // Debounce delay for search input (ms)

// ── Category palette ──────────────────────────────────────
const CATEGORIES = [
    { name: 'Confirmed', color: '#6c63ff' },
    { name: 'Pending', color: '#f59e42' },
    { name: 'Cancelled', color: '#ef4444' },
    { name: 'Checked-in', color: '#00c9a7' },
    { name: 'No-show', color: '#8b5cf6' },
    { name: 'Rescheduled', color: '#06b6d4' },
    { name: 'VIP', color: '#f472b6' },
    { name: 'Group', color: '#a3e635' },
];

// ── Interval Tree (O(log n) hover lookup) ─────────────────
class IntervalNode {
    constructor(start, end, data) {
        this.start = start;
        this.end = end;
        this.data = data;
        this.left = null;
        this.right = null;
        this.max = end;
    }
}

class IntervalTree {
    constructor() {
        this.root = null;
        this.count = 0;
    }

    insert(start, end, data) {
        this.root = this._insert(this.root, start, end, data);
        this.count++;
    }

    _insert(node, start, end, data) {
        if (!node) return new IntervalNode(start, end, data);
        if (start < node.start) {
            node.left = this._insert(node.left, start, end, data);
        } else {
            node.right = this._insert(node.right, start, end, data);
        }
        node.max = Math.max(node.max, end);
        return node;
    }

    // Find all intervals that overlap a query point (x)
    query(x, results = []) {
        this._query(this.root, x, results);
        return results;
    }

    _query(node, x, results) {
        if (!node || x < node.start) return;
        if (x <= node.max) {
            this._query(node.left, x, results);
            if (x >= node.start && x <= node.end) {
                results.push(node.data);
            }
            this._query(node.right, x, results);
        }
    }
}

// ── Sample data generator ─────────────────────────────────
function generateSampleData(count = 5000, avgDurationMin = 60) {
    const now = Date.now();
    const range = DEFAULT_VIEW_DAYS * MS_PER_DAY;
    const avgDurationMs = avgDurationMin * MS_PER_MINUTE;
    const names = [
        'Alice Johnson',
        'Bob Smith',
        'Carol White',
        'Dan Brown',
        'Eva Martinez',
        'Frank Lee',
        'Grace Kim',
        'Hank Wilson',
        'Ivy Chen',
        'Jack Davis',
        'Karen Moore',
        'Leo Taylor',
        'Mia Anderson',
        'Nate Thomas',
        'Olivia Jackson',
        'Paul Harris',
    ];
    const categories = CATEGORIES.map((c) => c.name);
    const services = [
        'Haircut',
        'Massage',
        'Consultation',
        'Manicure',
        'Facial',
        'Dental Checkup',
        'Yoga Session',
        'Tennis Court',
        'Meeting Room',
        'Photography',
        'Cooking Class',
        'Guitar Lesson',
    ];

    const data = [];
    for (let i = 0; i < count; i++) {
        const start = now + Math.random() * range;
        // Duration varies 0.5x to 2.0x around the average
        const duration = avgDurationMs * (0.5 + Math.random() * 1.5);
        const cat = categories[Math.floor(Math.random() * categories.length)];
        const svc = services[Math.floor(Math.random() * services.length)];
        const name = names[Math.floor(Math.random() * names.length)];
        data.push({
            id: i,
            name: `${name} — ${svc}`,
            customer: name,
            category: cat,
            start,
            end: start + duration,
            duration: Math.round(duration / MS_PER_MINUTE),
        });
    }
    return data;
}

// ── Application ───────────────────────────────────────────
const App = (() => {
    // DOM refs
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const tooltip = document.getElementById('tooltip');
    const statsEl = document.getElementById('stats');
    const legendEl = document.getElementById('legend');
    const searchInput = document.getElementById('search');
    const btnGenerate = document.getElementById('btn-generate');
    const btnClear = document.getElementById('btn-clear');
    const btnZoomIn = document.getElementById('zoom-in');
    const btnZoomOut = document.getElementById('zoom-out');
    const btnZoomReset = document.getElementById('zoom-reset');
    const zoomLevelEl = document.getElementById('zoom-level');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const miniMapCanvas = document.getElementById('minimap');
    const miniMapCtx = miniMapCanvas ? miniMapCanvas.getContext('2d') : null;
    const countInput = document.getElementById('count-input');
    const durationInput = document.getElementById('duration-input');

    // State
    let intervals = [];
    let tree = new IntervalTree();
    let visibleCategories = new Set(CATEGORIES.map((c) => c.name));
    let searchTerm = '';
    let hoveredInterval = null;
    let hoveredId = -1;

    // Viewport (in timeline-ms coordinates)
    let viewStart = 0;
    let viewEnd = DEFAULT_VIEW_MS;
    const MIN_ZOOM = MIN_ZOOM_MS;
    const MAX_ZOOM = MAX_ZOOM_MS;

    // Layout constants (px) — re-exported from module-scope constants
    // ROW_HEIGHT, GAP, BAR_RADIUS, PADDING_LEFT, PADDING_TOP,
    // TICK_HEIGHT, MINI_MAP_HEIGHT are all defined above

    // ── Resize ────────────────────────────────────────────
    function resize() {
        const dpr = window.devicePixelRatio || 1;
        const w = canvasWrapper.clientWidth;
        const h = canvasWrapper.clientHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Mini-map
        if (miniMapCanvas) {
            const mmW = canvasWrapper.clientWidth;
            miniMapCanvas.width = mmW * dpr;
            miniMapCanvas.height = MINI_MAP_HEIGHT * dpr;
            miniMapCanvas.style.width = mmW + 'px';
            miniMapCanvas.style.height = MINI_MAP_HEIGHT + 'px';
            miniMapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        render();
        renderMiniMap();
    }

    // ── Filtered + sorted intervals (with virtualization hints) ──
    function getFiltered() {
        let filtered = intervals.filter((d) => {
            if (searchTerm) {
                const q = searchTerm.toLowerCase();
                if (
                    !d.name.toLowerCase().includes(q) &&
                    !d.customer.toLowerCase().includes(q) &&
                    !d.category.toLowerCase().includes(q)
                )
                    return false;
            }
            if (!visibleCategories.has(d.category)) return false;
            return true;
        });

        filtered.sort((a, b) => a.start - b.start);
        assignRows(filtered);
        return filtered;
    }

    // ── Row assignment (optimized with early termination) ──
    let rowEnds = [];

    function assignRows(items) {
        rowEnds.length = 0;
        for (const item of items) {
            let placed = false;
            for (let r = 0; r < rowEnds.length; r++) {
                if (rowEnds[r] <= item.start) {
                    item._row = r;
                    rowEnds[r] = item.end;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                item._row = rowEnds.length;
                rowEnds.push(item.end);
            }
        }
    }

    // ── Render main canvas ──────────────────────────────────
    function render() {
        const w = canvasWrapper.clientWidth;
        const h = canvasWrapper.clientHeight;

        ctx.clearRect(0, 0, w, h);

        const filtered = getFiltered();

        // Update stats
        statsEl.textContent = `${filtered.length} / ${intervals.length} intervals`;

        const range = viewEnd - viewStart;
        const pxPerMs = w / range;

        // ── Draw background (day bands) ──────────────────────
        drawDayBands(viewStart, viewEnd, pxPerMs, w, h);

        // ── Draw grid (time ticks) ───────────────────────────
        drawTimeTicks(viewStart, viewEnd, pxPerMs, w, h);

        // ── Virtualization: only render visible rows ──────────
        const firstVisibleRow = Math.max(
            0,
            Math.floor((PADDING_TOP - PADDING_TOP) / (ROW_HEIGHT + GAP))
        );
        const lastVisibleRow = Math.ceil(
            (h - PADDING_TOP) / (ROW_HEIGHT + GAP)
        );

        // Build a row-indexed map for O(1) row lookup
        const rowMap = new Map();
        for (const d of filtered) {
            if (d._row >= firstVisibleRow && d._row <= lastVisibleRow) {
                if (!rowMap.has(d._row)) rowMap.set(d._row, []);
                rowMap.get(d._row).push(d);
            }
        }

        // Draw bars (only visible rows)
        for (const [row, items] of rowMap) {
            const y = PADDING_TOP + row * (ROW_HEIGHT + GAP);
            for (const d of items) {
                // Skip if outside horizontal viewport
                if (d.end < viewStart || d.start > viewEnd) continue;

                const x1 = (d.start - viewStart) * pxPerMs;
                const x2 = (d.end - viewStart) * pxPerMs;
                const barW = Math.max(x2 - x1, 2);

                if (x2 < 0 || x1 > w) continue;

                const catObj = CATEGORIES.find((c) => c.name === d.category);
                const color = catObj ? catObj.color : '#888';
                const isHovered = d.id === hoveredId;

                // Bar fill
                ctx.fillStyle = isHovered ? color : color + 'aa';
                ctx.globalAlpha = isHovered ? 1 : 0.75;
                roundRect(ctx, x1, y, barW, ROW_HEIGHT, BAR_RADIUS);
                ctx.fill();

                // Label (if bar is wide enough)
                if (barW > LABEL_MIN_WIDTH_PX) {
                    ctx.globalAlpha = isHovered ? 1 : 0.85;
                    ctx.fillStyle = '#fff';
                    ctx.font = '11px Inter, sans-serif';
                    const label =
                        d.name.length > LABEL_NAME_MAX_LEN ? d.name.slice(0, LABEL_NAME_TRUNCATE) + '…' : d.name;
                    ctx.fillText(label, x1 + 6, y + 16);

                    ctx.fillStyle = '#ffffff99';
                    ctx.font = '10px Inter, sans-serif';
                    ctx.fillText(`${d.duration}m`, x1 + 6, y + 30);
                }

                // Hovered highlight
                if (isHovered) {
                    ctx.globalAlpha = 1;
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = HOVER_LINE_WIDTH;
                    roundRect(ctx, x1, y, barW, ROW_HEIGHT, BAR_RADIUS);
                    ctx.stroke();
                }

                ctx.globalAlpha = 1;
            }
        }

        // ── Draw time axis labels ────────────────────────────
        drawTimeLabels(viewStart, viewEnd, pxPerMs, w, h);

        // ── Draw vertical hover guide ────────────────────────
        if (hoveredInterval) {
            const hx = (hoveredInterval.start - viewStart) * pxPerMs;
            ctx.strokeStyle = '#ffffff44';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(hx, 0);
            ctx.lineTo(hx, h);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // ── Render mini-map ──────────────────────────────────
        renderMiniMap();
    }

    function drawDayBands(vs, ve, pxPerMs, w, h) {
        const startDay = Math.floor(vs / MS_PER_DAY) * MS_PER_DAY;
        const endDay = Math.ceil(ve / MS_PER_DAY) * MS_PER_DAY;

        for (let d = startDay; d < endDay; d += MS_PER_DAY) {
            const x1 = (d - viewStart) * pxPerMs;
            const x2 = (d + MS_PER_DAY - viewStart) * pxPerMs;
            const clampedX1 = Math.max(x1, 0);
            const clampedX2 = Math.min(x2, w);
            if (clampedX2 > clampedX1) {
                ctx.fillStyle =
                    Math.floor(d / MS_PER_DAY) % 2 === 0 ? '#ffffff06' : '#ffffff03';
                ctx.fillRect(clampedX1, 0, clampedX2 - clampedX1, h);
            }
        }
    }

    function drawTimeTicks(vs, ve, pxPerMs, w, h) {
        const pxPerHour = pxPerMs * MS_PER_HOUR;
        let tickInterval;
        if (pxPerHour > 200) tickInterval = MS_PER_HOUR;
        else if (pxPerHour > 80) tickInterval = MS_PER_HOUR * 2;
        else if (pxPerHour > 30) tickInterval = MS_PER_HOUR * 4;
        else if (pxPerHour > 15) tickInterval = MS_PER_HOUR * 6;
        else tickInterval = MS_PER_HOUR * 12;

        const startTick = Math.floor(vs / tickInterval) * tickInterval;
        const endTick = Math.ceil(ve / tickInterval) * tickInterval;

        ctx.strokeStyle = '#ffffff10';
        ctx.lineWidth = 1;

        for (let t = startTick; t <= endTick; t += tickInterval) {
            const x = (t - viewStart) * pxPerMs;
            if (x < 0 || x > w) continue;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
    }

    function drawTimeLabels(vs, ve, pxPerMs, w, h) {
        const pxPerHour = pxPerMs * MS_PER_HOUR;
        let tickInterval;
        if (pxPerHour > 200) tickInterval = MS_PER_HOUR;
        else if (pxPerHour > 80) tickInterval = MS_PER_HOUR * 2;
        else if (pxPerHour > 30) tickInterval = MS_PER_HOUR * 4;
        else if (pxPerHour > 15) tickInterval = MS_PER_HOUR * 6;
        else tickInterval = MS_PER_HOUR * 12;

        const startTick = Math.floor(vs / tickInterval) * tickInterval;
        const endTick = Math.ceil(ve / tickInterval) * tickInterval;
        const axisY = h - TICK_HEIGHT;

        ctx.fillStyle = '#ffffff55';
        ctx.font = '10px Inter, sans-serif';

        for (let t = startTick; t <= endTick; t += tickInterval) {
            const x = (t - viewStart) * pxPerMs;
            if (x < 0 || x > w) continue;

            const date = new Date(t);
            const label = date.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
            });
            ctx.fillText(label, x + 3, axisY + 14);

            ctx.strokeStyle = '#ffffff33';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, axisY);
            ctx.lineTo(x, axisY + 6);
            ctx.stroke();
        }
    }

    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // ── Mini-map (overview) ─────────────────────────────────
    function renderMiniMap() {
        if (!miniMapCtx) return;

        const mmW = canvasWrapper.clientWidth;
        const mmH = MINI_MAP_HEIGHT;

        miniMapCtx.clearRect(0, 0, mmW, mmH);

        if (intervals.length === 0) return;

        const allStart = Math.min(...intervals.map((d) => d.start));
        const allEnd = Math.max(...intervals.map((d) => d.end));
        const allRange = allEnd - allStart;
        const mmPxPerMs = mmW / allRange;

        // Draw all intervals as tiny bars
        for (const d of intervals) {
            const catObj = CATEGORIES.find((c) => c.name === d.category);
            const color = catObj ? catObj.color : '#888';

            const x1 = (d.start - allStart) * mmPxPerMs;
            const x2 = (d.end - allStart) * mmPxPerMs;

            // Only draw if category is visible
            if (!visibleCategories.has(d.category)) continue;

            miniMapCtx.fillStyle = color + '88';
            miniMapCtx.fillRect(x1, 0, Math.max(x2 - x1, 1), mmH);
        }

        // Draw viewport rectangle
        const vx1 = (viewStart - allStart) * mmPxPerMs;
        const vx2 = (viewEnd - allStart) * mmPxPerMs;

        miniMapCtx.strokeStyle = '#fff';
        miniMapCtx.lineWidth = 1.5;
        miniMapCtx.strokeRect(vx1, 0, vx2 - vx1, mmH);

        // Highlight visible area
        miniMapCtx.fillStyle = '#ffffff11';
        miniMapCtx.fillRect(vx1, 0, vx2 - vx1, mmH);
    }

    // ── Tooltip ─────────────────────────────────────────────
    function showTooltip(d, mouseX, mouseY) {
        const catObj = CATEGORIES.find((c) => c.name === d.category);
        const color = catObj ? catObj.color : '#888';

        const startStr = new Date(d.start).toLocaleString();
        const endStr = new Date(d.end).toLocaleString();

        tooltip.innerHTML = `
      <div class="tt-title">${d.name}</div>
      <div class="tt-row"><span class="tt-cat" style="background:${color}"></span>${d.category}</div>
      <div class="tt-row">📅 ${startStr}</div>
      <div class="tt-row">🏁 ${endStr}</div>
      <div class="tt-row">⏱ Duration: ${d.duration} min</div>
    `;
        tooltip.classList.remove('hidden');

        const wrapperRect = canvasWrapper.getBoundingClientRect();
        let tx = mouseX + 14;
        let ty = mouseY - 10;

        const tw = tooltip.offsetWidth;
        const th = tooltip.offsetHeight;
        if (tx + tw > wrapperRect.width - TOOLTIP_MARGIN_PX) tx = mouseX - tw - TOOLTIP_OFFSET_PX;
        if (ty + th > wrapperRect.height - TOOLTIP_MARGIN_PX)
            ty = wrapperRect.height - th - TOOLTIP_MARGIN_PX;
        if (ty < TOOLTIP_MARGIN_PX) ty = TOOLTIP_MARGIN_PX;

        tooltip.style.left = tx + 'px';
        tooltip.style.top = ty + 'px';
    }

    function hideTooltip() {
        tooltip.classList.add('hidden');
    }

    // ── Hit testing (optimized with y-clustering) ───────────
    function hitTest(mouseX, mouseY) {
        const w = canvasWrapper.clientWidth;
        const range = viewEnd - viewStart;
        const pxPerMs = w / range;
        const x = mouseX;

        // Only test within visible range
        const queryX = viewStart + x / pxPerMs;
        if (queryX < viewStart || queryX > viewEnd) return null;

        const candidates = tree.query(queryX);

        // Use y-coordinate to quickly filter, then find closest
        let best = null;
        let bestDist = Infinity;

        for (const d of candidates) {
            const barY = PADDING_TOP + d._row * (ROW_HEIGHT + GAP);
            if (mouseY >= barY && mouseY <= barY + ROW_HEIGHT) {
                const dist = Math.abs(mouseY - (barY + ROW_HEIGHT / 2));
                if (dist < bestDist) {
                    bestDist = dist;
                    best = d;
                }
            }
        }

        return best;
    }

    // ── Legend (created once, toggled via class) ────────────
    const legendItems = [];

    function initLegend() {
        legendEl.innerHTML = '';
        for (const cat of CATEGORIES) {
            const item = document.createElement('div');
            item.className = 'legend-item';
            item.innerHTML = `<span class="legend-swatch" style="background:${cat.color}"></span>${cat.name}`;
            item.addEventListener('click', () => {
                if (visibleCategories.has(cat.name)) {
                    visibleCategories.delete(cat.name);
                } else {
                    visibleCategories.add(cat.name);
                }
                renderLegend();
                render();
                renderMiniMap();
            });
            legendEl.appendChild(item);
            legendItems.push({ el: item, name: cat.name });
        }
    }

    function renderLegend() {
        for (const { el, name } of legendItems) {
            el.classList.toggle('dimmed', !visibleCategories.has(name));
        }
    }

    // ── Mouse interaction ───────────────────────────────────
    let isDragging = false;
    let dragStartX = 0;
    let dragViewStart = 0;
    let dragViewEnd = 0;

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvasWrapper.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        if (isDragging) {
            const dx = e.clientX - dragStartX;
            const range = dragViewEnd - dragViewStart;
            const pxPerMs = canvasWrapper.clientWidth / range;
            const msShift = -dx / pxPerMs;
            viewStart = dragViewStart + msShift;
            viewEnd = dragViewEnd + msShift;
            render();
            return;
        }

        // Hit test
        const hit = hitTest(mx, my);
        if (hit) {
            hoveredInterval = hit;
            hoveredId = hit.id;
            canvasWrapper.style.cursor = 'pointer';
            showTooltip(hit, mx, my);
        } else {
            hoveredInterval = null;
            hoveredId = -1;
            canvasWrapper.style.cursor = 'grab';
            hideTooltip();
        }
        render();
    });

    canvas.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        isDragging = true;
        dragStartX = e.clientX;
        dragViewStart = viewStart;
        dragViewEnd = viewEnd;
        canvasWrapper.classList.add('dragging');
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        canvasWrapper.classList.remove('dragging');
    });

    canvas.addEventListener('mouseleave', () => {
        hoveredInterval = null;
        hoveredId = -1;
        hideTooltip();
        render();
    });

    // ── Keyboard shortcuts ──────────────────────────────────
    document.addEventListener('keydown', (e) => {
        const panStep = PAN_STEP_MS; // 1 hour
        const range = viewEnd - viewStart;

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                viewStart -= panStep;
                viewEnd -= panStep;
                render();
                break;
            case 'ArrowRight':
                e.preventDefault();
                viewStart += panStep;
                viewEnd += panStep;
                render();
                break;
            case '+':
            case '=':
                zoomBy(0.75);
                break;
            case '-':
                zoomBy(1.33);
                break;
            case '0':
                btnZoomReset.click();
                break;
        }
    });

    // ── Zoom with wheel ─────────────────────────────────────
    canvas.addEventListener(
        'wheel',
        (e) => {
            e.preventDefault();
            const rect = canvasWrapper.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const range = canvasWrapper.clientWidth;
            const pxPerMs = range / (viewEnd - viewStart);
            const msAtCursor = viewStart + mx / pxPerMs;

            const zoomFactor = e.deltaY > 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR;
            const newRange = Math.max(
                MIN_ZOOM_MS,
                Math.min(MAX_ZOOM_MS, (viewEnd - viewStart) * zoomFactor)
            );

            viewStart = msAtCursor - mx / (range / newRange);
            viewEnd = viewStart + newRange;

            updateZoomLevel();
            render();
        },
        { passive: false }
    );

    // ── Zoom controls ───────────────────────────────────────
    function updateZoomLevel() {
        const range = viewEnd - viewStart;
        const defaultRange = DEFAULT_VIEW_MS;
        const pct = Math.round((defaultRange / range) * 100);
        zoomLevelEl.textContent = `${pct}%`;
    }

    btnZoomIn.addEventListener('click', () => zoomBy(ZOOM_FACTOR_IN));
    btnZoomOut.addEventListener('click', () => zoomBy(ZOOM_FACTOR_OUT));
    btnZoomReset.addEventListener('click', () => {
        if (intervals.length > 0) {
            const minStart = Math.min(...intervals.map((d) => d.start));
            const maxEnd = Math.max(...intervals.map((d) => d.end));
            const padding = (maxEnd - minStart) * AUTO_FIT_PADDING_PCT;
            viewStart = minStart - padding;
            viewEnd = maxEnd + padding;
        } else {
            viewStart = 0;
            viewEnd = DEFAULT_VIEW_MS;
        }
        updateZoomLevel();
        render();
    });

    // ── Mini-map click to navigate ────────────────────────
    if (miniMapCanvas) {
        miniMapCanvas.addEventListener('click', (e) => {
            const rect = miniMapCanvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const mmW = rect.width;

            const allStart = intervals.length
                ? Math.min(...intervals.map((d) => d.start))
                : 0;
            const allEnd = intervals.length
                ? Math.max(...intervals.map((d) => d.end))
                : MS_PER_DAY;
            const allRange = allEnd - allStart;
            const mmPxPerMs = mmW / allRange;

            const clickedMs = allStart + (mx / mmW) * allRange;
            const currentRange = viewEnd - viewStart;
            viewStart = clickedMs - currentRange / 2;
            viewEnd = clickedMs + currentRange / 2;
            updateZoomLevel();
            render();
        });
    }

    function zoomBy(factor) {
        const center = (viewStart + viewEnd) / 2;
        const range = (viewEnd - viewStart) * factor;
        viewStart = center - range / 2;
        viewEnd = center + range / 2;
        if (viewEnd - viewStart > MAX_ZOOM_MS) {
            const diff = viewEnd - viewStart - MAX_ZOOM_MS;
            viewStart += diff / 2;
            viewEnd -= diff / 2;
        }
        if (viewEnd - viewStart < MIN_ZOOM_MS) {
            const diff = MIN_ZOOM_MS - (viewEnd - viewStart);
            viewStart -= diff / 2;
            viewEnd += diff / 2;
        }
        updateZoomLevel();
        render();
    }

    // ── Search ──────────────────────────────────────────────
    let searchDebounce = null;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounce);
        searchDebounce = setTimeout(() => {
            searchTerm = searchInput.value.trim();
            render();
        }, SEARCH_DEBOUNCE_MS);
    });

    // ── Generate / Clear ────────────────────────────────────
    btnGenerate.addEventListener('click', () => {
        const count = parseInt(countInput.value, 10);
        if (!count || count < 1) {
            countInput.value = DEFAULT_COUNT;
            return;
        }
        const avgDuration = parseInt(durationInput.value, 10);
        const validDuration = avgDuration > 0 ? avgDuration : DEFAULT_DURATION;
        loadData(generateSampleData(Math.min(count, MAX_COUNT), validDuration));
    });

    btnClear.addEventListener('click', () => {
        loadData([]);
    });

    // ── Data management ─────────────────────────────────────
    function loadData(newIntervals) {
        tree = new IntervalTree();
        intervals = newIntervals.map((d) => ({ ...d }));
        for (const d of intervals) {
            tree.insert(d.start, d.end, d);
        }

        // Auto-fit viewport to actual data range
        if (intervals.length > 0) {
            const minStart = Math.min(...intervals.map((d) => d.start));
            const maxEnd = Math.max(...intervals.map((d) => d.end));
            const padding = (maxEnd - minStart) * AUTO_FIT_PADDING_PCT;
            viewStart = minStart - padding;
            viewEnd = maxEnd + padding;
        } else {
            viewStart = 0;
            viewEnd = DEFAULT_VIEW_MS;
        }

        updateZoomLevel();
        renderLegend();
        render();
        renderMiniMap();
    }

    // ── Init ────────────────────────────────────────────────
    function init() {
        window.addEventListener('resize', resize);
        resize();
        initLegend();

        // Generate initial sample data
        const initialDuration = parseInt(durationInput.value, 10) || DEFAULT_DURATION;
        loadData(generateSampleData(INITIAL_SAMPLE_COUNT, initialDuration));
    }

    return { init };
})();

// ── Boot ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', App.init);
