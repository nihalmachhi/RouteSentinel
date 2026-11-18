/**
 * RouteSentinel detection engine, ported from the Python backend.
 *
 * Mirrors `routesentinel/models.py` (prefix canonicalisation) and
 * `routesentinel/detector.py` (`detect`, `is_bogon`). It is deliberately a
 * straight port: same order of checks, same severities, same confidence rule.
 * Pure functions only, so the simulator and the tests can share it.
 */

export type RoaStatus = 'valid' | 'invalid' | 'unknown';
export type FindingKind =
  | 'unexpected-subprefix'
  | 'unexpected-origin'
  | 'rpki-invalid'
  | 'rpki-unknown'
  | 'long-as-path'
  | 'bogon-prefix';
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type FeedName = 'clean' | 'incident';

export interface Asset {
  prefix: string;
  expectedOrigins: number[];
  anycastOrigins: number[];
  label: string;
}

export interface RouteEvent {
  id: string;
  feed: FeedName;
  timestamp: string;
  prefix: string;
  originAs: number;
  asPath: number[];
  roa: RoaStatus;
}

export interface Finding {
  kind: FindingKind;
  severity: Severity;
  message: string;
}

export interface EventResult {
  event: RouteEvent;
  matchedAsset: Asset | null;
  findings: Finding[];
  confidence: number;
  unsupported: boolean;
}

export interface FeedTotals {
  events: number;
  alerts: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface FeedResult {
  feed: FeedName;
  events: EventResult[];
  totals: FeedTotals;
  byKind: Record<FindingKind, number>;
}

export const MAX_AS_PATH = 32;
export const SUGGESTED_ACTION = 'Review route and RPKI evidence; no action was taken.';
export const UNSUPPORTED_MESSAGE = 'IPv6 is not covered by this demo.';

const SEVERITY_RANK: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const DOCUMENTATION_RANGES: Array<[number, number]> = [
  [parseIPv4('192.0.2.0'), 24],
  [parseIPv4('198.51.100.0'), 24],
  [parseIPv4('203.0.113.0'), 24],
];

const BOGON_RANGES: Array<[number, number]> = [
  [parseIPv4('0.0.0.0'), 8],
  [parseIPv4('10.0.0.0'), 8],
  [parseIPv4('100.64.0.0'), 10],
  [parseIPv4('127.0.0.0'), 8],
  [parseIPv4('169.254.0.0'), 16],
  [parseIPv4('172.16.0.0'), 12],
  [parseIPv4('192.0.0.0'), 24],
  [parseIPv4('192.168.0.0'), 16],
  [parseIPv4('198.18.0.0'), 15],
  [parseIPv4('224.0.0.0'), 4],
  [parseIPv4('240.0.0.0'), 4],
  [parseIPv4('255.255.255.255'), 32],
];

function parseIPv4(address: string): number {
  const parts = address.split('.');
  if (parts.length !== 4) return -1;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return -1;
    if (part.length > 1 && part.startsWith('0')) return -1;
    const octet = Number(part);
    if (octet > 255) return -1;
    value = value * 256 + octet;
  }
  return value >>> 0;
}

function formatIPv4(value: number): string {
  return [value >>> 24, (value >>> 16) & 255, (value >>> 8) & 255, value & 255].join('.');
}

function maskFor(prefixLength: number): number {
  return prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
}

function isSubnetOf(network: number, prefixLength: number, parent: number, parentLength: number) {
  return prefixLength >= parentLength && (network & maskFor(parentLength)) >>> 0 === parent;
}

export interface PrefixInfo {
  canonical: string;
  network: number;
  prefixLength: number;
}

export type PrefixParse =
  | { ok: true; value: PrefixInfo }
  | { ok: false; reason: 'unsupported' | 'invalid'; message: string };

/**
 * Canonicalise an IPv4 prefix the way `ipaddress.ip_network(..., strict=False)`
 * does. IPv6 returns an `unsupported` result instead of throwing, because the
 * backend currently answers an IPv6 event with HTTP 500 (see BACKEND-NOTES.md).
 */
export function parsePrefix(input: string): PrefixParse {
  const text = input.trim();
  if (text.includes(':')) {
    return { ok: false, reason: 'unsupported', message: UNSUPPORTED_MESSAGE };
  }
  const [address, lengthText, extra] = text.split('/');
  if (extra !== undefined || !address) {
    return { ok: false, reason: 'invalid', message: `Invalid prefix: ${input}` };
  }
  const raw = parseIPv4(address);
  if (raw < 0) {
    return { ok: false, reason: 'invalid', message: `Invalid prefix: ${input}` };
  }
  const prefixLength = lengthText === undefined ? 32 : Number(lengthText);
  if (!Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    return { ok: false, reason: 'invalid', message: `Invalid prefix length: ${input}` };
  }
  const network = (raw & maskFor(prefixLength)) >>> 0;
  return {
    ok: true,
    value: { canonical: `${formatIPv4(network)}/${prefixLength}`, network, prefixLength },
  };
}

export function canonicalPrefix(input: string): string | null {
  const parsed = parsePrefix(input);
  return parsed.ok ? parsed.value.canonical : null;
}

/**
 * Mirrors `detector.is_bogon`. Documentation ranges are explicitly allowed
 * first, then RFC1918, loopback, link-local, multicast and reserved space.
 */
export function isBogon(input: string): boolean {
  const parsed = parsePrefix(input);
  if (!parsed.ok) return false;
  const { network, prefixLength } = parsed.value;
  if (DOCUMENTATION_RANGES.some(([parent, length]) => isSubnetOf(network, prefixLength, parent, length))) {
    return false;
  }
  return BOGON_RANGES.some(([parent, length]) => isSubnetOf(network, prefixLength, parent, length));
}

export function severityRank(severity: Severity): number {
  return SEVERITY_RANK[severity];
}

export function atOrAbove(severity: Severity, threshold: Severity): boolean {
  return severityRank(severity) >= severityRank(threshold);
}

function matchAsset(
  network: number,
  prefixLength: number,
  assets: Asset[],
): { asset: Asset; protectedPrefix: PrefixInfo } | null {
  const matches: Array<{ asset: Asset; protectedPrefix: PrefixInfo }> = [];
  for (const asset of assets) {
    const parsed = parsePrefix(asset.prefix);
    if (!parsed.ok) continue;
    if (isSubnetOf(network, prefixLength, parsed.value.network, parsed.value.prefixLength)) {
      matches.push({ asset, protectedPrefix: parsed.value });
    }
  }
  if (matches.length === 0) return null;
  // Least specific wins, exactly like `min(matches, key=prefixlen)`.
  return matches.reduce((best, current) =>
    current.protectedPrefix.prefixLength < best.protectedPrefix.prefixLength ? current : best,
  );
}

function confidenceFor(roa: RoaStatus, originAllowed: boolean): number {
  if (roa === 'invalid') return 0.95;
  if (originAllowed) return 0.82;
  return 0.9;
}

/**
 * Mirrors `detector.detect`. Checks run in a fixed order: more-specific,
 * origin, RPKI, long AS path, bogon. The backend never compares `origin_as`
 * with the tail of `as_path`; neither does this port.
 */
export function detect(event: RouteEvent, assets: Asset[]): Finding[] {
  return evaluateEvent(event, assets).findings;
}

export function evaluateEvent(event: RouteEvent, assets: Asset[]): EventResult {
  const parsed = parsePrefix(event.prefix);
  if (!parsed.ok) {
    return {
      event,
      matchedAsset: null,
      findings: [],
      confidence: 0,
      unsupported: parsed.reason === 'unsupported',
    };
  }
  const match = matchAsset(parsed.value.network, parsed.value.prefixLength, assets);
  if (!match) {
    return { event, matchedAsset: null, findings: [], confidence: 0, unsupported: false };
  }

  const { asset, protectedPrefix } = match;
  const allowed = new Set([...asset.expectedOrigins, ...asset.anycastOrigins]);
  const originAllowed = allowed.has(event.originAs);
  const moreSpecific = parsed.value.prefixLength > protectedPrefix.prefixLength;
  const findings: Finding[] = [];

  if (moreSpecific) {
    findings.push({
      kind: 'unexpected-subprefix',
      severity: 'high',
      message: `${parsed.value.canonical} is more specific than protected ${asset.prefix}`,
    });
  }
  if (!originAllowed) {
    findings.push({
      kind: 'unexpected-origin',
      severity: 'high',
      message: `Origin AS${event.originAs} is not declared for ${asset.prefix}`,
    });
  }
  if (event.roa === 'invalid') {
    findings.push({
      kind: 'rpki-invalid',
      severity: 'critical',
      message: `RPKI status is invalid for ${parsed.value.canonical}`,
    });
  }
  if (event.roa === 'unknown') {
    findings.push({
      kind: 'rpki-unknown',
      severity: 'medium',
      message: `RPKI status is unknown for ${parsed.value.canonical}`,
    });
  }
  if (event.asPath.length > MAX_AS_PATH) {
    findings.push({
      kind: 'long-as-path',
      severity: 'medium',
      message: `AS path has ${event.asPath.length} hops (limit ${MAX_AS_PATH})`,
    });
  }
  if (isBogon(parsed.value.canonical)) {
    findings.push({
      kind: 'bogon-prefix',
      severity: 'high',
      message: `${parsed.value.canonical} is in a bogon range`,
    });
  }

  return {
    event,
    matchedAsset: asset,
    findings,
    confidence: confidenceFor(event.roa, originAllowed),
    unsupported: false,
  };
}

export function emptyTotals(): FeedTotals {
  return { events: 0, alerts: 0, critical: 0, high: 0, medium: 0, low: 0 };
}

export function emptyByKind(): Record<FindingKind, number> {
  return {
    'unexpected-subprefix': 0,
    'unexpected-origin': 0,
    'rpki-invalid': 0,
    'rpki-unknown': 0,
    'long-as-path': 0,
    'bogon-prefix': 0,
  };
}

/** Evaluate every event in one feed and aggregate the totals the UI shows. */
export function runFeed(
  events: RouteEvent[],
  assets: Asset[],
  feed: FeedName = 'incident',
): FeedResult {
  const results = events.map((event) => evaluateEvent(event, assets));
  const totals = emptyTotals();
  const byKind = emptyByKind();
  totals.events = results.length;
  for (const result of results) {
    for (const finding of result.findings) {
      totals.alerts += 1;
      totals[finding.severity] += 1;
      byKind[finding.kind] += 1;
    }
  }
  return { feed, events: results, totals, byKind };
}

export function findingTone(severity: Severity): 'ok' | 'no' | 'mu' {
  if (severity === 'critical' || severity === 'high') return 'no';
  if (severity === 'medium') return 'mu';
  return 'ok';
}
