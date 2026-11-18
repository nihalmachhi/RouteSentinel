/**
 * Shared test data for the simulator and the test suite.
 *
 * Every value here is synthetic. Prefixes are RFC 5737 documentation ranges or
 * RFC 1918 private space, and ASNs are documentation values, so nothing points
 * at a real network. Expected outputs live next to the inputs so a learner can
 * read the fixture and then watch `lib/engine.ts` reproduce it.
 */
import type { Asset, FeedName, FindingKind, RouteEvent, Severity } from '../lib/engine';

export const ASSETS: Asset[] = [
  {
    prefix: '203.0.113.0/24',
    expectedOrigins: [64500],
    anycastOrigins: [64501],
    label: 'Documentation prefix demo',
  },
  {
    prefix: '10.20.0.0/16',
    expectedOrigins: [64500],
    anycastOrigins: [],
    label: 'Private range (bogon demo)',
  },
];

const filler = Array.from({ length: 32 }, (_, index) => 65001 + index);

/**
 * Eight offline events. The three clean ones are listed first because that is
 * how the feed is replayed; the incident feed carries the other five.
 */
export const EVENTS: RouteEvent[] = [
  {
    id: 'E1',
    feed: 'clean',
    timestamp: '2026-01-01T00:00:01Z',
    prefix: '203.0.113.0/24',
    originAs: 64500,
    asPath: [64496, 64500],
    roa: 'valid',
  },
  {
    id: 'E2',
    feed: 'clean',
    timestamp: '2026-01-01T00:00:02Z',
    prefix: '203.0.113.0/24',
    originAs: 64501,
    asPath: [64496, 64501],
    roa: 'valid',
  },
  {
    id: 'E7',
    feed: 'clean',
    timestamp: '2026-01-01T00:00:07Z',
    prefix: '198.51.100.0/24',
    originAs: 64500,
    asPath: [64496, 64500],
    roa: 'valid',
  },
  {
    id: 'E3',
    feed: 'incident',
    timestamp: '2026-01-01T00:00:03Z',
    prefix: '203.0.113.0/24',
    originAs: 64666,
    asPath: [64496, 64666],
    roa: 'invalid',
  },
  {
    id: 'E4',
    feed: 'incident',
    timestamp: '2026-01-01T00:00:04Z',
    prefix: '203.0.113.128/25',
    originAs: 64666,
    asPath: [64496, 64666],
    roa: 'unknown',
  },
  {
    id: 'E5',
    feed: 'incident',
    timestamp: '2026-01-01T00:00:05Z',
    prefix: '203.0.113.0/24',
    originAs: 64500,
    asPath: [64496, 64500],
    roa: 'unknown',
  },
  {
    id: 'E6',
    feed: 'incident',
    timestamp: '2026-01-01T00:00:06Z',
    prefix: '203.0.113.0/24',
    originAs: 64500,
    asPath: [...filler, 64500],
    roa: 'valid',
  },
  {
    id: 'E8',
    feed: 'incident',
    timestamp: '2026-01-01T00:00:08Z',
    prefix: '10.20.0.0/16',
    originAs: 64500,
    asPath: [64496, 64500],
    roa: 'valid',
  },
];

export const CLEAN_EVENTS = EVENTS.filter((event) => event.feed === 'clean');
export const INCIDENT_EVENTS = EVENTS.filter((event) => event.feed === 'incident');

export const FEED_LABEL = 'offline-fixture';

export interface ExpectedEvent {
  id: string;
  kinds: FindingKind[];
  severities: Severity[];
  confidence: number;
}

/**
 * The exact expectations pinned by the backend test suite. Keep these aligned
 * with `routesentinel/tests/test_detector.py`; do not loosen them to make a
 * component test pass.
 */
export const EXPECTED: ExpectedEvent[] = [
  { id: 'E1', kinds: [], severities: [], confidence: 0.82 },
  { id: 'E2', kinds: [], severities: [], confidence: 0.82 },
  { id: 'E7', kinds: [], severities: [], confidence: 0 },
  {
    id: 'E3',
    kinds: ['unexpected-origin', 'rpki-invalid'],
    severities: ['high', 'critical'],
    confidence: 0.95,
  },
  {
    id: 'E4',
    kinds: ['unexpected-subprefix', 'unexpected-origin', 'rpki-unknown'],
    severities: ['high', 'high', 'medium'],
    confidence: 0.9,
  },
  { id: 'E5', kinds: ['rpki-unknown'], severities: ['medium'], confidence: 0.82 },
  { id: 'E6', kinds: ['long-as-path'], severities: ['medium'], confidence: 0.82 },
  { id: 'E8', kinds: ['bogon-prefix'], severities: ['high'], confidence: 0.82 },
];

/** A clean feed total and an incident feed total, used by the Results section. */
export const EXPECTED_TOTALS = {
  clean: { events: 3, alerts: 0, critical: 0, high: 0, medium: 0, low: 0 },
  incident: { events: 5, alerts: 8, critical: 1, high: 4, medium: 3, low: 0 },
} as const;

/** Finding counts per kind across the incident feed. */
export const EXPECTED_BY_KIND: Record<FindingKind, number> = {
  'unexpected-subprefix': 1,
  'unexpected-origin': 2,
  'rpki-invalid': 1,
  'rpki-unknown': 2,
  'long-as-path': 1,
  'bogon-prefix': 1,
};

/** Two assets where both contain the event, so least-specific matching is visible. */
export const NESTED_ASSETS: Asset[] = [
  {
    prefix: '203.0.0.0/16',
    expectedOrigins: [64500],
    anycastOrigins: [],
    label: 'Outer /16',
  },
  {
    prefix: '203.0.113.0/24',
    expectedOrigins: [64500],
    anycastOrigins: [],
    label: 'Inner /24',
  },
];

export function eventsForFeed(feed: FeedName): RouteEvent[] {
  return EVENTS.filter((event) => event.feed === feed);
}
