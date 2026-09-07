/**
 * Tests for the legend toggle logic.
 *
 * The legend allows users to toggle individual category visibility.
 * These tests verify the add/delete behavior on the visibleCategories
 * Set.
 */

import { describe, it, expect } from 'vitest';

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
  it('starts with all categories visible', () => {
    const visibleCategories = new Set(CATEGORIES.map((c) => c.name));
    expect(visibleCategories.size).toBe(CATEGORIES.length);
  });

  it('toggles a category off when it is visible', () => {
    const visibleCategories = new Set(CATEGORIES.map((c) => c.name));
    toggleCategory(visibleCategories, 'Confirmed');
    expect(visibleCategories.has('Confirmed')).toBe(false);
    expect(visibleCategories.size).toBe(CATEGORIES.length - 1);
  });

  it('toggles a category back on when it was hidden', () => {
    const visibleCategories = new Set(CATEGORIES.map((c) => c.name));
    toggleCategory(visibleCategories, 'Cancelled');
    toggleCategory(visibleCategories, 'Cancelled');
    expect(visibleCategories.has('Cancelled')).toBe(true);
    expect(visibleCategories.size).toBe(CATEGORIES.length);
  });

  it('can hide all categories one by one', () => {
    const visibleCategories = new Set(CATEGORIES.map((c) => c.name));
    for (const cat of CATEGORIES) {
      toggleCategory(visibleCategories, cat.name);
    }
    expect(visibleCategories.size).toBe(0);
  });

  it('can re-show all categories after hiding them all', () => {
    const visibleCategories = new Set(CATEGORIES.map((c) => c.name));
    // Hide all
    for (const cat of CATEGORIES) {
      toggleCategory(visibleCategories, cat.name);
    }
    // Show all
    for (const cat of CATEGORIES) {
      toggleCategory(visibleCategories, cat.name);
    }
    expect(visibleCategories.size).toBe(CATEGORIES.length);
  });

  it('does not crash when toggling an unknown category', () => {
    const visibleCategories = new Set(['Confirmed', 'Pending']);
    toggleCategory(visibleCategories, 'UnknownCategory');
    expect(visibleCategories.has('UnknownCategory')).toBe(true);
  });

  it('preserves other categories when toggling one', () => {
    const visibleCategories = new Set(CATEGORIES.map((c) => c.name));
    toggleCategory(visibleCategories, 'Confirmed');

    // All other categories should still be visible
    for (const cat of CATEGORIES) {
      if (cat.name !== 'Confirmed') {
        expect(visibleCategories.has(cat.name)).toBe(true);
      }
    }
  });
});
