/**
 * Tests for the hitTest function.
 *
 * hitTest determines which booking bar (if any) the cursor is hovering over.
 * It checks horizontal time range, vertical row visibility, X-position within
 * the bar, and picks the closest bar by vertical distance.
 *
 * The function accepts a "viewport" argument that bundles all the state
 * hitTest needs, so it can be tested without DOM or Canvas.
 */

import { describe, it, expect } from 'vitest';

// ── Constants mirrored from app.js ────────────────────────────
const ROW_HEIGHT = 48;
const GAP = 4;
const PADDING_TOP = 40;
const TICK_HEIGHT = 30;

// ── Pure hitTest logic (extracted from src/app.js) ────────────

/**
 * Simulates one call to hitTest with explicit parameters.
 *
 * @param {Array<Object>} filtered  — intervals already filtered & assigned _row
 * @param {Object} viewport — { viewStart, viewEnd, mouseX, mouseY, canvasW, canvasH, viewRowOffset }
 * @returns {Object|null} the closest matching interval, or null
 */
function hitTest(filtered, viewport) {
  const { viewStart, viewEnd, mouseX, mouseY, canvasW, canvasH, viewRowOffset } = viewport;
  const range = viewEnd - viewStart;
  const pxPerMs = canvasW / range;
  const x = mouseX;

  // Horizontal time range check
  const queryX = viewStart + x / pxPerMs;
  if (queryX < viewStart || queryX > viewEnd) return null;

  // Visible row span
  const labelTop = canvasH - TICK_HEIGHT;
  const visibleRowSpan = Math.floor((labelTop - PADDING_TOP) / (ROW_HEIGHT + GAP));
  const lastVisibleRow = viewRowOffset + visibleRowSpan;

  let best = null;
  let bestDist = Infinity;

  for (const d of filtered) {
    // Skip if outside horizontal viewport
    if (d.end < viewStart || d.start > viewEnd) continue;

    // Skip if outside visible row range
    if (d._row < viewRowOffset || d._row > lastVisibleRow) continue;

    // Compute bar pixel X bounds
    const x1 = (d.start - viewStart) * pxPerMs;
    const x2 = (d.end - viewStart) * pxPerMs;
    if (x < x1 || x > x2) continue;

    // Bar Y position (offset by viewRowOffset)
    const barY = PADDING_TOP + (d._row - viewRowOffset) * (ROW_HEIGHT + GAP);
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

// ── Helpers ───────────────────────────────────────────────────

function makeInterval(id, start, end, category) {
  return { id, start, end, category, duration: Math.round((end - start) / 60_000) };
}

function assignRows(items) {
  const rowEnds = [];
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
  return items;
}

/**
 * Compute the pixel X position of a bar's midpoint, given a viewport.
 * This is the SAME formula used inside hitTest for x1/x2.
 */
function barMidX(interval, vp) {
  const range = vp.viewEnd - vp.viewStart;
  const pxPerMs = vp.canvasW / range;
  return (interval.start + (interval.end - interval.start) / 2 - vp.viewStart) * pxPerMs;
}

/**
 * Compute a viewport that shows all given intervals.
 */
function makeViewport(intervals) {
  const minStart = Math.min(...intervals.map(d => d.start));
  const maxEnd = Math.max(...intervals.map(d => d.end));
  const padding = 3 * 3_600_000; // 3h padding
  return {
    viewStart: minStart - padding,
    viewEnd: maxEnd + padding,
    mouseX: 200,
    mouseY: PADDING_TOP + 20,
    canvasW: 1200,
    canvasH: 600,
    viewRowOffset: 0,
  };
}

// ── Tests ─────────────────────────────────────────────────────

describe('hitTest', () => {
  it('returns null for an empty filtered set', () => {
    expect(hitTest([], makeViewport([]))).toBeNull();
  });

  it('returns null when the mouse X is outside the time range', () => {
    const now = Date.now();
    const intervals = assignRows([
      makeInterval(1, now, now + 3600_000, 'Confirmed'),
    ]);
    const vp = { ...makeViewport(intervals), mouseX: -100 };
    expect(hitTest(intervals, vp)).toBeNull();
  });

  it('returns null when the mouse X is past the end of the time range', () => {
    const now = Date.now();
    const intervals = assignRows([
      makeInterval(1, now, now + 3600_000, 'Confirmed'),
    ]);
    const vp = { ...makeViewport(intervals), mouseX: 2000 };
    expect(hitTest(intervals, vp)).toBeNull();
  });

  it('returns null when the mouse Y is outside the bar height', () => {
    const now = Date.now();
    const intervals = assignRows([
      makeInterval(1, now, now + 3600_000, 'Confirmed'),
    ]);
    const vp = { ...makeViewport(intervals), mouseY: 5000 };
    expect(hitTest(intervals, vp)).toBeNull();
  });

  it('finds the bar when the cursor is directly over it', () => {
    const now = Date.now();
    const intervals = assignRows([
      makeInterval(1, now, now + 3600_000, 'Confirmed'),
    ]);
    const vp = makeViewport(intervals);
    const mx = barMidX(intervals[0], vp);
    const result = hitTest(intervals, { ...vp, mouseX: mx });
    expect(result).not.toBeNull();
    expect(result.id).toBe(1);
  });

  it('finds the bar when the cursor is at the top edge of the bar', () => {
    const now = Date.now();
    const intervals = assignRows([
      makeInterval(1, now, now + 3600_000, 'Confirmed'),
    ]);
    const vp = makeViewport(intervals);
    const mx = barMidX(intervals[0], vp);
    const result = hitTest(intervals, { ...vp, mouseX: mx, mouseY: PADDING_TOP });
    expect(result).not.toBeNull();
    expect(result.id).toBe(1);
  });

  it('finds the bar when the cursor is at the bottom edge of the bar', () => {
    const now = Date.now();
    const intervals = assignRows([
      makeInterval(1, now, now + 3600_000, 'Confirmed'),
    ]);
    const vp = makeViewport(intervals);
    const mx = barMidX(intervals[0], vp);
    const result = hitTest(intervals, { ...vp, mouseX: mx, mouseY: PADDING_TOP + ROW_HEIGHT });
    expect(result).not.toBeNull();
    expect(result.id).toBe(1);
  });

  it('skips bars outside the visible row range (scrolled off screen)', () => {
    const now = Date.now();
    const intervals = assignRows([
      makeInterval(1, now, now + 3600_000, 'Confirmed'),
      makeInterval(2, now + 7200_000, now + 10800_000, 'Pending'),
    ]);
    // viewRowOffset = 5: rows 0-1 are scrolled off the top
    const vp = makeViewport(intervals);
    const mx = barMidX(intervals[0], vp);
    const result = hitTest(intervals, { ...vp, viewRowOffset: 5, mouseX: mx, mouseY: 100 });
    expect(result).toBeNull();
  });

  it('finds a bar when it is scrolled into the visible area', () => {
    const now = Date.now();
    const intervals = assignRows([
      makeInterval(1, now, now + 3600_000, 'Confirmed'),
    ]);
    const vp = makeViewport(intervals);
    const mx = barMidX(intervals[0], vp);
    // viewRowOffset = 0: row 0 is visible
    const result = hitTest(intervals, { ...vp, viewRowOffset: 0, mouseX: mx, mouseY: PADDING_TOP + 20 });
    expect(result).not.toBeNull();
    expect(result.id).toBe(1);
  });

  it('respects viewRowOffset — finds a bar on a scrolled-into-view row', () => {
    const now = Date.now();
    // Create overlapping intervals so they span multiple rows
    const intervals = assignRows([
      makeInterval(1, now, now + 7200_000, 'Confirmed'),
      makeInterval(2, now + 3600_000, now + 10800_000, 'Pending'),
      makeInterval(3, now + 5400_000, now + 12600_000, 'Cancelled'),
      makeInterval(4, now + 9000_000, now + 16200_000, 'Checked-in'),
    ]);
    const vp = makeViewport(intervals);
    // Rows 0 and 1 are on the top half, rows 2 and 3 are on the bottom half
    // viewRowOffset = 2 means rows 0-1 are scrolled off, rows 2-3 are visible
    const target = intervals[2]; // id=3, should be on row 2
    const mx = barMidX(target, vp);
    const result = hitTest(intervals, { ...vp, viewRowOffset: 2, mouseX: mx, mouseY: PADDING_TOP + 10 });
    expect(result).not.toBeNull();
    expect(result.id).toBe(3);
  });

  it('returns null when the bar is scrolled off the top of the viewport', () => {
    const now = Date.now();
    const intervals = assignRows([
      makeInterval(1, now, now + 3600_000, 'Confirmed'),
    ]);
    const vp = makeViewport(intervals);
    const visibleRowSpan = Math.floor((vp.canvasH - TICK_HEIGHT - PADDING_TOP) / (ROW_HEIGHT + GAP));
    const mx = barMidX(intervals[0], vp);
    // Scroll far past row 0
    const result = hitTest(intervals, { ...vp, viewRowOffset: visibleRowSpan + 5, mouseX: mx, mouseY: 100 });
    expect(result).toBeNull();
  });

  it('picks the closest bar when multiple bars overlap the cursor Y', () => {
    const now = Date.now();
    // Create overlapping intervals that span multiple rows
    const intervals = assignRows([
      makeInterval(1, now, now + 7200_000, 'Confirmed'),
      makeInterval(2, now + 3600_000, now + 10800_000, 'Pending'),
      makeInterval(3, now + 5400_000, now + 12600_000, 'Cancelled'),
    ]);
    const vp = makeViewport(intervals);
    // Row 1 (id=2) is at PADDING_TOP + (ROW_HEIGHT + GAP)
    // Position Y at the middle of row 1
    const targetY = PADDING_TOP + ROW_HEIGHT + GAP + ROW_HEIGHT / 2;
    const mx = barMidX(intervals[1], vp);
    const result = hitTest(intervals, { ...vp, mouseX: mx, mouseY: targetY });
    expect(result).not.toBeNull();
    expect(result.id).toBe(2);
  });

  it('picks the closest bar by vertical distance, not by time proximity', () => {
    const now = Date.now();
    // Create overlapping intervals that span multiple rows
    const intervals = assignRows([
      makeInterval(1, now, now + 7200_000, 'Confirmed'),
      makeInterval(2, now + 3600_000, now + 10800_000, 'Pending'),
      makeInterval(3, now + 5400_000, now + 12600_000, 'Cancelled'),
    ]);
    const vp = makeViewport(intervals);
    // Cursor is vertically closer to row 1 (id=2) than row 0 (id=1)
    const targetY = PADDING_TOP + ROW_HEIGHT + GAP + 5;
    const mx = barMidX(intervals[1], vp);
    const result = hitTest(intervals, { ...vp, mouseX: mx, mouseY: targetY });
    expect(result).not.toBeNull();
    expect(result.id).toBe(2);
  });

  it('returns null when the bar is outside the horizontal time range', () => {
    const now = Date.now();
    const intervals = assignRows([
      makeInterval(1, now + 100 * 3600_000, now + 110 * 3600_000, 'Confirmed'),
    ]);
    const vp = makeViewport(intervals);
    // Mouse X maps to a time far before the bar starts
    const result = hitTest(intervals, { ...vp, mouseX: 50 });
    expect(result).toBeNull();
  });

  it('works with many intervals across many rows', () => {
    const now = Date.now();
    const intervals = [];
    for (let i = 0; i < 100; i++) {
      intervals.push(
        makeInterval(i, now + i * 3_600_000, now + i * 3_600_000 + 1_800_000, 'Confirmed')
      );
    }
    assignRows(intervals);

    const vp = makeViewport(intervals);
    const target = intervals[50];
    const mx = barMidX(target, vp);
    const result = hitTest(intervals, { ...vp, viewRowOffset: target._row, mouseX: mx, mouseY: PADDING_TOP + 10 });
    expect(result).not.toBeNull();
    expect(result.id).toBe(50);
  });

  it('returns null when viewRowOffset pushes all bars off-screen', () => {
    const now = Date.now();
    const intervals = assignRows([
      makeInterval(1, now, now + 3600_000, 'Confirmed'),
      makeInterval(2, now + 7200_000, now + 10800_000, 'Pending'),
    ]);
    const vp = makeViewport(intervals);
    const visibleRowSpan = Math.floor((vp.canvasH - TICK_HEIGHT - PADDING_TOP) / (ROW_HEIGHT + GAP));
    const mx = barMidX(intervals[0], vp);
    // Scroll far past all rows
    const result = hitTest(intervals, { ...vp, viewRowOffset: visibleRowSpan + 100, mouseX: mx, mouseY: 100 });
    expect(result).toBeNull();
  });
});
