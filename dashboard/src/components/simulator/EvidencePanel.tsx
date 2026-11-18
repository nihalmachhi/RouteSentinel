import { canonicalPrefix, SUGGESTED_ACTION, type EventResult } from '../../lib/engine';
import { formatAsPath, formatConfidence } from '../../lib/format';

export function EvidencePanel({ result }: { result: EventResult | null }) {
  if (!result) {
    return (
      <div className="evp">
        <p className="empty">Run a feed, then pick an event to see the evidence.</p>
      </div>
    );
  }
  const { event } = result;
  return (
    <div className="evp">
      <strong>
        {event.id} · {event.feed}
      </strong>
      <dl>
        <dt>Prefix</dt>
        <dd>{canonicalPrefix(event.prefix) ?? event.prefix}</dd>
        <dt>Matched asset</dt>
        <dd>{result.matchedAsset?.prefix ?? 'none'}</dd>
        <dt>Origin AS</dt>
        <dd>AS{event.originAs}</dd>
        <dt>AS path</dt>
        <dd>{formatAsPath(event.asPath)}</dd>
        <dt>ROA status</dt>
        <dd>{event.roa}</dd>
        <dt>Feed</dt>
        <dd>{event.feed} · offline-fixture</dd>
        <dt>Confidence</dt>
        <dd>{formatConfidence(result.confidence)}</dd>
        <dt>Suggested action</dt>
        <dd>{SUGGESTED_ACTION}</dd>
      </dl>
    </div>
  );
}
