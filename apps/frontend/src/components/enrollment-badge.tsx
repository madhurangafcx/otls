// Unified status badge. Six variants cover enrollment states, course statuses,
// and completion. Single source of truth — the badge shape was reimplemented
// inline in 4+ places before this.
// Design reference: docs/design/edulearn-ui/project/parts.jsx → EnrollmentBadge

type BadgeStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'draft'
  | 'completed';

const BADGE_MAP: Record<
  BadgeStatus,
  { tone: 'success' | 'warning' | 'danger'; label: string }
> = {
  pending: { tone: 'warning', label: 'Pending review' },
  approved: { tone: 'success', label: 'Approved' },
  rejected: { tone: 'danger', label: 'Rejected' },
  published: { tone: 'success', label: 'Published' },
  draft: { tone: 'warning', label: 'Draft' },
  completed: { tone: 'success', label: 'Completed' },
};

const TONE_CLASSES = {
  success: 'border-success-border bg-success-bg text-success-fg',
  warning: 'border-warning-border bg-warning-bg text-warning-fg',
  danger: 'border-danger-border bg-danger-bg text-danger-fg',
};

const DOT_CLASSES = {
  success: 'bg-success-fg',
  warning: 'bg-warning-fg',
  danger: 'bg-danger-fg',
};

export function EnrollmentBadge({
  status,
  label,
  className = '',
}: {
  status: BadgeStatus;
  label?: string;
  className?: string;
}) {
  const entry = BADGE_MAP[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-pill border text-caption ${TONE_CLASSES[entry.tone]} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-pill ${DOT_CLASSES[entry.tone]}`} />
      {label ?? entry.label}
    </span>
  );
}

export type { BadgeStatus };
