import type { SimStats } from './model';

export function StatsRow({ stats }: { stats: SimStats }) {
  const items: Array<[number, string]> = [
    [stats.events, 'Events'],
    [stats.alerts, 'Alerts'],
    [stats.critical, 'Critical'],
    [stats.high, 'High'],
  ];
  return (
    <div className="stats">
      {items.map(([value, label]) => (
        <div className="stat" key={label}>
          <b>{value}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
