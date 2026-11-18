import { atOrAbove, type EventResult, type Severity } from '../../lib/engine';

interface TraceTreeProps {
  result: EventResult | null;
  threshold: Severity;
}

export function TraceTree({ result, threshold }: TraceTreeProps) {
  if (!result) {
    return <p className="empty">Replay a feed, then pick an event to see why it alerted.</p>;
  }
  const visible = result.findings.filter((finding) => atOrAbove(finding.severity, threshold));
  const hidden = result.findings.length - visible.length;

  return (
    <div aria-live="polite">
      <ul className="tr">
        <li>
          <span className="k">event</span> {result.event.id}{' '}
          <span className="ms">{result.event.prefix}</span>
          {visible.length > 0 ? (
            <ul>
              {visible.map((finding) => (
                <li key={finding.kind}>
                  <span className={`k ${finding.severity}`}>{finding.severity}</span> {finding.kind}
                  <pre>{finding.message}</pre>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">No findings at or above {threshold}.</p>
          )}
        </li>
      </ul>
      {hidden > 0 ? (
        <p className="empty">
          {hidden} {hidden === 1 ? 'finding' : 'findings'} below the {threshold} threshold.
        </p>
      ) : null}
    </div>
  );
}
