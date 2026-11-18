import { useReducer } from 'react';
import type { CSSProperties } from 'react';
import { HEADINGS, TRY_LEAD } from '../data/content';
import { Icon } from './Icon';
import { CaseList } from './simulator/CaseList';
import { CompareTable } from './simulator/CompareTable';
import { Controls } from './simulator/Controls';
import { EvidencePanel } from './simulator/EvidencePanel';
import { StatsRow } from './simulator/StatsRow';
import { TraceTree } from './simulator/TraceTree';
import {
  initialSimState,
  selectedResult,
  simReducer,
  totalStats,
} from './simulator/model';

export function Simulator() {
  const [state, dispatch] = useReducer(simReducer, initialSimState);
  const stats = totalStats(state);
  const current = selectedResult(state);
  const hasRuns = Object.keys(state.runs).length > 0;

  let chipClass = 'chip';
  let chipText = 'no replay yet';
  if (hasRuns) {
    if (stats.alerts === 0) {
      chipClass = 'chip ok';
      chipText = '0 alerts';
    } else {
      chipClass = 'chip no';
      chipText = `${stats.alerts} alerts · ${stats.critical} critical`;
    }
  }

  const heading = HEADINGS.try;
  return (
    <section className="sec" id="try">
      <h2>
        {heading.lead}{' '}
        <span className="m">
          <i className="ico" style={{ '--c': heading.color } as CSSProperties}>
            <Icon name={heading.icon} />
          </i>{' '}
          {heading.trail}
        </span>
      </h2>
      <p className="lead2">{TRY_LEAD}</p>

      <div className="sim" id="sim">
        <div className="shead">
          <span>simulated replay · documentation prefixes</span>
          <span className={chipClass} aria-live="polite">
            {chipText}
          </span>
        </div>
        <StatsRow stats={stats} />
        <Controls
          threshold={state.threshold}
          onThreshold={(threshold) => dispatch({ type: 'threshold', threshold })}
          onRun={(feed) => dispatch({ type: 'run', feed })}
          onRunBoth={() => dispatch({ type: 'run-both' })}
          onReset={() => dispatch({ type: 'reset' })}
        />
        <div className="scols">
          <CaseList
            runs={state.runs}
            selected={state.selected}
            onSelect={(feed, eventId) => dispatch({ type: 'select', feed, eventId })}
          />
          <div>
            <h3>Findings</h3>
            <TraceTree result={current} threshold={state.threshold} />
          </div>
        </div>
        <CompareTable runs={state.runs} />
        <EvidencePanel result={current} />
      </div>
    </section>
  );
}
