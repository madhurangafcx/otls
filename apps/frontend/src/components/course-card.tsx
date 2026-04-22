// CourseCard — design's canonical course card.
// Semester count eyebrow, title, 2-line description, separator, status badge +
// "View →" cta. Wraps whole card in a Link when href is supplied.
// Design reference: docs/design/edulearn-ui/project/parts.jsx → CourseCard
//
// NOTE: semesterCount is optional until the backend adds it to CoursePayload
// (tracked as Tier 2 follow-up in docs/design/GAPS.md §2.5). Cards render an
// em-dash placeholder when the count isn't known yet.

import Link from 'next/link';
import { EnrollmentBadge } from './enrollment-badge';
import { Icons } from './icons';

export function CourseCard({
  title,
  description,
  status,
  semesterCount,
  href,
  className = '',
}: {
  title: string;
  description?: string | null;
  status: 'published' | 'draft';
  semesterCount?: number;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <div className="text-caption uppercase text-muted tracking-[0.09em] mb-3">
        {semesterCount == null
          ? 'Course'
          : `${semesterCount} semester${semesterCount === 1 ? '' : 's'}`}
      </div>
      <h3 className="font-display text-h3 font-medium mb-2.5 text-ink">{title}</h3>
      {description && (
        <p className="text-body-sm text-muted line-clamp-2">{description}</p>
      )}
      <div className="h-px bg-line my-4" />
      <div className="flex items-center justify-between">
        <EnrollmentBadge status={status} />
        <span className="inline-flex items-center gap-1 text-accent-600 text-body-sm font-medium">
          View <Icons.ArrowRight size={14} />
        </span>
      </div>
    </>
  );

  const classes = `block rounded-card border border-line bg-surface hover:bg-paper transition-colors p-[22px] ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {body}
      </Link>
    );
  }
  return <div className={classes}>{body}</div>;
}
