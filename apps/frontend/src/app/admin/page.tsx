import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { api } from '@/lib/api';

// Admin dashboard — stat cards + recent activity.
// Minimum viable for Phase 3: show course counts. More stats come in later phases
// as enrollments + assignments modules ship.

export default async function AdminDashboardPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Layout already enforced auth + admin role, but defense in depth
  if (!session) return null;

  const all = await api.courses.list({ limit: 50 }, session.access_token);
  const published = all.data.filter((c) => c.status === 'published').length;
  const drafts = all.data.filter((c) => c.status === 'draft').length;

  return (
    <div className="max-w-5xl px-8 py-10">
      <div className="mb-8">
        <h1 className="font-display text-h1-sm font-medium">Dashboard</h1>
        <p className="text-body-sm text-muted mt-1">
          Overview of courses, semesters, and activity.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Total courses" value={all.data.length} />
        <StatCard label="Published" value={published} />
        <StatCard label="Drafts" value={drafts} />
        <StatCard label="Students" value="—" hint="Phase 4" />
      </div>

      <div className="rounded-card border border-line bg-surface p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-h3 font-medium">Courses</h2>
          <Link
            href="/admin/courses"
            className="text-accent-600 hover:underline text-body-sm font-medium"
          >
            View all →
          </Link>
        </div>
        {all.data.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-body-sm text-muted mb-4">No courses yet.</p>
            <Link
              href="/admin/courses/new"
              className="inline-flex h-10 px-5 rounded bg-accent-600 hover:bg-accent-700 text-white font-medium text-body-sm items-center"
            >
              Create your first course
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {all.data.slice(0, 5).map((c) => (
              <li key={c.id} className="py-3 flex items-center justify-between">
                <Link
                  href={`/admin/courses/${c.id}`}
                  className="text-body hover:text-accent-600"
                >
                  {c.title}
                </Link>
                <span
                  className={`text-caption uppercase px-2 py-0.5 rounded-pill border ${
                    c.status === 'published'
                      ? 'bg-success-bg border-success-border text-success-fg'
                      : 'bg-warning-bg border-warning-border text-warning-fg'
                  }`}
                >
                  {c.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <div className="text-caption uppercase text-muted">{label}</div>
      <div className="font-display text-[36px] font-medium mt-2 tabular">{value}</div>
      {hint && <div className="text-body-sm text-subtle mt-1">{hint}</div>}
    </div>
  );
}
