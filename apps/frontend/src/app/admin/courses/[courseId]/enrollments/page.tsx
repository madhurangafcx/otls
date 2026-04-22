import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { api, ApiClientError } from '@/lib/api';
import { EnrollmentActions } from './enrollment-actions';

type Params = { params: { courseId: string } };

export default async function AdminCourseEnrollmentsPage({ params }: Params) {
  const { courseId } = params;

  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  let course;
  let enrollments;
  try {
    const [courseRes, enrollmentsRes] = await Promise.all([
      api.courses.get(courseId, session.access_token),
      api.enrollments.listForCourse(courseId, undefined, session.access_token),
    ]);
    course = courseRes.data;
    enrollments = enrollmentsRes.data;
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) notFound();
    throw err;
  }

  const pending = enrollments.filter((e) => e.status === 'pending');
  const approved = enrollments.filter((e) => e.status === 'approved');
  const rejected = enrollments.filter((e) => e.status === 'rejected');

  return (
    <div className="max-w-5xl px-8 py-10">
      <div className="text-caption uppercase text-muted mb-4 tracking-[0.08em]">
        <Link href="/admin/courses" className="hover:text-ink">
          Courses
        </Link>{' '}
        <span className="text-subtle mx-2">›</span>
        <Link href={`/admin/courses/${courseId}`} className="hover:text-ink">
          {course.title}
        </Link>{' '}
        <span className="text-subtle mx-2">›</span>
        <span>Enrollments</span>
      </div>

      <h1 className="font-display text-h1-sm font-medium mb-2">Enrollments</h1>
      <p className="text-body-sm text-muted mb-8">
        Review and approve enrollment requests for{' '}
        <span className="font-medium text-ink">{course.title}</span>.
      </p>

      <EnrollmentsSection title="Pending review" items={pending} showActions />
      <EnrollmentsSection title="Approved" items={approved} showActions={false} />
      <EnrollmentsSection title="Rejected" items={rejected} showActions />
    </div>
  );
}

type EnrollmentItem = Awaited<
  ReturnType<typeof api.enrollments.listForCourse>
>['data'][number];

function EnrollmentsSection({
  title,
  items,
  showActions,
}: {
  title: string;
  items: EnrollmentItem[];
  showActions: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="font-display text-h3 font-medium mb-4">
        {title} <span className="text-muted font-normal">({items.length})</span>
      </h2>
      <div className="rounded-card border border-line bg-surface overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left px-4 py-3 text-caption uppercase text-muted bg-paper border-b border-line">
                Student
              </th>
              <th className="text-left px-4 py-3 text-caption uppercase text-muted bg-paper border-b border-line">
                Requested
              </th>
              <th className="text-left px-4 py-3 text-caption uppercase text-muted bg-paper border-b border-line">
                Status
              </th>
              {showActions && (
                <th className="px-4 py-3 bg-paper border-b border-line" />
              )}
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3.5">
                  <div className="font-medium text-body">
                    {e.student?.full_name ?? '—'}
                  </div>
                  <div className="text-body-sm text-muted">
                    {e.student?.email ?? '—'}
                  </div>
                </td>
                <td className="px-4 py-3.5 text-body-sm text-muted tabular">
                  {new Date(e.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={e.status} />
                </td>
                {showActions && (
                  <td className="px-4 py-3.5 text-right">
                    <EnrollmentActions enrollmentId={e.id} currentStatus={e.status} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  // Tailwind JIT needs the full class name literal in source to compile it.
  // Can't use `bg-${x}-bg` — need explicit mapping to static class strings.
  const styles = {
    pending: {
      wrap: 'bg-warning-bg border-warning-border text-warning-fg',
      dot: 'bg-warning-fg',
      label: 'Pending',
    },
    approved: {
      wrap: 'bg-success-bg border-success-border text-success-fg',
      dot: 'bg-success-fg',
      label: 'Approved',
    },
    rejected: {
      wrap: 'bg-danger-bg border-danger-border text-danger-fg',
      dot: 'bg-danger-fg',
      label: 'Rejected',
    },
  } as const;
  const s = styles[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-caption uppercase px-2 py-0.5 rounded-pill border ${s.wrap}`}
    >
      <span className={`w-1.5 h-1.5 rounded-pill ${s.dot}`} />
      {s.label}
    </span>
  );
}
