import Link from 'next/link';
import { Icons } from '@/components/icons';
import { api } from '@/lib/api';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { CoursesTable } from './courses-table';

// Admin Courses list. Table with title / semesters / enrollments / status /
// updated / edit. Filter + search handled client-side in CoursesTable.

export default async function AdminCoursesPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const result = await api.courses.list({ limit: 50 }, session.access_token);

  return (
    <div className="max-w-6xl px-8 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-display text-h1-sm font-medium">Courses</h1>
          <p className="text-body-sm text-muted mt-1">
            Create + manage courses. Drafts aren&apos;t visible in the public catalog.
          </p>
        </div>
        <Link
          href="/admin/courses/new"
          className="inline-flex items-center gap-1.5 h-10 px-5 rounded bg-accent-600 hover:bg-accent-700 text-white font-medium text-body-sm"
        >
          <Icons.Plus size={16} />
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
        <CoursesTable courses={result.data} />
      )}
    </div>
  );
}
