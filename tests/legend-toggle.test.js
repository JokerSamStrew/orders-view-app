/**
 * Tests for the legend toggle logic.
 *
 * The legend allows users to toggle individual category visibility.
 * These tests verify the add/delete behavior on the visibleCategories
 * Set.
 */

import { describe, it, expect } from 'vitest';

// ─── Legend toggle logic (extracted from src/app.js) ─────────

function toggleCategory(visibleCategories, categoryName) {
  if (visibleCategories.has(categoryName)) {
    visibleCategories.delete(categoryName);
  } else {
    visibleCategories.add(categoryName);
  }
}

// ─── Tests ──────────────────────────────────────────────────

describe('legend toggle', () => {
  it('starts with a set that can hold any category names', () => {
    const visibleCategories = new Set(['Confirmed', 'Pending', 'Cancelled']);
    expect(visibleCategories.size).toBe(3);
  });

  it('toggles a category off when it is visible', () => {
    const visibleCategories = new Set(['Confirmed', 'Pending', 'Cancelled']);
    toggleCategory(visibleCategories, 'Confirmed');
    expect(visibleCategories.has('Confirmed')).toBe(false);
    expect(visibleCategories.size).toBe(2);
  });

  it('toggles a category back on when it was hidden', () => {
    const visibleCategories = new Set(['Confirmed', 'Pending', 'Cancelled']);
    toggleCategory(visibleCategories, 'Cancelled');
    toggleCategory(visibleCategories, 'Cancelled');
    expect(visibleCategories.has('Cancelled')).toBe(true);
    expect(visibleCategories.size).toBe(3);
  });

  it('can hide all categories one by one', () => {
    const visibleCategories = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    for (const cat of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']) {
      toggleCategory(visibleCategories, cat);
    }
    expect(visibleCategories.size).toBe(0);
  });

  it('can re-show all categories after hiding them all', () => {
    const visibleCategories = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    // Hide all
    for (const cat of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']) {
      toggleCategory(visibleCategories, cat);
    }
    // Show all
    for (const cat of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']) {
      toggleCategory(visibleCategories, cat);
    }
    expect(visibleCategories.size).toBe(8);
  });

  it('does not crash when toggling an unknown category', () => {
    const visibleCategories = new Set(['Confirmed', 'Pending']);
    toggleCategory(visibleCategories, 'UnknownCategory');
    expect(visibleCategories.has('UnknownCategory')).toBe(true);
  });

  it('preserves other categories when toggling one', () => {
    const visibleCategories = new Set(['Confirmed', 'Pending', 'Cancelled']);
    toggleCategory(visibleCategories, 'Confirmed');

    // All other categories should still be visible
    for (const cat of ['Pending', 'Cancelled']) {
      expect(visibleCategories.has(cat)).toBe(true);
    }
  });
});
