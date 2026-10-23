import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mergeIntervals, type Interval } from '../src/intervals';

// Recitation Part 2 (groups) and problem set Task 2.
// Read the spec in src/intervals/mergeIntervals.ts, then check your progress
// with `npm run mutants:intervals`.
//
// Label every property with its pattern, on the line above its `it(`:
//   // Pattern: invariant. The output is sorted.
// (invariant, algebraic, metamorphic, differential, or conditional)

// Construct valid integer intervals, including zero-width intervals.
const interval: fc.Arbitrary<Interval> = fc
  .tuple(fc.integer({ min: -20, max: 20 }), fc.integer({ min: 0, max: 10 }))
  .map(([start, width]) => [start, start + width]);

// Include touching intervals deliberately: random independent endpoints rarely match.
const touchingPair = fc
  .tuple(
    fc.integer({ min: -20, max: 20 }),
    fc.integer({ min: 0, max: 10 }),
    fc.integer({ min: 0, max: 10 }),
  )
  .map(([start, firstWidth, secondWidth]): Interval[] => {
    const shared = start + firstWidth;
    return [[start, shared], [shared, shared + secondWidth]];
  });

const intervalList = fc.oneof(fc.array(interval, { maxLength: 8 }), touchingPair);

// Each new interval starts strictly after the previous one ends.
const disjointIntervals = fc
  .tuple(
    fc.integer({ min: -20, max: 20 }),
    fc.array(
      fc.tuple(fc.integer({ min: 1, max: 5 }), fc.integer({ min: 0, max: 5 })),
      { maxLength: 8 },
    ),
  )
  .map(([firstStart, gapsAndWidths]): Interval[] => {
    let previousEnd = firstStart - 1;
    return gapsAndWidths.map(([gap, width]) => {
      const start = previousEnd + gap;
      const end = start + width;
      previousEnd = end;
      return [start, end];
    });
  });

const covers = (intervals: readonly Interval[], point: number) =>
  intervals.some(([start, end]) => start <= point && point <= end);

describe('mergeIntervals', () => {
  // Pattern: invariant. Every input interval lies inside some output interval.
  it('every input interval lies inside some output interval', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        const uncovered = xs.filter(([s, e]) => !out.some(([a, b]) => a <= s && e <= b));
        expect(uncovered).toEqual([]);
      }),
    );
  });

  // Pattern: invariant. The result is sorted and consecutive intervals neither overlap nor touch.
  it('returns sorted, separated intervals', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        for (let i = 0; i < out.length; i++) {
          expect(out[i][0]).toBeLessThanOrEqual(out[i][1]);
          if (i + 1 < out.length) expect(out[i][1]).toBeLessThan(out[i + 1][0]);
        }
      }),
    );
  });

  // Pattern: invariant. Merging does not modify the input array or its intervals.
  it('does not modify the input', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const original = xs.map(([start, end]): Interval => [start, end]);
        mergeIntervals(xs);
        expect(xs).toEqual(original);
      }),
    );
  });

  // Pattern: differential. Input and output cover exactly the same real points.
  it('preserves coverage at endpoints and between endpoints', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const out = mergeIntervals(xs);
        const endpoints = [...new Set([...xs, ...out].flat())].sort((a, b) => a - b);
        const points = [
          ...endpoints,
          ...endpoints.slice(1).map((end, i) => (endpoints[i] + end) / 2),
        ];
        for (const point of points) expect(covers(out, point)).toBe(covers(xs, point));
      }),
    );
  });

  // Pattern: metamorphic. Reordering and repeating input intervals does not change the result.
  it('is unaffected by order or duplicate intervals', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        expect(mergeIntervals([...xs].reverse().concat(xs))).toEqual(mergeIntervals(xs));
      }),
    );
  });

  // Pattern: algebraic. Merging an already merged list has no further effect.
  it('is idempotent', () => {
    fc.assert(
      fc.property(intervalList, xs => {
        const once = mergeIntervals(xs);
        expect(mergeIntervals(once)).toEqual(once);
      }),
    );
  });

  // Pattern: conditional. Already sorted intervals with gaps remain unchanged.
  it('keeps already disjoint intervals', () => {
    fc.assert(
      fc.property(disjointIntervals, xs => {
        expect(mergeIntervals(xs)).toEqual(xs);
      }),
    );
  });
});
