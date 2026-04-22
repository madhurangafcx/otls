import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { api } from '@/lib/api';

// Admin Courses list. Table with title / status badge / updated / actions.

export default async function AdminCoursesPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const result = await api.courses.list({ limit: 50 }, session.access_token);

  return (
    <div className="max-w-5xl px-8 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-display text-h1-sm font-medium">Courses</h1>
          <p className="text-body-sm text-muted mt-1">
            Create + manage courses. Drafts aren&apos;t visible in the public catalog.
          </p>
        </div>
        <Link
          href="/admin/courses/new"
          className="inline-flex h-10 px-5 rounded bg-accent-600 hover:bg-accent-700 text-white font-medium text-body-sm items-center"
        >
          New course
        </Link>
      </div>

      {result.data.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-12 text-center">
          <h2 className="font-display text-h3 mb-2">No courses yet</h2>
          <p className="text-body-sm text-muted mb-4">
            Create your first course to get started.
          </p>
          <Link
            href="/admin/courses/new"
            className="inline-flex h-10 px-5 rounded bg-accent-600 hover:bg-accent-700 text-white font-medium text-body-sm items-center"
          >
            Create course
          </Link>
        </div>
      ) : (
        <div className="rounded-card border border-line bg-surface overflow-hidden">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 text-caption uppercase text-muted bg-paper border-b border-line">
                  Title
                </th>
                <th className="text-left px-4 py-3 text-caption uppercase text-muted bg-paper border-b border-line">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-caption uppercase text-muted bg-paper border-b border-line">
                  Updated
                </th>
                <th className="px-4 py-3 bg-paper border-b border-line" />
              </tr>
            </thead>
            <tbody>
              {result.data.map((course) => (
                <tr key={course.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/admin/courses/${course.id}`}
                      className="text-body hover:text-accent-600 font-medium"
                    >
                      {course.title}
                    </Link>
                    {course.description && (
                      <div className="text-body-sm text-muted line-clamp-1">
                        {course.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 text-caption uppercase px-2 py-0.5 rounded-pill border ${
                        course.status === 'published'
                          ? 'bg-success-bg border-success-border text-success-fg'
                          : 'bg-warning-bg border-warning-border text-warning-fg'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-pill ${
                          course.status === 'published' ? 'bg-success-fg' : 'bg-warning-fg'
                        }`}
                      />
                      {course.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-body-sm text-muted tabular">
                    {new Date(course.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/admin/courses/${course.id}`}
                      className="text-accent-600 text-body-sm hover:underline"
                    >
                      Edit →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
