import type { FindingKind, Severity } from './engine';

export function formatAsPath(path: number[]): string {
  return path.map((asn) => `AS${asn}`).join(' → ');
}

export function formatAsPathPlain(path: number[]): string {
  return path.join(' → ');
}

export function formatCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function formatConfidence(value: number): string {
  return value.toFixed(2);
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
};

export const KIND_LABEL: Record<FindingKind, string> = {
  'unexpected-subprefix': 'unexpected-subprefix',
  'unexpected-origin': 'unexpected-origin',
  'rpki-invalid': 'rpki-invalid',
  'rpki-unknown': 'rpki-unknown',
  'long-as-path': 'long-as-path',
  'bogon-prefix': 'bogon-prefix',
};

export function formatTimestamp(timestamp: string): string {
  return timestamp.replace('T', ' ').replace('Z', ' UTC');
}
