/**
 * WHAT YOU WILL LEARN
 * - How the Python detector's check order becomes a TypeScript function.
 * - Which events alert, with which severity, and why confidence is per event.
 * - Where the backend is intentionally limited: no AS-path/origin cross-check
 *   and no de-duplication of replayed events.
 */
import { describe, expect, it } from 'vitest';
import {
  ASSETS,
  CLEAN_EVENTS,
  EVENTS,
  EXPECTED,
  EXPECTED_BY_KIND,
  EXPECTED_TOTALS,
  INCIDENT_EVENTS,
  NESTED_ASSETS,
} from '../data/fixtures';
import {
  atOrAbove,
  canonicalPrefix,
  detect,
  evaluateEvent,
  findingTone,
  isBogon,
  parsePrefix,
  runFeed,
  severityRank,
  type RouteEvent,
} from '../lib/engine';

const byId = new Map(EVENTS.map((event) => [event.id, event]));

function fixture(id: string): RouteEvent {
  const event = byId.get(id);
  if (!event) throw new Error(`Unknown fixture ${id}`);
  return event;
}

describe('detect over the shared fixtures', () => {
  it('does not alert on a declared expected origin (E1)', () => {
    expect(detect(fixture('E1'), ASSETS)).toEqual([]);
  });

  it('does not alert on a declared anycast origin (E2)', () => {
    expect(detect(fixture('E2'), ASSETS)).toEqual([]);
  });

  it('ignores an event that no protected asset contains (E7)', () => {
    expect(detect(fixture('E7'), ASSETS)).toEqual([]);
    expect(evaluateEvent(fixture('E7'), ASSETS).matchedAsset).toBeNull();
  });

  it('flags an unexpected origin and invalid RPKI as high and critical (E3)', () => {
    const result = evaluateEvent(fixture('E3'), ASSETS);
    expect(result.findings.map((finding) => finding.kind)).toEqual([
      'unexpected-origin',
      'rpki-invalid',
    ]);
    expect(result.findings.map((finding) => finding.severity)).toEqual(['high', 'critical']);
    expect(result.confidence).toBe(0.95);
  });

  it('flags a more-specific announcement with three findings (E4)', () => {
    const result = evaluateEvent(fixture('E4'), ASSETS);
    expect(result.findings.map((finding) => finding.kind)).toEqual([
      'unexpected-subprefix',
      'unexpected-origin',
      'rpki-unknown',
    ]);
    expect(result.findings.map((finding) => finding.severity)).toEqual([
      'high',
      'high',
      'medium',
    ]);
    expect(result.confidence).toBe(0.9);
  });

  it('reports unknown RPKI on an otherwise valid origin as medium (E5)', () => {
    const result = evaluateEvent(fixture('E5'), ASSETS);
    expect(result.findings.map((finding) => finding.kind)).toEqual(['rpki-unknown']);
    expect(result.findings[0]?.severity).toBe('medium');
    expect(result.confidence).toBe(0.82);
  });

  it('flags an AS path longer than 32 hops (E6)', () => {
    const result = evaluateEvent(fixture('E6'), ASSETS);
    expect(result.findings.map((finding) => finding.kind)).toEqual(['long-as-path']);
    expect(fixture('E6').asPath).toHaveLength(33);
  });

  it('does not flag a 32-hop AS path, only a 33-hop one', () => {
    const base = fixture('E1');
    const thirtyTwo = Array.from({ length: 31 }, (_, index) => 65001 + index).concat(64500);
    const thirtyThree = Array.from({ length: 32 }, (_, index) => 65001 + index).concat(64500);
    expect(thirtyTwo).toHaveLength(32);
    expect(thirtyThree).toHaveLength(33);
    expect(detect({ ...base, asPath: thirtyTwo }, ASSETS)).toEqual([]);
    expect(detect({ ...base, asPath: thirtyThree }, ASSETS).map((finding) => finding.kind)).toEqual(
      ['long-as-path'],
    );
  });

  it('flags the private range as a bogon (E8)', () => {
    expect(detect(fixture('E8'), ASSETS).map((finding) => finding.kind)).toEqual(['bogon-prefix']);
  });

  it('matches every pinned expectation in the fixture table', () => {
    for (const expected of EXPECTED) {
      const result = evaluateEvent(fixture(expected.id), ASSETS);
      expect(result.findings.map((finding) => finding.kind), expected.id).toEqual(expected.kinds);
      expect(
        result.findings.map((finding) => finding.severity),
        expected.id,
      ).toEqual(expected.severities);
      expect(result.confidence, expected.id).toBe(expected.confidence);
    }
  });
});

describe('feed totals', () => {
  it('counts 8 alerts as 1 critical, 4 high and 3 medium on the incident feed', () => {
    const incident = runFeed(INCIDENT_EVENTS, ASSETS, 'incident');
    expect(incident.totals).toEqual(EXPECTED_TOTALS.incident);
    expect(incident.totals.alerts).toBe(
      incident.totals.critical + incident.totals.high + incident.totals.medium,
    );
  });

  it('reports no alerts on the clean feed', () => {
    const clean = runFeed(CLEAN_EVENTS, ASSETS, 'clean');
    expect(clean.totals).toEqual(EXPECTED_TOTALS.clean);
  });

  it('counts each finding kind across the incident feed', () => {
    expect(runFeed(INCIDENT_EVENTS, ASSETS, 'incident').byKind).toEqual(EXPECTED_BY_KIND);
  });
});

describe('bogon classification', () => {
  it('treats documentation ranges as public', () => {
    expect(isBogon('203.0.113.0/24')).toBe(false);
    expect(isBogon('198.51.100.0/24')).toBe(false);
    expect(isBogon('192.0.2.0/24')).toBe(false);
    expect(isBogon('8.8.8.0/24')).toBe(false);
  });

  it('treats private, loopback and multicast space as bogons', () => {
    expect(isBogon('10.20.0.0/16')).toBe(true);
    expect(isBogon('127.0.0.0/8')).toBe(true);
    expect(isBogon('224.0.0.0/4')).toBe(true);
    expect(isBogon('192.168.1.0/24')).toBe(true);
  });
});

describe('prefix canonicalisation', () => {
  it('clears host bits the way the backend does', () => {
    expect(canonicalPrefix('203.0.113.5/24')).toBe('203.0.113.0/24');
    expect(canonicalPrefix('203.0.113.5')).toBe('203.0.113.5/32');
  });

  it('returns unsupported for IPv6 instead of throwing', () => {
    const parsed = parsePrefix('2001:db8::/32');
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.reason).toBe('unsupported');
      expect(parsed.message).toContain('IPv6');
    }
    expect(detect({ ...fixture('E1'), prefix: '2001:db8::/32' }, ASSETS)).toEqual([]);
  });

  it('rejects malformed prefixes', () => {
    expect(canonicalPrefix('not-a-prefix')).toBeNull();
    expect(canonicalPrefix('203.0.113.0/33')).toBeNull();
    expect(parsePrefix('203.0.113.0/24/extra').ok).toBe(false);
  });
});

describe('least-specific matching', () => {
  it('chooses the broader asset when two assets contain the event', () => {
    const result = evaluateEvent({ ...fixture('E4'), prefix: '203.0.113.128/25' }, NESTED_ASSETS);
    expect(result.matchedAsset?.prefix).toBe('203.0.0.0/16');
    expect(result.findings.map((finding) => finding.kind)).toEqual([
      'unexpected-subprefix',
      'unexpected-origin',
      'rpki-unknown',
    ]);
  });
});

describe('severity helpers', () => {
  it('orders severities from low to critical', () => {
    expect(severityRank('critical')).toBeGreaterThan(severityRank('high'));
    expect(severityRank('high')).toBeGreaterThan(severityRank('medium'));
    expect(severityRank('medium')).toBeGreaterThan(severityRank('low'));
  });

  it('filters findings at or above a threshold', () => {
    expect(atOrAbove('critical', 'medium')).toBe(true);
    expect(atOrAbove('medium', 'medium')).toBe(true);
    expect(atOrAbove('low', 'medium')).toBe(false);
  });

  it('maps severities to the three UI tones', () => {
    expect(findingTone('critical')).toBe('no');
    expect(findingTone('high')).toBe('no');
    expect(findingTone('medium')).toBe('mu');
    expect(findingTone('low')).toBe('ok');
  });
});

describe('known limitations', () => {
  it('does not compare origin_as with the tail of as_path', () => {
    const mismatched: RouteEvent = {
      ...fixture('E1'),
      originAs: 64500,
      asPath: [64496, 64666],
      roa: 'valid',
    };
    expect(detect(mismatched, ASSETS)).toEqual([]);
  });

  it('counts a duplicate replay twice because the backend does not de-duplicate', () => {
    const duplicate = runFeed([fixture('E3'), fixture('E3')], ASSETS, 'incident');
    expect(duplicate.totals.events).toBe(2);
    expect(duplicate.totals.alerts).toBe(4);
  });
});
