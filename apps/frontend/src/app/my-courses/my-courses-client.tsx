'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type {
  EnrollmentWithCourse,
  ProgressSummary,
  AnnouncementOverviewRow,
} from '@/lib/api';
import { ProgressBar } from '@/components/progress-bar';
import { EnrollmentBadge } from '@/components/enrollment-badge';
import { Icons } from '@/components/icons';

type Tab = 'progress' | 'completed' | 'pending';

const TAB_LABEL: Record<Tab, string> = {
  progress: 'In Progress',
  completed: 'Completed',
  pending: 'Pending',
};

type Props = {
  enrollments: EnrollmentWithCourse[];
  progress: ProgressSummary[];
  announcementsByCourse: Map<string, AnnouncementOverviewRow>;
};

export function MyCoursesClient({
  enrollments,
  progress,
  announcementsByCourse,
}: Props) {
  const [tab, setTab] = useState<Tab>('progress');

  const progressByCourse = useMemo(
    () => new Map(progress.map((p) => [p.course_id, p])),
    [progress]
  );

  // Bucket each enrollment into exactly one tab. "In Progress" means approved
  // and not yet at 100%; "Completed" means approved and 100%. An approved
  // enrollment with no semester completion data (total=0) sits in "In Progress"
  // so the student still sees it.
  const { inProgress, completed, pending, rejected } = useMemo(() => {
    const inProg: EnrollmentWithCourse[] = [];
    const done: EnrollmentWithCourse[] = [];
    const pend: EnrollmentWithCourse[] = [];
    const rej: EnrollmentWithCourse[] = [];
    for (const e of enrollments) {
      if (e.status === 'pending') pend.push(e);
      else if (e.status === 'rejected') rej.push(e);
      else if (e.status === 'approved') {
        const p = progressByCourse.get(e.course_id);
        if (p && p.total > 0 && p.percentage >= 100) done.push(e);
        else inProg.push(e);
      }
    }
    return { inProgress: inProg, completed: done, pending: pend, rejected: rej };
  }, [enrollments, progressByCourse]);

  const counts: Record<Tab, number> = {
    progress: inProgress.length,
    completed: completed.length,
    pending: pending.length,
  };

  const visible =
    tab === 'progress' ? inProgress : tab === 'completed' ? completed : pending;

  return (
    <>
      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Enrollments"
        className="flex items-center gap-1 mb-6 border-b border-line"
      >
        {(['progress', 'completed', 'pending'] as const).map((t) => {
          const isActive = t === tab;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(t)}
              className={`h-10 px-4 -mb-px border-b-2 text-body-sm font-medium inline-flex items-center gap-2 transition-colors ${
                isActive
                  ? 'border-accent-600 text-ink'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {TAB_LABEL[t]}
              <span
                className={`inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-pill text-caption tabular-nums ${
                  isActive
                    ? 'bg-accent-100 text-accent-700'
                    : 'bg-line-soft text-muted'
                }`}
              >
                {counts[t]}
              </span>
            </button>
          );
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <div className="space-y-4">
          {visible.map((e) =>
            tab === 'progress' ? (
              <InProgressCard
                key={e.id}
                enrollment={e}
                progress={progressByCourse.get(e.course_id)}
                unread={
                  announcementsByCourse.get(e.course_id)?.unread_count ?? 0
                }
              />
            ) : tab === 'completed' ? (
              <CompletedCard
                key={e.id}
                enrollment={e}
                progress={progressByCourse.get(e.course_id)}
              />
            ) : (
              <PendingCard key={e.id} enrollment={e} />
            )
          )}
        </div>
      )}

      {/* Rejected — compact footer section when any exist. Design doesn't
          show a rejected tab but losing them silently would be worse. */}
      {rejected.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-h4 font-medium mb-3">Not approved</h2>
          <ul className="rounded-card border border-line bg-surface overflow-hidden">
            {rejected.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between px-5 py-3.5 border-b border-line last:border-0"
              >
                <Link
                  href={`/courses/${e.course_id}`}
                  className="text-body-sm text-muted hover:text-ink"
                >
                  {e.course?.title ?? 'Course'}
                </Link>
                <EnrollmentBadge status="rejected" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function InProgressCard({
  enrollment,
  progress,
  unread,
}: {
  enrollment: EnrollmentWithCourse;
  progress: ProgressSummary | undefined;
  unread: number;
}) {
  return (
    <Link
      href={`/courses/${enrollment.course_id}`}
      className="block rounded-card border border-line bg-surface hover:bg-paper transition-colors p-6 group"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-h3 font-medium group-hover:text-accent-600 transition-colors">
            {enrollment.course?.title ?? 'Course'}
          </h3>
          {enrollment.course?.description && (
            <p className="text-body-sm text-muted line-clamp-1 mt-1">
              {enrollment.course.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {unread > 0 && (
            <span
              className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-pill bg-accent-600 text-white text-caption font-medium tabular-nums"
              title={`${unread} new announcement${unread === 1 ? '' : 's'}`}
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
          <span className="text-accent-600 text-body-sm font-medium inline-flex items-center gap-1">
            Continue
            <Icons.ArrowRight size={14} />
          </span>
        </div>
      </div>

      {progress && progress.total > 0 ? (
        <>
          <div className="mt-4">
            <ProgressBar value={progress.percentage} />
          </div>
          <div className="text-body-sm text-muted tabular-nums mt-2">
            {progress.completed} of {progress.total} semester
            {progress.total === 1 ? '' : 's'} completed
          </div>
        </>
      ) : (
        <div className="text-body-sm text-muted mt-3">
          Open to start the first semester.
        </div>
      )}
    </Link>
  );
}

function CompletedCard({
  enrollment,
  progress,
}: {
  enrollment: EnrollmentWithCourse;
  progress: ProgressSummary | undefined;
}) {
  return (
    <Link
      href={`/courses/${enrollment.course_id}`}
      className="block rounded-card border border-line bg-surface hover:bg-paper transition-colors p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-h3 font-medium">
            {enrollment.course?.title ?? 'Course'}
          </h3>
          <div className="text-body-sm text-muted mt-1">
            Finished · {progress?.completed ?? 0} of {progress?.total ?? 0}{' '}
            semesters
          </div>
        </div>
        <EnrollmentBadge status="completed" />
      </div>
    </Link>
  );
}

function PendingCard({ enrollment }: { enrollment: EnrollmentWithCourse }) {
  return (
    <Link
      href={`/courses/${enrollment.course_id}`}
      className="block rounded-card border border-line bg-surface hover:bg-paper transition-colors p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-h3 font-medium">
            {enrollment.course?.title ?? 'Course'}
          </h3>
          <div className="text-body-sm text-muted mt-1">
            Requested{' '}
            {new Date(enrollment.created_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}{' '}
            · awaiting instructor review
          </div>
        </div>
        <EnrollmentBadge status="pending" />
      </div>
    </Link>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  if (tab === 'progress') {
    return (
      <div className="rounded-card border border-line bg-surface p-12 text-center">
        <h2 className="font-display text-h3 mb-2">No courses in progress</h2>
        <p className="text-body-sm text-muted mb-6">
          Request enrollment from the catalog to start learning.
        </p>
        <Link
          href="/courses"
          className="inline-flex h-10 px-5 rounded bg-accent-600 hover:bg-accent-700 text-white font-medium text-body-sm items-center"
        >
          Browse catalog
        </Link>
      </div>
    );
  }
  if (tab === 'completed') {
    return (
      <div className="rounded-card border border-line bg-surface p-10 text-center">
        <p className="text-body-sm text-muted">
          No completed courses yet. Keep going — your finished courses will land
          here.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-card border border-line bg-surface p-10 text-center">
      <p className="text-body-sm text-muted">
        No pending requests. Browse the catalog to request more.
      </p>
    </div>
  );
}
