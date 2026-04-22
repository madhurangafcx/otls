'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { EnrollmentActions } from '@/app/admin/courses/[courseId]/enrollments/enrollment-actions';
import { Avatar } from '@/components/avatar';
import { EnrollmentBadge } from '@/components/enrollment-badge';
import {
  ApiClientError,
  api,
  type EnrollmentStatus,
  type EnrollmentWithStudentAndCourse,
} from '@/lib/api';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

// Cross-course enrollment review. Same tabs + bulk UX as the per-course page,
// with an extra Course column so admins can scan across all courses at once.

type Tab = EnrollmentStatus;

const TAB_ORDER: Tab[] = ['pending', 'approved', 'rejected'];
const TAB_LABEL: Record<Tab, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

export function EnrollmentsAdminClient({
  initial,
}: {
  initial: EnrollmentWithStudentAndCourse[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('pending');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [isBulkPending, startBulk] = useTransition();

  const counts = useMemo(
    () => ({
      pending: initial.filter((e) => e.status === 'pending').length,
      approved: initial.filter((e) => e.status === 'approved').length,
      rejected: initial.filter((e) => e.status === 'rejected').length,
    }),
    [initial]
  );

  const rows = useMemo(() => initial.filter((e) => e.status === tab), [initial, tab]);

  const selectableIds = rows.map((r) => r.id);
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const someSelected = selectableIds.some((id) => selected.has(id));

  function switchTab(next: Tab) {
    setTab(next);
    setSelected(new Set());
    setBulkError(null);
  }

  function toggleRow(id: string, checked: boolean) {
    setSelected((prev) => {
      const out = new Set(prev);
      if (checked) out.add(id);
      else out.delete(id);
      return out;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(selectableIds) : new Set());
  }

  function bulkReview(decision: 'approved' | 'rejected') {
    if (selected.size === 0) return;
    setBulkError(null);
    startBulk(async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) throw new Error('Not logged in');
        const ids = Array.from(selected);
        const results = await Promise.allSettled(
          ids.map((id) => api.enrollments.review(id, decision, session.access_token))
        );
        const failed = results.filter((r) => r.status === 'rejected');
        if (failed.length > 0) {
          const first = failed[0];
          const reason =
            first && first.status === 'rejected'
              ? first.reason instanceof ApiClientError
                ? first.reason.message
                : (first.reason as Error).message
              : 'Unknown error';
          setBulkError(`${failed.length} of ${ids.length} failed: ${reason}`);
        }
        setSelected(new Set());
        router.refresh();
      } catch (err) {
        setBulkError(err instanceof Error ? err.message : 'Bulk action failed');
      }
    });
  }

  return (
    <>
      <div
        role="tablist"
        aria-label="Enrollment status"
        className="flex items-center gap-1 mb-6 border-b border-line"
      >
        {TAB_ORDER.map((t) => {
          const isActive = t === tab;
          return (
            <button
              key={t}
              role="tab"
              aria-selected={isActive}
              onClick={() => switchTab(t)}
              className={`h-10 px-4 -mb-px border-b-2 text-body-sm font-medium inline-flex items-center gap-2 transition-colors ${
                isActive
                  ? 'border-accent-600 text-ink'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {TAB_LABEL[t]}
              <span
                className={`inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-pill text-caption tabular-nums ${
                  isActive ? 'bg-accent-100 text-accent-700' : 'bg-line-soft text-muted'
                }`}
              >
                {counts[t]}
              </span>
            </button>
          );
        })}
      </div>

      {tab === 'pending' && rows.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <label className="inline-flex items-center gap-2 text-body-sm text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = !allSelected && someSelected;
              }}
              onChange={(e) => toggleAll(e.target.checked)}
              className="h-4 w-4 rounded border-line accent-accent-600"
            />
            {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
          </label>
          {selected.size > 0 && (
            <>
              <button
                type="button"
                disabled={isBulkPending}
                onClick={() => bulkReview('approved')}
                className="h-8 px-3 rounded bg-accent-600 hover:bg-accent-700 disabled:bg-subtle text-white font-medium text-body-sm"
              >
                {isBulkPending ? 'Working…' : 'Approve selected'}
              </button>
              <button
                type="button"
                disabled={isBulkPending}
                onClick={() => bulkReview('rejected')}
                className="h-8 px-3 rounded border border-danger-border text-danger-fg hover:bg-danger-bg disabled:opacity-60 font-medium text-body-sm"
              >
                {isBulkPending ? 'Working…' : 'Reject selected'}
              </button>
            </>
          )}
          {bulkError && <span className="text-body-sm text-danger-fg">{bulkError}</span>}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-10 text-center text-body-sm text-muted">
          No {TAB_LABEL[tab].toLowerCase()} enrollments across all courses.
        </div>
      ) : (
        <div className="rounded-card border border-line bg-surface overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-caption uppercase text-muted tracking-[0.08em] bg-paper">
                {tab === 'pending' && (
                  <th className="px-4 py-3 border-b border-line w-10" />
                )}
                <th className="text-left px-4 py-3 border-b border-line font-medium">
                  Student
                </th>
                <th className="text-left px-4 py-3 border-b border-line font-medium">
                  Email
                </th>
                <th className="text-left px-4 py-3 border-b border-line font-medium">
                  Course
                </th>
                <th className="text-left px-4 py-3 border-b border-line font-medium w-36">
                  Requested
                </th>
                <th className="text-left px-4 py-3 border-b border-line font-medium w-36">
                  Status
                </th>
                {tab !== 'approved' && (
                  <th className="px-4 py-3 border-b border-line w-48" />
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-b border-line last:border-0">
                  {tab === 'pending' && (
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selected.has(e.id)}
                        onChange={(ev) => toggleRow(e.id, ev.target.checked)}
                        className="h-4 w-4 rounded border-line accent-accent-600"
                        aria-label={`Select ${e.student?.full_name ?? e.student?.email ?? 'row'}`}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={e.student?.full_name}
                        email={e.student?.email}
                        size={32}
                      />
                      <div className="font-medium text-body">
                        {e.student?.full_name ?? '—'}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-body-sm text-muted">
                    {e.student?.email ?? '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    {e.course ? (
                      <Link
                        href={`/admin/courses/${e.course.id}/enrollments`}
                        className="text-body-sm font-medium hover:text-accent-600"
                      >
                        {e.course.title}
                      </Link>
                    ) : (
                      <span className="text-body-sm text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-body-sm text-muted tabular-nums">
                    {new Date(e.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3.5">
                    <EnrollmentBadge status={e.status} />
                  </td>
                  {tab !== 'approved' && (
                    <td className="px-4 py-3.5 text-right">
                      <EnrollmentActions enrollmentId={e.id} currentStatus={e.status} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
