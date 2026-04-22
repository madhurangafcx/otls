import Link from 'next/link';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { DownloadLink } from './download-link';

type Search = {
  searchParams: {
    course_id?: string;
    semester_id?: string;
    student_id?: string;
    cursor?: string;
  };
};

function formatSubmittedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// Admin assignments table. Paginated (cursor on submitted_at DESC). Filters in
// the URL so admins can bookmark a scope (e.g. ?course_id=...).
// Role gate lives in admin/layout.tsx; backend re-checks with requireRole.
export default async function AdminAssignmentsPage({ searchParams }: Search) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect('/login?next=/admin/assignments');

  const { data, pagination } = await api.assignments.listForAdmin(
    {
      course_id: searchParams.course_id,
      semester_id: searchParams.semester_id,
      student_id: searchParams.student_id,
      cursor: searchParams.cursor,
      limit: 25,
    },
    session.access_token
  );

  const nextCursor = pagination.next_cursor;
  const baseQs = new URLSearchParams();
  if (searchParams.course_id) baseQs.set('course_id', searchParams.course_id);
  if (searchParams.semester_id) baseQs.set('semester_id', searchParams.semester_id);
  if (searchParams.student_id) baseQs.set('student_id', searchParams.student_id);

  return (
    <div className="px-8 py-10 max-w-6xl">
      <div className="flex items-baseline justify-between mb-8">
        <div>
          <h1 className="font-display text-h1 font-medium">Assignments</h1>
          <p className="text-body-sm text-muted mt-1">
            All submitted assignments. Click download for a 60-second signed link.
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-12 text-center">
          <h2 className="font-display text-h3 mb-2">No submissions yet</h2>
          <p className="text-body-sm text-muted">
            Assignments show up here once students start submitting.
          </p>
        </div>
      ) : (
        <div className="rounded-card border border-line bg-surface overflow-hidden">
          <table className="w-full text-body-sm">
            <thead className="bg-paper border-b border-line">
              <tr className="text-caption uppercase text-muted tracking-[0.08em]">
                <th className="text-left px-5 py-3 font-medium">Student</th>
                <th className="text-left px-5 py-3 font-medium">Course · Semester</th>
                <th className="text-left px-5 py-3 font-medium">File</th>
                <th className="text-left px-5 py-3 font-medium">Submitted</th>
                <th className="text-right px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-4">
                    <div className="font-medium">
                      {a.student?.full_name ?? 'Unknown'}
                    </div>
                    <div className="text-caption text-muted">
                      {a.student?.email ?? ''}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium">
                      {a.semester?.course?.title ?? '—'}
                    </div>
                    <div className="text-caption text-muted">
                      {a.semester?.title ?? ''}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-medium truncate max-w-[220px]">
                      {a.file_name}
                    </div>
                    <div className="text-caption text-muted uppercase">
                      {a.file_type}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted">
                    {formatSubmittedAt(a.submitted_at)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <DownloadLink assignmentId={a.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nextCursor && (
        <div className="mt-6 flex justify-center">
          <Link
            href={`/admin/assignments?${(() => {
              const qs = new URLSearchParams(baseQs);
              qs.set('cursor', nextCursor);
              return qs.toString();
            })()}`}
            className="inline-flex h-10 px-5 rounded border border-line bg-surface hover:bg-paper text-body-sm font-medium items-center"
          >
            Load next page →
          </Link>
        </div>
      )}
    </div>
  );
}
