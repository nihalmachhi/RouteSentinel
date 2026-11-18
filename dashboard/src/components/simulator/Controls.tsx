import type { FeedName, Severity } from '../../lib/engine';
import { THRESHOLDS } from './model';

interface ControlsProps {
  threshold: Severity;
  onThreshold: (threshold: Severity) => void;
  onRun: (feed: FeedName) => void;
  onRunBoth: () => void;
  onReset: () => void;
}

export function Controls({ threshold, onThreshold, onRun, onRunBoth, onReset }: ControlsProps) {
  const index = THRESHOLDS.indexOf(threshold);
  return (
    <div className="ctl">
      <button className="pill w" type="button" onClick={() => onRun('clean')}>
        Replay clean feed
      </button>
      <button className="pill w" type="button" onClick={() => onRun('incident')}>
        Replay incident feed
      </button>
      <button className="pill w" type="button" onClick={onRunBoth}>
        Replay both
      </button>
      <button className="pill" type="button" onClick={onReset}>
        Reset
      </button>
      <label>
        Show alerts at or above
        <input
          type="range"
          id="severity-threshold"
          min={0}
          max={THRESHOLDS.length - 1}
          step={1}
          value={index}
          aria-label="Show alerts at or above"
          onChange={(event) => onThreshold(THRESHOLDS[Number(event.target.value)])}
        />
        <output htmlFor="severity-threshold">{threshold}</output>
      </label>
    </div>
  );
}
