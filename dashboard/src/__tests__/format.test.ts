/**
 * WHAT YOU WILL LEARN
 * - Formatting is a tiny, testable boundary between the engine and the UI.
 * - Why timestamps and counts get their own helpers instead of inline strings.
 */
import { describe, expect, it } from 'vitest';
import {
  formatAsPath,
  formatAsPathPlain,
  formatConfidence,
  formatCount,
  formatPercent,
  formatTimestamp,
} from '../lib/format';

describe('format helpers', () => {
  it('prefixes AS numbers in a path', () => {
    expect(formatAsPath([64496, 64500])).toBe('AS64496 → AS64500');
    expect(formatAsPathPlain([64496, 64500])).toBe('64496 → 64500');
  });

  it('pluralises counts', () => {
    expect(formatCount(1, 'alert')).toBe('1 alert');
    expect(formatCount(2, 'alert')).toBe('2 alerts');
    expect(formatCount(0, 'finding')).toBe('0 findings');
  });

  it('renders confidence and percentages', () => {
    expect(formatConfidence(0.9)).toBe('0.90');
    expect(formatConfidence(0.95)).toBe('0.95');
    expect(formatPercent(0.375)).toBe('38%');
    expect(formatPercent(1)).toBe('100%');
  });

  it('turns an ISO timestamp into a readable UTC label', () => {
    expect(formatTimestamp('2026-01-01T00:00:04Z')).toBe('2026-01-01 00:00:04 UTC');
  });
});
