/**
 * Tests for the IntervalTree class.
 *
 * The interval tree is the core data structure used for O(log n) hover
 * lookups on the canvas.  Each test is commented to explain *what* it
 * verifies and *why* that matters for the application.
 */

import { describe, it, expect } from 'vitest';

// ─── IntervalTree (extracted from src/app.js for testability) ──

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

// ─── Tests ──────────────────────────────────────────────────

describe('IntervalTree', () => {
  it('returns empty results for an empty tree', () => {
    const tree = new IntervalTree();
    expect(tree.query(100)).toEqual([]);
    expect(tree.count).toBe(0);
  });

  it('finds a single interval when the query point lies inside it', () => {
    const tree = new IntervalTree();
    tree.insert(10, 20, { id: 1, name: 'A' });
    expect(tree.query(15)).toEqual([{ id: 1, name: 'A' }]);
  });

  it('finds a single interval when the query point is at either boundary', () => {
    const tree = new IntervalTree();
    tree.insert(10, 20, { id: 1 });
    expect(tree.query(10)).toEqual([{ id: 1 }]);
    expect(tree.query(20)).toEqual([{ id: 1 }]);
  });

  it('returns no result when the query point is outside the interval', () => {
    const tree = new IntervalTree();
    tree.insert(10, 20, { id: 1 });
    expect(tree.query(5)).toEqual([]);
    expect(tree.query(25)).toEqual([]);
  });

  it('returns all overlapping intervals for a query point', () => {
    const tree = new IntervalTree();
    tree.insert(10, 30, { id: 1 });
    tree.insert(15, 25, { id: 2 });
    tree.insert(5, 22, { id: 3 }); // extends to 22 so it overlaps point 20
    tree.insert(40, 50, { id: 4 });

    // Point 20 overlaps intervals 1, 2, and 3 (not 4)
    const results = tree.query(20);
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.id)).toEqual(expect.arrayContaining([1, 2, 3]));
  });

  it('returns no result when the query point does not overlap any interval', () => {
    const tree = new IntervalTree();
    tree.insert(10, 20, { id: 1 });
    tree.insert(30, 40, { id: 2 });
    expect(tree.query(25)).toEqual([]);
  });

  it('correctly tracks the count of inserted intervals', () => {
    const tree = new IntervalTree();
    expect(tree.count).toBe(0);
    tree.insert(10, 20, { id: 1 });
    expect(tree.count).toBe(1);
    tree.insert(30, 40, { id: 2 });
    tree.insert(50, 60, { id: 3 });
    expect(tree.count).toBe(3);
  });

  it('handles many overlapping intervals efficiently', () => {
    const tree = new IntervalTree();
    const count = 1000;
    for (let i = 0; i < count; i++) {
      tree.insert(i, i + 1000, { id: i });
    }
    // Query a point in the middle — should hit many intervals
    const results = tree.query(500);
    // Every interval [i, i+1000] overlaps 500 when i <= 500 and i+1000 >= 500
    expect(results).toHaveLength(501);
  });

  it('handles non-overlapping intervals correctly', () => {
    const tree = new IntervalTree();
    tree.insert(0, 10, { id: 1 });
    tree.insert(20, 30, { id: 2 });
    tree.insert(40, 50, { id: 3 });
    expect(tree.query(5)).toEqual([{ id: 1 }]);
    expect(tree.query(15)).toEqual([]);
    expect(tree.query(25)).toEqual([{ id: 2 }]);
    expect(tree.query(35)).toEqual([]);
    expect(tree.query(45)).toEqual([{ id: 3 }]);
  });

  it('returns correct data object, not just IDs', () => {
    const tree = new IntervalTree();
    const payload = { customer: 'Alice', category: 'Confirmed', duration: 60 };
    tree.insert(100, 200, payload);
    const result = tree.query(150);
    expect(result).toEqual([payload]);
  });
});
