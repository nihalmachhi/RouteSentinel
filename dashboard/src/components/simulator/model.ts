import { ASSETS, eventsForFeed } from '../../data/fixtures';
import {
  runFeed,
  type EventResult,
  type FeedName,
  type FeedResult,
  type Severity,
} from '../../lib/engine';

export const THRESHOLDS: Severity[] = ['low', 'medium', 'high', 'critical'];

export interface SimSelection {
  feed: FeedName;
  eventId: string;
}

export interface SimState {
  runs: Partial<Record<FeedName, FeedResult>>;
  selected: SimSelection | null;
  threshold: Severity;
}

export type SimAction =
  | { type: 'run'; feed: FeedName }
  | { type: 'run-both' }
  | { type: 'reset' }
  | { type: 'select'; feed: FeedName; eventId: string }
  | { type: 'threshold'; threshold: Severity };

export const initialSimState: SimState = {
  runs: {},
  selected: null,
  threshold: 'medium',
};

function resultFor(feed: FeedName): FeedResult {
  return runFeed(eventsForFeed(feed), ASSETS, feed);
}

/** Simulator state is a reducer so every button produces one predictable change. */
export function simReducer(state: SimState, action: SimAction): SimState {
  switch (action.type) {
    case 'run': {
      const result = resultFor(action.feed);
      const first = result.events[0];
      return {
        ...state,
        runs: { ...state.runs, [action.feed]: result },
        selected: first ? { feed: action.feed, eventId: first.event.id } : null,
      };
    }
    case 'run-both': {
      const clean = resultFor('clean');
      const incident = resultFor('incident');
      return {
        ...state,
        runs: { clean, incident },
        selected: incident.events[0]
          ? { feed: 'incident', eventId: incident.events[0].event.id }
          : null,
      };
    }
    case 'reset':
      return { ...initialSimState };
    case 'select':
      return { ...state, selected: { feed: action.feed, eventId: action.eventId } };
    case 'threshold':
      return { ...state, threshold: action.threshold };
    default:
      return state;
  }
}

export interface SimStats {
  events: number;
  alerts: number;
  critical: number;
  high: number;
}

export function totalStats(state: SimState): SimStats {
  return Object.values(state.runs).reduce<SimStats>(
    (totals, run) => {
      if (!run) return totals;
      return {
        events: totals.events + run.totals.events,
        alerts: totals.alerts + run.totals.alerts,
        critical: totals.critical + run.totals.critical,
        high: totals.high + run.totals.high,
      };
    },
    { events: 0, alerts: 0, critical: 0, high: 0 },
  );
}

export function selectedResult(state: SimState): EventResult | null {
  if (!state.selected) return null;
  const run = state.runs[state.selected.feed];
  return run?.events.find((item) => item.event.id === state.selected?.eventId) ?? null;
}
