/**
 * WHAT YOU WILL LEARN
 * - What the shared fixtures contain and why every event has a stable id.
 * - How the expected totals are derived from the same engine the UI uses.
 * - Why the demo data is safe: documentation and private ranges only.
 */
import { describe, expect, it } from 'vitest';
import {
  ASSETS,
  CLEAN_EVENTS,
  EVENTS,
  EXPECTED,
  EXPECTED_BY_KIND,
  EXPECTED_TOTALS,
  FEED_LABEL,
  INCIDENT_EVENTS,
} from '../data/fixtures';
import { canonicalPrefix, isBogon, runFeed } from '../lib/engine';

describe('fixture shape', () => {
  it('has eight events split into three clean and five incident', () => {
    expect(EVENTS).toHaveLength(8);
    expect(CLEAN_EVENTS).toHaveLength(3);
    expect(INCIDENT_EVENTS).toHaveLength(5);
  });

  it('gives every event a unique id', () => {
    const ids = EVENTS.map((event) => event.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps timestamps in UTC and aligned with the event number', () => {
    for (const event of EVENTS) {
      expect(event.timestamp).toMatch(/^2026-01-01T00:00:0[1-8]Z$/);
      expect(new Date(event.timestamp).getUTCSeconds()).toBe(Number(event.id.slice(1)));
    }
  });

  it('uses a 33-hop path for the long-path fixture', () => {
    const longPath = EVENTS.find((event) => event.id === 'E6');
    expect(longPath?.asPath).toHaveLength(33);
    expect(longPath?.asPath.at(-1)).toBe(64500);
  });

  it('labels the demo feed', () => {
    expect(FEED_LABEL).toBe('offline-fixture');
  });
});

describe('assets and safety', () => {
  it('uses a documentation prefix and a private range', () => {
    expect(ASSETS.map((asset) => canonicalPrefix(asset.prefix))).toEqual([
      '203.0.113.0/24',
      '10.20.0.0/16',
    ]);
    expect(isBogon(ASSETS[0].prefix)).toBe(false);
    expect(isBogon(ASSETS[1].prefix)).toBe(true);
  });

  it('declares an expected origin and one anycast origin', () => {
    expect(ASSETS[0].expectedOrigins).toEqual([64500]);
    expect(ASSETS[0].anycastOrigins).toEqual([64501]);
    expect(ASSETS[1].anycastOrigins).toEqual([]);
  });
});

describe('expected outputs stay in sync with the engine', () => {
  it('covers every event exactly once', () => {
    expect(EXPECTED.map((item) => item.id).sort()).toEqual(
      EVENTS.map((event) => event.id).sort(),
    );
  });

  it('matches the clean and incident totals', () => {
    expect(runFeed(CLEAN_EVENTS, ASSETS, 'clean').totals).toEqual(EXPECTED_TOTALS.clean);
    expect(runFeed(INCIDENT_EVENTS, ASSETS, 'incident').totals).toEqual(
      EXPECTED_TOTALS.incident,
    );
  });

  it('matches the per-kind counts', () => {
    expect(runFeed(INCIDENT_EVENTS, ASSETS, 'incident').byKind).toEqual(EXPECTED_BY_KIND);
  });
});
