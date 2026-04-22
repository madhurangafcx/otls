import Link from 'next/link';
import { Avatar } from '@/components/avatar';
import { Icons } from '@/components/icons';
import { StatCard } from '@/components/stat-card';
import { api } from '@/lib/api';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { DownloadLink } from './assignments/download-link';
import { EnrollmentActions } from './courses/[courseId]/enrollments/enrollment-actions';

// Admin dashboard — stat counters + recent activity.
// Matches docs/design/edulearn-ui/project/screens-admin.jsx → AdminDashboard.

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

export default async function AdminDashboardPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Layout already enforced auth + admin role, but defense in depth
  if (!session) return null;

  const [statsRes, pendingRes, recentAssignmentsRes] = await Promise.all([
    api.admin.stats(session.access_token),
    api.enrollments.listForAdmin({ status: 'pending', limit: 5 }, session.access_token),
    api.assignments.listForAdmin({ limit: 5 }, session.access_token),
  ]);
  const stats = statsRes.data;
  const pending = pendingRes.data;
  const recent = recentAssignmentsRes.data;

  return (
    <div className="max-w-6xl px-8 py-10">
      <div className="mb-8">
        <h1 className="font-display text-h1-sm font-medium">Dashboard</h1>
        <p className="text-body-sm text-muted mt-1">Activity across every course.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Students" value={stats.students} />
        <StatCard
          label="Courses"
          value={stats.courses_total}
          delta={stats.courses_draft > 0 ? `${stats.courses_draft} in draft` : undefined}
        />
        <StatCard
          label="Pending enrollments"
          value={stats.pending_enrollments}
          delta={stats.pending_enrollments > 0 ? 'Review now' : undefined}
        />
        <StatCard label="Submissions today" value={stats.submissions_today} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">
        {/* Recent enrollment requests */}
        <section className="rounded-card border border-line bg-surface overflow-hidden">
          <header className="flex items-center justify-between px-5 py-4 border-b border-line">
            <h2 className="font-display text-h4 font-medium">
              Recent enrollment requests
            </h2>
            {stats.pending_enrollments > 5 && (
              <span className="text-caption uppercase text-muted tracking-[0.08em]">
                {stats.pending_enrollments} pending
              </span>
            )}
          </header>
          {pending.length === 0 ? (
            <div className="px-5 py-10 text-center text-body-sm text-muted">
              No pending requests.
            </div>
          ) : (
            <ul>
              {pending.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center gap-4 px-5 py-4 border-b border-line last:border-0"
                >
                  <Avatar
                    name={e.student?.full_name}
                    email={e.student?.email}
                    size={32}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-body truncate">
                      {e.student?.full_name ?? e.student?.email ?? 'Unknown'}
                    </div>
                    <div className="text-caption text-muted truncate">
                      {e.course?.title ?? '—'} · {formatRelative(e.created_at)}
                    </div>
                  </div>
                  <EnrollmentActions
                    enrollmentId={e.id}
                    currentStatus={e.status}
                    compact
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent assignments */}
        <section className="rounded-card border border-line bg-surface overflow-hidden">
          <header className="flex items-center justify-between px-5 py-4 border-b border-line">
            <h2 className="font-display text-h4 font-medium">Recent assignments</h2>
            <Link
              href="/admin/assignments"
              className="text-body-sm text-accent-600 hover:underline inline-flex items-center gap-1"
            >
              View all
              <Icons.ArrowRight size={14} />
            </Link>
          </header>
          {recent.length === 0 ? (
            <div className="px-5 py-10 text-center text-body-sm text-muted">
              No submissions yet.
            </div>
          ) : (
            <ul>
              {recent.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 px-5 py-4 border-b border-line last:border-0"
                >
                  <Avatar
                    name={a.student?.full_name}
                    email={a.student?.email}
                    size={32}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-body truncate">
                      {a.student?.full_name ?? a.student?.email ?? 'Unknown'}
                    </div>
                    <div className="text-caption text-muted truncate">
                      {a.semester?.course?.title ?? '—'} · {a.semester?.title ?? '—'} ·{' '}
                      {formatRelative(a.submitted_at)}
                    </div>
                  </div>
                  <DownloadLink assignmentId={a.id} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
