/**
 * Tests for getFiltered + assignRows logic.
 *
 * These functions implement the core filtering and row-packing
 * algorithms that determine which intervals appear on the canvas
 * and how collisions are avoided.
 */

import { describe, it, expect } from 'vitest';

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

// ─── Filtering logic (extracted from getFiltered) ────────────

function getFiltered(intervals, searchTerm, visibleCategories) {
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

// ─── Row assignment (extracted from assignRows) ──────────────

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

// ─── Tests ──────────────────────────────────────────────────

describe('getFiltered', () => {
  it('returns all items when no filters are applied', () => {
    const intervals = [
      { id: 1, name: 'A', customer: 'Alice', category: 'Confirmed', start: 100, end: 200 },
      { id: 2, name: 'B', customer: 'Bob', category: 'Pending', start: 300, end: 400 },
    ];
    const visibleCategories = new Set(VALID_CATEGORIES);
    const result = getFiltered(intervals, '', visibleCategories);
    expect(result).toHaveLength(2);
  });

  it('filters by search term matching name', () => {
    const intervals = [
      { id: 1, name: 'Alice — Haircut', customer: 'Alice', category: 'Confirmed', start: 100, end: 200 },
      { id: 2, name: 'Bob — Massage', customer: 'Bob', category: 'Pending', start: 300, end: 400 },
    ];
    const visibleCategories = new Set(VALID_CATEGORIES);
    const result = getFiltered(intervals, 'Alice', visibleCategories);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('filters by search term matching customer', () => {
    const intervals = [
      { id: 1, name: 'A', customer: 'Alice', category: 'Confirmed', start: 100, end: 200 },
      { id: 2, name: 'B', customer: 'Bob', category: 'Pending', start: 300, end: 400 },
    ];
    const visibleCategories = new Set(VALID_CATEGORIES);
    const result = getFiltered(intervals, 'Bob', visibleCategories);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('filters by search term matching category', () => {
    const intervals = [
      { id: 1, name: 'A', customer: 'Alice', category: 'Confirmed', start: 100, end: 200 },
      { id: 2, name: 'B', customer: 'Bob', category: 'Cancelled', start: 300, end: 400 },
    ];
    const visibleCategories = new Set(VALID_CATEGORIES);
    const result = getFiltered(intervals, 'Cancelled', visibleCategories);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('performs case-insensitive search', () => {
    const intervals = [
      { id: 1, name: 'Alice — Haircut', customer: 'Alice', category: 'Confirmed', start: 100, end: 200 },
    ];
    const visibleCategories = new Set(VALID_CATEGORIES);
    const result = getFiltered(intervals, 'alice', visibleCategories);
    expect(result).toHaveLength(1);
  });

  it('returns no results when search term matches nothing', () => {
    const intervals = [
      { id: 1, name: 'A', customer: 'Alice', category: 'Confirmed', start: 100, end: 200 },
    ];
    const visibleCategories = new Set(VALID_CATEGORIES);
    const result = getFiltered(intervals, 'Zzzzz', visibleCategories);
    expect(result).toHaveLength(0);
  });

  it('filters by visible categories', () => {
    const intervals = [
      { id: 1, name: 'A', customer: 'Alice', category: 'Confirmed', start: 100, end: 200 },
      { id: 2, name: 'B', customer: 'Bob', category: 'Cancelled', start: 300, end: 400 },
      { id: 3, name: 'C', customer: 'Carol', category: 'VIP', start: 500, end: 600 },
    ];
    const visibleCategories = new Set(['Confirmed', 'VIP']);
    const result = getFiltered(intervals, '', visibleCategories);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.id)).toEqual([1, 3]);
  });

  it('applies both search and category filters together', () => {
    const intervals = [
      { id: 1, name: 'Alice — Haircut', customer: 'Alice', category: 'Confirmed', start: 100, end: 200 },
      { id: 2, name: 'Bob — Massage', customer: 'Bob', category: 'Cancelled', start: 300, end: 400 },
      { id: 3, name: 'Carol — Yoga', customer: 'Carol', category: 'Confirmed', start: 500, end: 600 },
    ];
    const visibleCategories = new Set(VALID_CATEGORIES);
    const result = getFiltered(intervals, 'Carol', visibleCategories);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });

  it('returns empty array for empty input', () => {
    const visibleCategories = new Set(VALID_CATEGORIES);
    const result = getFiltered([], '', visibleCategories);
    expect(result).toHaveLength(0);
  });

  it('sorts results by start time in ascending order', () => {
    const intervals = [
      { id: 3, name: 'C', customer: 'Carol', category: 'Confirmed', start: 500, end: 600 },
      { id: 1, name: 'A', customer: 'Alice', category: 'Confirmed', start: 100, end: 200 },
      { id: 2, name: 'B', customer: 'Bob', category: 'Confirmed', start: 300, end: 400 },
    ];
    const visibleCategories = new Set(VALID_CATEGORIES);
    const result = getFiltered(intervals, '', visibleCategories);
    expect(result.map((r) => r.id)).toEqual([1, 2, 3]);
  });
});

describe('assignRows', () => {
  it('assigns all items to row 0 when there are no overlaps', () => {
    const items = [
      { id: 1, start: 100, end: 200 },
      { id: 2, start: 300, end: 400 },
      { id: 3, start: 500, end: 600 },
    ];
    assignRows(items);
    expect(items.every((i) => i._row === 0)).toBe(true);
  });

  it('assigns overlapping items to different rows', () => {
    const items = [
      { id: 1, start: 100, end: 300 },
      { id: 2, start: 200, end: 400 },
      { id: 3, start: 500, end: 600 },
    ];
    assignRows(items);
    // Items 1 and 2 overlap, so they get different rows
    expect(items[0]._row).not.toBe(items[1]._row);
    // Item 3 does not overlap with 1 or 2, so it can reuse row 0
    expect(items[2]._row).toBe(0);
  });

  it('correctly packs multiple overlapping intervals', () => {
    const items = [
      { id: 1, start: 100, end: 500 },
      { id: 2, start: 200, end: 600 },
      { id: 3, start: 300, end: 400 },
      { id: 4, start: 700, end: 800 },
    ];
    assignRows(items);
    // 1, 2, 3 all overlap — they need 3 distinct rows (0, 1, 2)
    const rows = items.slice(0, 3).map((i) => i._row);
    expect(new Set(rows)).toHaveProperty('size', 3);
    // Item 4 does not overlap with any of 1-3, so it gets row 0
    expect(items[3]._row).toBe(0);
  });

  it('handles an empty array', () => {
    assignRows([]);
  });

  it('handles a single item', () => {
    const items = [{ id: 1, start: 100, end: 200 }];
    assignRows(items);
    expect(items[0]._row).toBe(0);
  });

  it('assigns row indices in a compact packing (no gaps)', () => {
    const items = [
      { id: 1, start: 100, end: 400 },
      { id: 2, start: 200, end: 500 },
      { id: 3, start: 350, end: 600 }, // overlaps all three
      { id: 4, start: 700, end: 800 },
    ];
    assignRows(items);
    const maxRow = Math.max(...items.map((i) => i._row));
    // Items 1, 2, 3 all overlap each other, requiring 3 distinct rows (0, 1, 2)
    expect(maxRow).toBe(2);
  });
});
