/**
 * All visible copy for the site. Components only render these values, so the
 * text can be edited without touching JSX. Numbers that can be derived from
 * the fixtures are derived in the components and tests instead of being
 * duplicated here.
 */
import type { IconName } from '../components/Icon';

export interface LinkCta {
  label: string;
  href: string;
  variant: 'w' | 'plain';
  external?: boolean;
}

export interface SectionHeading {
  lead: string;
  icon: IconName;
  color: string;
  trail: string;
}

export interface MiniSeg {
  label: string;
  flex: number;
  color: string;
}

export type StepMini =
  | { kind: 'lines'; lines: string[] }
  | { kind: 'dots'; dots: Array<'ok' | 'bad'>; line: string }
  | { kind: 'seg'; segments: MiniSeg[]; note: string };

export interface PipelineStep {
  title: string;
  body: string;
  icon: IconName;
  color: string;
  mini: StepMini;
}

export interface BentoCard {
  title: string;
  body: string;
  icon: IconName;
  color: string;
  size: 'normal' | 'wide' | 'full';
  mini?: string[];
  tags?: string[];
}

export interface QuickStep {
  title: string;
  body: string;
  code: Array<{ text: string; comment?: boolean }>;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FooterColumn {
  title: string;
  links: Array<{ label: string; href: string; external?: boolean }>;
}

export const SITE = {
  name: 'RouteSentinel',
  repo: 'https://github.com/nihalmachhi/RouteSentinel',
  docs: 'https://github.com/nihalmachhi/RouteSentinel/tree/main/docs',
  source: 'https://github.com/nihalmachhi/RouteSentinel/tree/main/routesentinel',
  issues: 'https://github.com/nihalmachhi/RouteSentinel/issues',
  tagline: 'A local, synthetic BGP route-integrity replay for protected prefixes.',
  disclaimer:
    'Synthetic demo. Prefixes and ASNs are documentation or private values, not live routing data.',
  stack: 'Python · SQLite · JSON',
};

export const NAV_LINKS = [
  { label: 'Pipeline', href: '#how' },
  { label: 'Try it', href: '#try' },
  { label: 'Results', href: '#results' },
  { label: 'Features', href: '#features' },
  { label: 'Quick start', href: '#start' },
  { label: 'FAQ', href: '#faq' },
];

export const HERO = {
  h1: 'Know when someone else announces your prefix.',
  p: 'RouteSentinel replays BGP route observations against the prefixes you protect, flags unexpected origins, more-specific announcements, invalid RPKI status, long AS paths and bogon ranges, and keeps the evidence for each alert. Offline and read-only.',
  ctas: [
    { label: 'Run it locally', href: '#start', variant: 'w' },
    { label: 'View on GitHub', href: SITE.repo, variant: 'plain', external: true },
  ] as LinkCta[],
};

export const HEADINGS = {
  how: {
    lead: 'Three steps.',
    icon: 'check',
    color: '#22c55e',
    trail: 'One regression trail.',
  },
  try: {
    lead: 'Replay the feeds.',
    icon: 'alert',
    color: '#f59e0b',
    trail: 'Watch the detector decide.',
  },
  results: {
    lead: 'Two feeds.',
    icon: 'bars',
    color: '#06b6d4',
    trail: 'Same eight events.',
  },
  features: {
    lead: 'A small detector.',
    icon: 'cube',
    color: '#8b5cf6',
    trail: 'Built to be inspected.',
  },
  start: {
    lead: 'One minute',
    icon: 'bars',
    color: '#22c55e',
    trail: 'to a replay.',
  },
  scope: {
    lead: 'Built to',
    icon: 'lightbulb',
    color: '#f97316',
    trail: 'teach.',
  },
  faq: {
    lead: 'Any',
    icon: 'question',
    color: '#ec4899',
    trail: 'questions?',
  },
  cta: {
    lead: 'Replay it.',
    icon: 'alert',
    color: '#ef4444',
    trail: 'Watch the alert appear.',
  },
} satisfies Record<string, SectionHeading>;

export const HOW_LEAD =
  'Every event is validated, matched to one protected prefix, and checked in the same order as the Python detector.';

export const STEPS: PipelineStep[] = [
  {
    title: '1. Validate',
    body: 'Each event is checked for a valid prefix, origin AS, AS path and RPKI status before anything runs.',
    icon: 'check',
    color: '#8b5cf6',
    mini: { kind: 'lines', lines: ['event › prefix · origin · path · roa'] },
  },
  {
    title: '2. Match',
    body: 'The event is matched to the least-specific protected prefix that contains it, using the asset’s expected and anycast origins.',
    icon: 'shield',
    color: '#f59e0b',
    mini: { kind: 'lines', lines: ['203.0.113.128/25 ⊂ 203.0.113.0/24'] },
  },
  {
    title: '3. Detect',
    body: 'Up to six finding types are raised, each with severity, confidence and the observed evidence.',
    icon: 'bars',
    color: '#f97316',
    mini: {
      kind: 'seg',
      segments: [
        { label: 'critical', flex: 1, color: '#ff7a45' },
        { label: 'high', flex: 2, color: '#fbbf24' },
        { label: 'medium', flex: 1.5, color: '#a78bfa' },
      ],
      note: 'severity is stored on every finding',
    },
  },
];

export const TRY_LEAD =
  'Replay a clean feed and an incident feed against two protected prefixes. Pick any event to see why it did or did not alert. It runs in your browser with the same checks as the Python detector.';

export const RESULTS_LEAD = 'Both feeds replay the same eight synthetic events. Figures are computed from the shared fixtures.';

export const RESULTS_NOTE =
  'Prefixes and ASNs are documentation or private values. Confidence is a fixed number per event, not a calibrated probability, and detection trusts the origin_as field supplied with each event.';

export const BENTO: BentoCard[] = [
  {
    title: 'Six finding types',
    body: 'More-specific announcement, unexpected origin, invalid RPKI, unknown RPKI, long AS path and bogon range.',
    icon: 'shield',
    color: '#8b5cf6',
    size: 'wide',
    tags: [
      'unexpected-subprefix',
      'unexpected-origin',
      'rpki-invalid',
      'rpki-unknown',
      'long-as-path',
      'bogon-prefix',
    ],
  },
  {
    title: 'Offline-only replay',
    body: 'A JSON replay endpoint is the only way events enter the detector. There is no live session to configure.',
    icon: 'code',
    color: '#f97316',
    size: 'wide',
    mini: [
      'GET  /api/v1/assets',
      'POST /api/v1/assets',
      'POST /api/v1/replay',
      'GET  /api/v1/routes',
      'GET  /api/v1/alerts',
      'POST /api/v1/alerts/{id}/feedback',
      'GET  /api/v1/graph/{prefix}',
    ],
  },
  {
    title: 'Roles: viewer, operator, admin',
    body: 'Read endpoints need a viewer token; writes need operator or admin. The defaults are demo tokens.',
    icon: 'key',
    color: '#f59e0b',
    size: 'normal',
    tags: ['viewer', 'operator', 'admin'],
  },
  {
    title: 'Evidence-linked alerts',
    body: 'Every alert keeps the prefix, origin, AS path, ROA status, feed and timestamp that produced it.',
    icon: 'link',
    color: '#22c55e',
    size: 'normal',
    tags: ['prefix', 'origin', 'as_path', 'roa_status'],
  },
  {
    title: 'Canonical prefixes',
    body: 'Host bits are cleared before matching, so a sloppy input still compares against the right network.',
    icon: 'filter',
    color: '#06b6d4',
    size: 'normal',
    mini: ['203.0.113.5/24 → 203.0.113.0/24'],
  },
  {
    title: 'SQLite storage',
    body: 'Assets, routes, alerts and feedback live in one local file under data/, which Git ignores.',
    icon: 'database',
    color: '#ec4899',
    size: 'wide',
    tags: ['assets', 'routes', 'alerts', 'feedback'],
  },
  {
    title: 'Review suggestion only',
    body: 'The alert suggests a review action. Nothing is announced, withdrawn or changed on a device.',
    icon: 'lock',
    color: '#ef4444',
    size: 'wide',
    mini: ['suggested action: review route and RPKI evidence'],
  },
  {
    title: 'Not in this release',
    body: 'Live RIS/MRT feeds, BGP sessions, route announcements or withdrawals, automated mitigation, IPv6 coverage in the demo and alert de-duplication are out of scope.',
    icon: 'x',
    color: '#22c55e',
    size: 'full',
    tags: [
      'live feeds',
      'BGP sessions',
      'announcements',
      'mitigation',
      'IPv6 demo',
      'de-duplication',
    ],
  },
];

export const QUICK_STEPS: QuickStep[] = [
  {
    title: '1. Set up',
    body: 'Install the Python dependencies and copy the demo token file.',
    code: [
      { text: 'uv sync --extra dev' },
      { text: 'Copy-Item .env.example .env' },
      { text: '# replace the demo tokens before any real use', comment: true },
    ],
  },
  {
    title: '2. Run the API',
    body: 'Start the loopback service and open the generated docs.',
    code: [
      { text: 'uv run python -m routesentinel' },
      { text: '# 127.0.0.1:8020/docs', comment: true },
    ],
  },
  {
    title: '3. Replay an event',
    body: 'Add the demo asset, then post one invalid-origin event.',
    code: [
      { text: '$h = @{ Authorization = "Bearer local-operator-token" }' },
      { text: '$asset = @{ prefix="203.0.113.0/24"; expected_origins=@(64500);' },
      { text: '  anycast_origins=@(64501); label="Demo" }' },
      { text: 'Invoke-RestMethod -Method Post -Headers $h -ContentType "application/json" `' },
      { text: '  -Uri http://127.0.0.1:8020/api/v1/assets -Body ($asset | ConvertTo-Json)' },
      { text: '$event = @{ timestamp="2026-01-01T00:00:03Z"; prefix="203.0.113.0/24";' },
      { text: '  origin_as=64666; as_path=@(64496,64666); roa_status="invalid" }' },
      { text: 'Invoke-RestMethod -Method Post -Headers $h -ContentType "application/json" `' },
      { text: '  -Uri http://127.0.0.1:8020/api/v1/replay `' },
      { text: '  -Body (@{ events=@($event) } | ConvertTo-Json -Depth 5)' },
    ],
  },
];

export const SCOPE_IN = [
  'Offline JSON replay of route events',
  'Operator-configured protected-prefix baselines',
  'Origin, subprefix, RPKI, AS-path and bogon checks',
  'Alerts that keep the observed evidence',
  'A role-checked loopback API',
];

export const SCOPE_OUT = [
  'Live RIS/MRT feeds or BGP sessions',
  'Announcing or withdrawing routes',
  'Automated mitigation or device changes',
  'IPv6 coverage in this demo',
  'Production use without real tokens',
];

export const FAQ: FaqItem[] = [
  {
    question: 'Does it connect to BGP?',
    answer:
      'No. There is no BGP session and no live feed. Route events arrive as JSON through POST /api/v1/replay, which makes the detector easy to test offline.',
  },
  {
    question: 'What is a protected prefix?',
    answer:
      'A prefix you add as an asset, together with the origin ASNs you expect and any anycast origins you have declared. Matching uses the least-specific asset that contains the event.',
  },
  {
    question: 'Why least-specific match?',
    answer:
      'If both a /16 and a /24 contain an event, the /16 is the broader declaration and wins. That mirrors the backend’s min(matches, key=prefixlen) rule and avoids an arbitrary asset ordering.',
  },
  {
    question: 'What does confidence mean?',
    answer:
      'It is a fixed value per event, not a calibrated probability: 0.95 when RPKI is invalid, 0.82 when the origin is declared, and 0.90 otherwise. It ranks evidence; it does not predict whether an announcement is malicious.',
  },
  {
    question: 'Is RPKI validated here?',
    answer:
      'No. The event carries a roa_status field and the detector trusts it. RouteSentinel does not fetch ROAs or validate signatures.',
  },
  {
    question: 'Can it block a hijack?',
    answer:
      'No. It is read-only. It raises an alert with evidence and a suggested review action; nothing is announced, withdrawn or changed on a router.',
  },
  {
    question: 'Is IPv6 supported?',
    answer:
      'Not in this demo. The browser engine returns an “unsupported” result for IPv6. The Python backend currently answers an IPv6 event against an IPv4 asset with HTTP 500; that limitation is recorded in BACKEND-NOTES.md.',
  },
  {
    question: 'Where is data stored?',
    answer:
      'In a local SQLite file under data/, which Git ignores. The demo never writes to it: all simulator results live in your browser and disappear on reset.',
  },
  {
    question: 'Is it ready for production?',
    answer:
      'No. It is a teaching-sized, single-process tool with demo tokens and no load or security testing. Replace the tokens and keep the API on loopback before using it with real data.',
  },
];

export const CTA_NODES: Array<{ label: string[]; hub?: boolean }> = [
  { label: ['Offline route', 'JSON'] },
  { label: ['Validate', 'event'] },
  { label: ['Match protected', 'asset'] },
  { label: ['Six checks', 'detector'], hub: true },
  { label: ['SQLite', 'alerts'] },
  { label: ['Review +', 'feedback'] },
];

export const CTA = {
  heading: 'Replay it.',
  trail: 'Watch the alert appear.',
  ctas: [
    { label: 'View on GitHub', href: SITE.repo, variant: 'w', external: true },
    { label: 'Back to the simulator', href: '#try', variant: 'plain' },
  ] as LinkCta[],
};

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Product',
    links: [
      { label: 'Overview', href: '#top' },
      { label: 'Pipeline', href: '#how' },
      { label: 'Simulator', href: '#try' },
      { label: 'Results', href: '#results' },
    ],
  },
  {
    title: 'Run it',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Quick start', href: '#start' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Source',
    links: [
      { label: 'GitHub', href: SITE.repo, external: true },
      { label: 'Docs', href: SITE.docs, external: true },
      { label: 'Source code', href: SITE.source, external: true },
      { label: 'Issues', href: SITE.issues, external: true },
    ],
  },
];
