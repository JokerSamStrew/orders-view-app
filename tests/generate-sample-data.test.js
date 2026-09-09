/**
 * Tests for generateSampleData.
 *
 * This function creates synthetic booking records used for development
 * and testing the UI.  Tests verify the shape, range, and distribution
 * of generated data.
 */

import { describe, it, expect } from 'vitest';

const VALID_NAMES = [
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

const VALID_SERVICES = [
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

const VALID_CATEGORIES = [
  'Confirmed',
  'Pending',
  'Cancelled',
  'Checked-in',
  'No-show',
  'Rescheduled',
  'VIP',
  'Group',
];

function generateSampleData(count = 5000, avgDurationMin = 60) {
  const now = Date.now();
  const dayMs = 86_400_000;
  const range = 30 * dayMs;
  const avgDurationMs = avgDurationMin * 60_000;
  const categories = VALID_CATEGORIES;
  const services = VALID_SERVICES;

  const data = [];
  for (let i = 0; i < count; i++) {
    const start = now + Math.random() * range;
    const duration = avgDurationMs * (0.5 + Math.random() * 1.5);
    const cat = categories[Math.floor(Math.random() * categories.length)];
    const svc = services[Math.floor(Math.random() * services.length)];
    const name = VALID_NAMES[Math.floor(Math.random() * VALID_NAMES.length)];
    data.push({
      id: i,
      name: `${name} — ${svc}`,
      customer: name,
      category: cat,
      start,
      end: start + duration,
      duration: Math.round(duration / 60_000),
    });
  }
  return data;
}

// ─── Tests ──────────────────────────────────────────────────

describe('generateSampleData', () => {
  it('returns an array with exactly `count` items', () => {
    const data = generateSampleData(100);
    expect(data).toHaveLength(100);
  });

  it('returns an empty array when count is 0', () => {
    const data = generateSampleData(0);
    expect(data).toHaveLength(0);
  });

  it('each item has the correct shape (all required fields)', () => {
    const data = generateSampleData(10);
    for (const item of data) {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('customer');
      expect(item).toHaveProperty('category');
      expect(item).toHaveProperty('start');
      expect(item).toHaveProperty('end');
      expect(item).toHaveProperty('duration');
    }
  });

  it('each item has a valid category value', () => {
    const data = generateSampleData(50);
    for (const item of data) {
      expect(VALID_CATEGORIES).toContain(item.category);
    }
  });

  it('each item has a valid customer name', () => {
    const data = generateSampleData(50);
    for (const item of data) {
      expect(VALID_NAMES).toContain(item.customer);
    }
  });

  it('each item has start < end (duration is positive)', () => {
    const data = generateSampleData(100);
    for (const item of data) {
      expect(item.end).toBeGreaterThan(item.start);
    }
  });

  it('duration (in ms) is approximately equal to end - start (within 5% tolerance)', () => {
    const data = generateSampleData(100);
    for (const item of data) {
      const diff = item.end - item.start;
      const expectedMs = item.duration * 60_000;
      // Allow 5% tolerance because Math.round to nearest minute can
      // introduce up to 30,000ms error on short durations
      const tolerance = Math.max(expectedMs * 0.05, 30_000);
      expect(Math.abs(diff - expectedMs)).toBeLessThanOrEqual(tolerance);
    }
  });

  it('generated starts fall within a 30-day range from now', () => {
    const now = Date.now();
    const dayMs = 86_400_000;
    const data = generateSampleData(100);
    for (const item of data) {
      expect(item.start).toBeGreaterThanOrEqual(now);
      expect(item.start).toBeLessThanOrEqual(now + 30 * dayMs);
    }
  });

  it('avgDurationMin controls the approximate duration of items', () => {
    // With avgDurationMin = 60, average duration should be around 60 min
    const data = generateSampleData(1000, 60);
    const avgDuration =
      data.reduce((sum, d) => sum + d.duration, 0) / data.length;
    // Allow 20% tolerance due to 0.5x–2.0x random variation
    expect(avgDuration).toBeGreaterThan(40);
    expect(avgDuration).toBeLessThan(80);
  });

  it('higher avgDurationMin produces proportionally longer durations', () => {
    const shortData = generateSampleData(1000, 30);
    const longData = generateSampleData(1000, 120);
    const shortAvg =
      shortData.reduce((sum, d) => sum + d.duration, 0) / shortData.length;
    const longAvg =
      longData.reduce((sum, d) => sum + d.duration, 0) / longData.length;
    expect(longAvg).toBeGreaterThan(shortAvg * 1.5);
  });

  it('id values are sequential from 0 to count-1', () => {
    const data = generateSampleData(100);
    for (let i = 0; i < 100; i++) {
      expect(data[i].id).toBe(i);
    }
  });

  it('name field contains customer and a service', () => {
    const data = generateSampleData(50);
    for (const item of data) {
      expect(item.name).toContain(item.customer);
      expect(VALID_SERVICES.some((s) => item.name.includes(s))).toBe(true);
    }
  });
});
