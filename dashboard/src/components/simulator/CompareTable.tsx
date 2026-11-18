import type { FeedName, FeedResult } from '../../lib/engine';

export function CompareTable({ runs }: { runs: Partial<Record<FeedName, FeedResult>> }) {
  const rows: Array<[FeedName, FeedResult]> = [];
  if (runs.clean) rows.push(['clean', runs.clean]);
  if (runs.incident) rows.push(['incident', runs.incident]);

  return (
    <table id="cmp">
      <caption className="sr-only">Alerts by feed</caption>
      <thead>
        <tr>
          <th scope="col">Feed</th>
          <th scope="col">Events</th>
          <th scope="col">Alerts</th>
          <th scope="col">Critical</th>
          <th scope="col">High</th>
          <th scope="col">Medium</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([feed, run]) => (
          <tr key={feed}>
            <td>{feed}</td>
            <td>{run.totals.events}</td>
            <td>{run.totals.alerts}</td>
            <td>{run.totals.critical}</td>
            <td>{run.totals.high}</td>
            <td>{run.totals.medium}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
