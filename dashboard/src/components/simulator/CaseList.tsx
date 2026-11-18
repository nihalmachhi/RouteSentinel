import type { FeedName, FeedResult } from '../../lib/engine';
import type { SimSelection } from './model';

interface CaseListProps {
  runs: Partial<Record<FeedName, FeedResult>>;
  selected: SimSelection | null;
  onSelect: (feed: FeedName, eventId: string) => void;
}

const FEEDS: FeedName[] = ['clean', 'incident'];

export function CaseList({ runs, selected, onSelect }: CaseListProps) {
  const present = FEEDS.flatMap((feed) => {
    const run = runs[feed];
    return run ? [{ feed, run }] : [];
  });

  return (
    <div>
      <h3>Events</h3>
      {present.length === 0 ? (
        <p className="empty">Replay a feed to list its events.</p>
      ) : (
        present.map(({ feed, run }) => (
          <div key={feed}>
            <h4>{feed} feed</h4>
            <div className="cells">
              {run.events.map((result) => {
                const count = result.findings.length;
                const isSelected =
                  selected?.feed === feed && selected.eventId === result.event.id;
                return (
                  <button
                    type="button"
                    className={`cell ${count > 0 ? 'no' : 'ok'}`}
                    key={result.event.id}
                    aria-pressed={isSelected}
                    onClick={() => onSelect(feed, result.event.id)}
                  >
                    {result.event.id} · {count} {count === 1 ? 'alert' : 'alerts'}
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
