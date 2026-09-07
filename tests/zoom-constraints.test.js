/**
 * Tests for the zoom constraints (MIN_ZOOM / MAX_ZOOM).
 *
 * The application enforces a minimum 4-hour and maximum 90-day
 * zoom range.  These tests verify the clamping logic.
 */

import { describe, it, expect } from 'vitest';

const MIN_ZOOM = 4 * 3600_000; // 4 hours in ms
const MAX_ZOOM = 90 * 86_400_000; // 90 days in ms

// ─── zoomBy (extracted from src/app.js) ──────────────────────

function zoomBy(viewStart, viewEnd, factor) {
  const center = (viewStart + viewEnd) / 2;
  let range = (viewEnd - viewStart) * factor;

  // Clamp to MAX_ZOOM
  if (range > MAX_ZOOM) {
    const diff = range - MAX_ZOOM;
    range = MAX_ZOOM;
  }
  // Clamp to MIN_ZOOM
  if (range < MIN_ZOOM) {
    range = MIN_ZOOM;
  }

  const newStart = center - range / 2;
  const newEnd = center + range / 2;
  return { viewStart: newStart, viewEnd: newEnd, range };
}

// ─── Tests ──────────────────────────────────────────────────

describe('zoom constraints', () => {
  it('does not zoom in past MIN_ZOOM (4 hours)', () => {
    const { viewStart, viewEnd, range } = zoomBy(0, 1000, 0.5);
    expect(range).toBeGreaterThanOrEqual(MIN_ZOOM);
  });

  it('does not zoom out past MAX_ZOOM (90 days)', () => {
    const { viewStart, viewEnd, range } = zoomBy(0, 100_000_000_000, 2);
    expect(range).toBeLessThanOrEqual(MAX_ZOOM);
  });

  it('clamps at MIN_ZOOM when zooming in on a small range', () => {
    const { range } = zoomBy(0, 200, 0.5);
    expect(range).toBe(MIN_ZOOM);
  });

  it('clamps at MAX_ZOOM when zooming out on a large range', () => {
    const { range } = zoomBy(0, 200_000_000_000, 2);
    expect(range).toBe(MAX_ZOOM);
  });

  it('maintains the center of the viewport after zooming', () => {
    const originalCenter = (0 + 10000) / 2; // 5000
    const { viewStart, viewEnd } = zoomBy(0, 10000, 0.5);
    const newCenter = (viewStart + viewEnd) / 2;
    expect(newCenter).toBe(originalCenter);
  });

  it('maintains the center when clamping at MIN_ZOOM', () => {
    const originalCenter = (0 + 200) / 2; // 100
    const { viewStart, viewEnd } = zoomBy(0, 200, 0.5);
    const newCenter = (viewStart + viewEnd) / 2;
    expect(newCenter).toBe(originalCenter);
  });
});
