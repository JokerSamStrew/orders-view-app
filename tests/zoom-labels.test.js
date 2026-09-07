/**
 * Tests for the adaptive time-label rendering logic.
 *
 * The axis labels on the canvas change their format and tick spacing
 * depending on how much of the timeline is visible (view span in days).
 * Five zoom tiers are defined:
 *
 *   <  1 day  → tick every hour,  format: HH:MM
 *   1–7 days  → tick every 4h,    format: Sep 7 14:30
 *   7–60 days → tick every 2 days, format: Sep 7
 *   60–365 days → tick every 30 days, format: Sep 2025
 *   > 365 days → tick every 365 days, format: 2025
 *
 * These tests verify the tick interval, label format, and label content
 * for every tier, boundary conditions, and edge cases.
 */

import { describe, it, expect } from 'vitest';

// ─── Constants (mirrored from src/app.js) ──────────────────────

const MS_PER_HOUR  = 60 * 60 * 1_000;       // 3,600,000 ms
const MS_PER_DAY   = 24 * MS_PER_HOUR;      // 86,400,000 ms

// ─── Pure logic extracted from drawTimeLabels ──────────────────

/**
 * Determine the label format and tick interval for a given viewport.
 *
 * This is the pure decision logic from `drawTimeLabels`, extracted so
 * it can be tested without DOM / Canvas dependencies.
 *
 * @param {number} viewStart — viewport start in epoch-ms
 * @param {number} viewEnd   — viewport end in epoch-ms
 * @returns {{ labelFormat: string, tickInterval: number }}
 */
function determineLabelConfig(viewStart, viewEnd) {
  const viewSpanDays = (viewEnd - viewStart) / MS_PER_DAY;

  let tickInterval;
  let labelFormat;

  if (viewSpanDays < 1) {
    tickInterval = MS_PER_HOUR;
    labelFormat = 'time';
  } else if (viewSpanDays < 7) {
    tickInterval = MS_PER_HOUR * 4;
    labelFormat = 'datetime';
  } else if (viewSpanDays < 60) {
    tickInterval = MS_PER_DAY * 2;
    labelFormat = 'date';
  } else if (viewSpanDays < 365) {
    tickInterval = MS_PER_DAY * 30;
    labelFormat = 'month';
  } else {
    tickInterval = MS_PER_DAY * 365;
    labelFormat = 'year';
  }

  return { labelFormat, tickInterval };
}

/**
 * Build the label text that would be rendered at a given timestamp
 * for a given label format.
 *
 * @param {Date} date
 * @param {string} labelFormat
 * @returns {string}
 */
function buildLabel(date, labelFormat) {
  switch (labelFormat) {
    case 'time':
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    case 'datetime':
      return (
        date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
        ' ' +
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    case 'date':
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    case 'month':
      return date.toLocaleDateString([], { month: 'short', year: 'numeric' });
    case 'year':
      return String(date.getFullYear());
    default:
      throw new Error(`Unknown label format: ${labelFormat}`);
  }
}

// ─── Tests ──────────────────────────────────────────────────────

describe('label format selection', () => {
  it('selects "time" format when view span is less than 1 day', () => {
    const config = determineLabelConfig(0, MS_PER_DAY * 0.5);
    expect(config.labelFormat).toBe('time');
  });

  it('selects "datetime" format when view span is 1–7 days', () => {
    const config = determineLabelConfig(0, MS_PER_DAY * 3);
    expect(config.labelFormat).toBe('datetime');
  });

  it('selects "date" format when view span is 7–60 days', () => {
    const config = determineLabelConfig(0, MS_PER_DAY * 30);
    expect(config.labelFormat).toBe('date');
  });

  it('selects "month" format when view span is 60–365 days', () => {
    const config = determineLabelConfig(0, MS_PER_DAY * 200);
    expect(config.labelFormat).toBe('month');
  });

  it('selects "year" format when view span exceeds 365 days', () => {
    const config = determineLabelConfig(0, MS_PER_DAY * 730);
    expect(config.labelFormat).toBe('year');
  });

  it('selects the correct format at every boundary (just below)', () => {
    // 0.999 days → time
    expect(determineLabelConfig(0, MS_PER_DAY * 0.999).labelFormat).toBe('time');
    // 6.999 days → datetime
    expect(determineLabelConfig(0, MS_PER_DAY * 6.999).labelFormat).toBe('datetime');
    // 59.999 days → date
    expect(determineLabelConfig(0, MS_PER_DAY * 59.999).labelFormat).toBe('date');
    // 364.999 days → month
    expect(determineLabelConfig(0, MS_PER_DAY * 364.999).labelFormat).toBe('month');
  });

  it('selects the correct format at every boundary (at the boundary)', () => {
    // exactly 1 day → datetime
    expect(determineLabelConfig(0, MS_PER_DAY * 1).labelFormat).toBe('datetime');
    // exactly 7 days → date
    expect(determineLabelConfig(0, MS_PER_DAY * 7).labelFormat).toBe('date');
    // exactly 60 days → month
    expect(determineLabelConfig(0, MS_PER_DAY * 60).labelFormat).toBe('month');
    // exactly 365 days → year
    expect(determineLabelConfig(0, MS_PER_DAY * 365).labelFormat).toBe('year');
  });

  it('handles a zero-width viewport (edge case)', () => {
    const config = determineLabelConfig(1_000_000_000, 1_000_000_000);
    expect(config.labelFormat).toBe('time');
  });
});

describe('tick interval selection', () => {
  it('uses 1-hour ticks for the "time" tier', () => {
    const config = determineLabelConfig(0, MS_PER_DAY * 0.5);
    expect(config.tickInterval).toBe(MS_PER_HOUR);
  });

  it('uses 4-hour ticks for the "datetime" tier', () => {
    const config = determineLabelConfig(0, MS_PER_DAY * 3);
    expect(config.tickInterval).toBe(MS_PER_HOUR * 4);
  });

  it('uses 2-day ticks for the "date" tier', () => {
    const config = determineLabelConfig(0, MS_PER_DAY * 30);
    expect(config.tickInterval).toBe(MS_PER_DAY * 2);
  });

  it('uses 30-day ticks for the "month" tier', () => {
    const config = determineLabelConfig(0, MS_PER_DAY * 200);
    expect(config.tickInterval).toBe(MS_PER_DAY * 30);
  });

  it('uses 365-day ticks for the "year" tier', () => {
    const config = determineLabelConfig(0, MS_PER_DAY * 730);
    expect(config.tickInterval).toBe(MS_PER_DAY * 365);
  });
});

describe('label content by format', () => {
  const baseDate = new Date(Date.UTC(2025, 8, 15, 14, 30, 0)); // Sep 15, 2025 14:30 UTC

  it('"time" format produces a time-only label', () => {
    const label = buildLabel(baseDate, 'time');
    expect(label).toMatch(/\d{2}:\d{2}/);
    // Should NOT contain a month or year
    expect(label).not.toMatch(/2025/);
    expect(label).not.toMatch(/Sep/i);
  });

  it('"datetime" format produces date + time', () => {
    const label = buildLabel(baseDate, 'datetime');
    // Should contain month + day + time
    expect(label).toMatch(/Sep/);
    expect(label).toMatch(/15/);
    expect(label).toMatch(/\d{2}:\d{2}/);
  });

  it('"date" format produces month + day only', () => {
    const label = buildLabel(baseDate, 'date');
    expect(label).toMatch(/Sep/);
    expect(label).toMatch(/15/);
    expect(label).not.toMatch(/2025/);
    expect(label).not.toMatch(/\d{2}:\d{2}/);
  });

  it('"month" format produces month + year only', () => {
    const label = buildLabel(baseDate, 'month');
    expect(label).toMatch(/Sep/);
    expect(label).toMatch(/2025/);
    expect(label).not.toMatch(/15/);
    expect(label).not.toMatch(/\d{2}:\d{2}/);
  });

  it('"year" format produces year only', () => {
    const label = buildLabel(baseDate, 'year');
    expect(label).toBe('2025');
    expect(label).not.toMatch(/Sep/);
    expect(label).not.toMatch(/15/);
    expect(label).not.toMatch(/\d{2}:\d{2}/);
  });

  it('throws on an unknown label format', () => {
    expect(() => buildLabel(baseDate, 'unknown')).toThrow('Unknown label format');
  });
});

describe('transitions between zoom tiers', () => {
  it('steps through all 5 formats as view span increases', () => {
    const spans = [0.1, 3, 30, 200, 730]; // in days
    const expectedFormats = ['time', 'datetime', 'date', 'month', 'year'];
    const results = spans.map((days) =>
      determineLabelConfig(0, MS_PER_DAY * days).labelFormat
    );
    expect(results).toEqual(expectedFormats);
  });

  it('all 4 reachable formats appear within the 4h–90d zoom range', () => {
    // The app enforces MIN_ZOOM = 4h and MAX_ZOOM = 90d.
    // Within this range we should hit time, datetime, date, and month.
    const configs = [
      determineLabelConfig(0, MS_PER_HOUR * 4),        // 4h → time
      determineLabelConfig(0, MS_PER_DAY * 1),          // 1d → datetime
      determineLabelConfig(0, MS_PER_DAY * 7),          // 7d → date
      determineLabelConfig(0, MS_PER_DAY * 60),         // 60d → month
      determineLabelConfig(0, MS_PER_DAY * 90),         // 90d → month (within 90d max)
    ];
    const formats = configs.map((c) => c.labelFormat);
    const uniqueFormats = new Set(formats);
    expect(uniqueFormats).toEqual(new Set(['time', 'datetime', 'date', 'month']));
    // Note: "year" requires > 365 days, which exceeds MAX_ZOOM (90d),
    // so it is unreachable in normal use — that is expected and documented.
  });
});

describe('label consistency across date boundaries', () => {
  it('produces valid labels for dates in different months ("date" format)', () => {
    const dates = [
      new Date(Date.UTC(2025, 0, 1)),   // Jan 1
      new Date(Date.UTC(2025, 5, 15)),  // Jun 15
      new Date(Date.UTC(2025, 11, 31)), // Dec 31
    ];
    for (const d of dates) {
      const label = buildLabel(d, 'date');
      expect(label).toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
    }
  });

  it('produces valid labels for dates crossing year boundary ("month" format)', () => {
    const dates = [
      new Date(Date.UTC(2024, 11, 15)), // Dec 2024
      new Date(Date.UTC(2025, 0, 1)),   // Jan 2025
    ];
    for (const d of dates) {
      const label = buildLabel(d, 'month');
      expect(label).toMatch(/\d{4}/);
    }
  });

  it('produces valid labels for dates crossing year boundary ("year" format)', () => {
    const dates = [
      new Date(Date.UTC(2024, 6, 1)),
      new Date(Date.UTC(2025, 0, 1)),
      new Date(Date.UTC(2026, 11, 31)),
    ];
    for (const d of dates) {
      const label = buildLabel(d, 'year');
      expect(label).toMatch(/^\d{4}$/);
    }
  });
});
