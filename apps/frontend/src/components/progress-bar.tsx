// ProgressBar — 1.5px rail + ochre fill + tabular-nums % readout to the right.
// Design reference: docs/design/edulearn-ui/project/parts.jsx → ProgressBar

export function ProgressBar({
  value,
  className = '',
  showLabel = true,
}: {
  value: number;
  className?: string;
  showLabel?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex-1 h-1.5 rounded-pill bg-line overflow-hidden">
        <div
          className="h-full bg-accent-600 transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-body-sm tabular-nums text-muted min-w-[36px] text-right">
          {clamped}%
        </span>
      )}
    </div>
  );
}
