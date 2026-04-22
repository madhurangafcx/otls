import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { api } from '@/lib/api';

export default async function MyCoursesPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect('/login?next=/my-courses');

  const [{ data: enrollments }, progressRes] = await Promise.all([
    api.enrollments.mine(session.access_token),
    api.progress.overview(session.access_token).catch(() => ({ data: [] })),
  ]);
  const progressByCourse = new Map(progressRes.data.map((p) => [p.course_id, p]));

  const approved = enrollments.filter((e) => e.status === 'approved');
  const pending = enrollments.filter((e) => e.status === 'pending');
  const rejected = enrollments.filter((e) => e.status === 'rejected');

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-baseline justify-between mb-10">
          <div>
            <h1 className="font-display text-h1 font-medium">My Courses</h1>
            <p className="text-body-sm text-muted mt-1">
              Courses you&apos;re enrolled in. Browse the{' '}
              <Link href="/courses" className="text-accent-600 hover:underline">
                catalog
              </Link>{' '}
              to request more.
            </p>
          </div>
          <Link href="/" className="text-body-sm text-muted hover:text-ink">
            ← Home
          </Link>
        </div>

        {/* Approved — primary surface */}
        {approved.length > 0 ? (
          <section className="mb-10">
            <h2 className="font-display text-h3 font-medium mb-4">Active</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {approved.map((e) => {
                const p = progressByCourse.get(e.course_id);
                return (
                  <Link
                    key={e.id}
                    href={`/courses/${e.course_id}`}
                    className="rounded-card border border-line bg-surface hover:bg-paper transition-colors p-6 block"
                  >
                    <div className="text-caption uppercase text-muted mb-3">Enrolled</div>
                    <h3 className="font-display text-h3 font-medium mb-2">
                      {e.course?.title ?? 'Course'}
                    </h3>
                    {e.course?.description && (
                      <p className="text-body-sm text-muted line-clamp-2 mb-4">
                        {e.course.description}
                      </p>
                    )}

                    {p && p.total > 0 && (
                      <div className="mb-4">
                        <div className="flex items-baseline justify-between text-caption text-muted mb-1">
                          <span>
                            Progress · {p.completed}/{p.total} semesters
                          </span>
                          <span className="tabular-nums">{p.percentage}%</span>
                        </div>
                        <div className="h-1.5 rounded-pill bg-line overflow-hidden">
                          <div
                            className="h-full bg-accent-600 transition-all"
                            style={{ width: `${p.percentage}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="h-px bg-line my-4" />
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-pill border border-success-border bg-success-bg text-success-fg text-caption">
                        <span className="w-1.5 h-1.5 rounded-pill bg-success-fg" />
                        Approved
                      </span>
                      <span className="text-accent-600 text-body-sm font-medium">
                        Continue →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="mb-10 rounded-card border border-line bg-surface p-12 text-center">
            <h2 className="font-display text-h3 mb-2">No active enrollments yet</h2>
            <p className="text-body-sm text-muted mb-6">
              Request enrollment from the course catalog. Once an admin approves,
              your courses appear here.
            </p>
            <Link
              href="/courses"
              className="inline-flex h-10 px-5 rounded bg-accent-600 hover:bg-accent-700 text-white font-medium text-body-sm items-center"
            >
              Browse catalog
            </Link>
          </section>
        )}

        {/* Pending */}
        {pending.length > 0 && (
          <section className="mb-8">
            <h2 className="font-display text-h3 font-medium mb-4">Pending review</h2>
            <ul className="rounded-card border border-line bg-surface overflow-hidden">
              {pending.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between px-5 py-4 border-b border-line last:border-0"
                >
                  <Link
                    href={`/courses/${e.course_id}`}
                    className="text-body hover:text-accent-600"
                  >
                    {e.course?.title ?? 'Course'}
                  </Link>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-pill border border-warning-border bg-warning-bg text-warning-fg text-caption">
                    <span className="w-1.5 h-1.5 rounded-pill bg-warning-fg" />
                    Pending
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Rejected */}
        {rejected.length > 0 && (
          <section className="mb-8">
            <h2 className="font-display text-h3 font-medium mb-4">Not approved</h2>
            <ul className="rounded-card border border-line bg-surface overflow-hidden">
              {rejected.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between px-5 py-4 border-b border-line last:border-0"
                >
                  <Link
                    href={`/courses/${e.course_id}`}
                    className="text-body-sm text-muted hover:text-ink"
                  >
                    {e.course?.title ?? 'Course'}
                  </Link>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-pill border border-danger-border bg-danger-bg text-danger-fg text-caption">
                    <span className="w-1.5 h-1.5 rounded-pill bg-danger-fg" />
                    Rejected
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
