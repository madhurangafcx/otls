// StatCard — label + large Fraunces number + optional delta with up/down
// trend arrow. Used on admin dashboard.
// Design reference: docs/design/edulearn-ui/project/parts.jsx → StatCard

import { Icons } from './icons';

export function StatCard({
  label,
  value,
  delta,
  up,
  className = '',
}: {
  label: string;
  value: string | number;
  delta?: string;
  up?: boolean;
  className?: string;
}) {
  return (
    <div className={`rounded-card border border-line bg-surface p-5 ${className}`}>
      <div className="text-caption uppercase text-muted tracking-[0.09em]">{label}</div>
      <div className="font-display text-[32px] font-medium mt-2.5 tabular-nums">
        {value}
      </div>
      {delta && (
        <div
          className={`mt-2 inline-flex items-center gap-1 text-body-sm ${up ? 'text-success-fg' : 'text-danger-fg'}`}
        >
          <Icons.TrendingUp size={13} style={{ transform: up ? 'none' : 'scaleY(-1)' }} />
          {delta}
        </div>
      )}
    </div>
  );
}
