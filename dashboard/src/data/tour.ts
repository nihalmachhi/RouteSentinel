/**
 * The five tabs in the hero tour. Each tab is typed data, not JSX, so the
 * content can be edited without touching `TourWindow.tsx`.
 */
export type Tone = 'ok' | 'no' | 'mu';

export type TourBlock =
  | { type: 'p'; text: string; muted?: boolean }
  | {
      type: 'sp';
      rows: Array<{ tag: string; tone?: Tone; name: string; meta?: string; indent?: number }>;
    }
  | { type: 'rw'; rows: Array<{ key: string; value: string; replacement?: string }> }
  | { type: 'chips'; chips: Array<{ label: string; tone: Tone }> }
  | { type: 'term'; lines: string[] }
  | { type: 'list'; items: string[] }
  | { type: 'asset'; rows: Array<{ key: string; value: string; note?: string }> }
  | { type: 'note'; text: string };

export interface TourTab {
  tab: string;
  heading: string;
  sub: string;
  main: TourBlock[];
  asideHeading: string;
  aside: TourBlock[];
}

export const TOUR_SIDEBAR = {
  items: [
    { label: 'Alerts', count: '8', on: true },
    { label: 'Routes', count: '8', on: false },
    { label: 'Assets', count: '2', on: false },
    { label: 'Feedback', count: '0', on: false },
  ],
  groups: [
    {
      title: 'Protected prefixes',
      items: [
        { label: '203.0.113.0/24', tone: 'ok' as Tone },
        { label: '10.20.0.0/16', tone: 'no' as Tone },
      ],
    },
    {
      title: 'Feed',
      items: [{ label: 'offline-fixture', tone: 'mu' as Tone }],
    },
  ],
};

export const TOUR_TABS: TourTab[] = [
  {
    tab: 'Ingest',
    heading: 'Offline route events',
    sub: 'No live BGP session',
    main: [
      {
        type: 'p',
        text: 'One JSON event becomes one detection pass. Fields are validated before the checks start, and the observed values travel with the result.',
      },
      {
        type: 'rw',
        rows: [
          { key: 'prefix', value: '203.0.113.128/25' },
          { key: 'origin_as', value: '64666' },
          { key: 'as_path', value: '64496 → 64666' },
          { key: 'roa_status', value: 'unknown' },
        ],
      },
    ],
    asideHeading: 'Totals',
    aside: [
      {
        type: 'list',
        items: ['Events processed **8**', 'Alerts raised **8**', 'Mode **offline-passive-replay**'],
      },
    ],
  },
  {
    tab: 'Match',
    heading: 'Protected prefix baseline',
    sub: 'Operator-configured',
    main: [
      {
        type: 'asset',
        rows: [
          { key: 'prefix', value: '203.0.113.0/24', note: 'canonical network' },
          { key: 'expected origin', value: 'AS64500', note: 'normal origin' },
          { key: 'anycast origin', value: 'AS64501', note: 'declared anycast' },
          { key: 'label', value: 'Documentation prefix demo' },
        ],
      },
    ],
    asideHeading: 'How matching works',
    aside: [
      {
        type: 'list',
        items: [
          'Contained? **subnet test**',
          'Several match? **least specific wins**',
          'None match? **event ignored**',
        ],
      },
    ],
  },
  {
    tab: 'Detect',
    heading: 'Checks on every event',
    sub: 'Order matches the detector',
    main: [
      {
        type: 'sp',
        rows: [
          {
            tag: 'high',
            tone: 'no',
            name: 'unexpected-subprefix',
            meta: 'more specific than the asset',
          },
          { tag: 'high', tone: 'no', name: 'unexpected-origin', meta: 'origin not declared' },
          { tag: 'critical', tone: 'no', name: 'rpki-invalid', meta: 'status is invalid' },
          { tag: 'medium', tone: 'mu', name: 'rpki-unknown', meta: 'status is unknown' },
          { tag: 'medium', tone: 'mu', name: 'long-as-path', meta: '> 32 hops' },
          { tag: 'high', tone: 'no', name: 'bogon-prefix', meta: 'private or reserved' },
        ],
      },
      { type: 'note', text: 'A fixed value per event, not a calibrated probability.' },
    ],
    asideHeading: 'Confidence',
    aside: [
      {
        type: 'list',
        items: [
          '0.95 **RPKI invalid**',
          '0.90 **origin not allowed**',
          '0.82 **origin allowed**',
        ],
      },
    ],
  },
  {
    tab: 'Alert',
    heading: 'Evidence travels with the alert',
    sub: '203.0.113.128/25 from AS64666',
    main: [
      {
        type: 'chips',
        chips: [
          { label: 'unexpected-subprefix · high', tone: 'no' },
          { label: 'unexpected-origin · high', tone: 'no' },
          { label: 'rpki-unknown · medium', tone: 'mu' },
        ],
      },
      {
        type: 'term',
        lines: [
          '{',
          '  "prefix": "203.0.113.128/25",',
          '  "origin_as": 64666,',
          '  "as_path": [64496, 64666],',
          '  "roa_status": "unknown",',
          '  "feed": "offline-fixture",',
          '  "timestamp": "2026-01-01T00:00:04Z"',
          '}',
        ],
      },
    ],
    asideHeading: 'Suggested action',
    aside: [
      { type: 'p', text: 'Review route and RPKI evidence; no action was taken.' },
      { type: 'note', text: 'The API never announces or withdraws a route.' },
    ],
  },
  {
    tab: 'Review',
    heading: 'Operators label alerts',
    sub: 'Feedback endpoint',
    main: [
      {
        type: 'chips',
        chips: [
          { label: 'true_positive', tone: 'no' },
          { label: 'false_positive', tone: 'ok' },
          { label: 'needs_review', tone: 'mu' },
        ],
      },
      {
        type: 'note',
        text: 'Example note: “confirm the ROA before contacting the peer.”',
      },
    ],
    asideHeading: 'Stored, not yet used',
    aside: [
      {
        type: 'p',
        text: 'Feedback is saved with the alert. It is not used to tune detection or change a verdict in this release.',
      },
    ],
  },
];
