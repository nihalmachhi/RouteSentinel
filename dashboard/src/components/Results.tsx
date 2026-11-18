import type { CSSProperties } from 'react';
import { ASSETS, CLEAN_EVENTS, INCIDENT_EVENTS } from '../data/fixtures';
import { HEADINGS, RESULTS_LEAD, RESULTS_NOTE } from '../data/content';
import { runFeed, type FindingKind } from '../lib/engine';
import { Icon } from './Icon';

interface Row {
  label: string;
  percent: number;
  display: string;
  color: string;
}

const KIND_SHORT: Record<FindingKind, string> = {
  'unexpected-subprefix': 'subprefix',
  'unexpected-origin': 'origin',
  'rpki-invalid': 'rpki-invalid',
  'rpki-unknown': 'rpki-unknown',
  'long-as-path': 'long-path',
  'bogon-prefix': 'bogon',
};

function BarRow({ row }: { row: Row }) {
  return (
    <div className="mr">
      <span>{row.label}</span>
      <div className="track">
        <div
          className="grow"
          style={
            {
              '--w': `${row.percent}%`,
              '--c': row.color,
              animation: 'none',
              width: `${row.percent}%`,
            } as CSSProperties
          }
        />
      </div>
      <b>{row.display}</b>
    </div>
  );
}

export function Results() {
  const clean = runFeed(CLEAN_EVENTS, ASSETS, 'clean');
  const incident = runFeed(INCIDENT_EVENTS, ASSETS, 'incident');
  const total = incident.totals.alerts;
  const heading = HEADINGS.results;

  const cards: Array<{ title: string; description: string; rows: Row[] }> = [
    {
      title: 'Clean feed',
      description: `${clean.totals.events} events, ${clean.totals.alerts} alerts.`,
      rows: [{ label: 'Quiet', percent: 100, display: '100%', color: '#8c8c95' }],
    },
    {
      title: 'Incident feed',
      description: `${incident.totals.events} events, ${incident.totals.alerts} alerts.`,
      rows: [
        {
          label: 'Critical',
          percent: (incident.totals.critical / total) * 100,
          display: String(incident.totals.critical),
          color: 'var(--bad)',
        },
        {
          label: 'High',
          percent: (incident.totals.high / total) * 100,
          display: String(incident.totals.high),
          color: '#fbbf24',
        },
        {
          label: 'Medium',
          percent: (incident.totals.medium / total) * 100,
          display: String(incident.totals.medium),
          color: '#a78bfa',
        },
      ],
    },
    {
      title: 'Where alerts come from',
      description: 'Counts per finding kind across the incident feed.',
      rows: (Object.keys(incident.byKind) as FindingKind[]).map((kind) => ({
        label: KIND_SHORT[kind],
        percent: (incident.byKind[kind] / total) * 100,
        display: String(incident.byKind[kind]),
        color: '#a78bfa',
      })),
    },
  ];

  return (
    <section className="sec" id="results">
      <h2>
        {heading.lead}{' '}
        <span className="m">
          <i className="ico" style={{ '--c': heading.color } as CSSProperties}>
            <Icon name={heading.icon} />
          </i>{' '}
          {heading.trail}
        </span>
      </h2>
      <p className="lead2">{RESULTS_LEAD}</p>
      <div className="rg">
        {cards.map((card) => (
          <div className="rc" key={card.title}>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            <div className="tb">
              {card.rows.map((row) => (
                <BarRow row={row} key={row.label} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="note">{RESULTS_NOTE}</p>
    </section>
  );
}
