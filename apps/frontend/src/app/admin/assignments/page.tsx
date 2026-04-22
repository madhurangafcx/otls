import { redirect } from 'next/navigation';
import { api } from '@/lib/api';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { AssignmentsList } from './assignments-list';

type Search = {
  searchParams: {
    course_id?: string;
    semester_id?: string;
    cursor?: string;
  };
};

// Admin assignments table. Paginated (cursor on submitted_at DESC). Course +
// semester filters live in the URL so admins can bookmark a scope. Student
// search is a client-side filter over the loaded page (backend has no
// free-text student search yet).
// Role gate lives in admin/layout.tsx; backend re-checks with requireRole.
export default async function AdminAssignmentsPage({ searchParams }: Search) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect('/login?next=/admin/assignments');

  const accessToken = session.access_token;

  const [assignmentsRes, coursesRes, semestersRes] = await Promise.all([
    api.assignments.listForAdmin(
      {
        course_id: searchParams.course_id,
        semester_id: searchParams.semester_id,
        cursor: searchParams.cursor,
        limit: 25,
      },
      accessToken
    ),
    api.courses.list({ limit: 50 }, accessToken),
    // Only fetch semesters for the filter dropdown when a course is selected.
    // Otherwise the dropdown shows "Pick a course first" and stays empty.
    searchParams.course_id
      ? api.courses.listSemesters(searchParams.course_id, accessToken)
      : Promise.resolve({
          data: [] as Awaited<ReturnType<typeof api.courses.listSemesters>>['data'],
        }),
  ]);

  const { data: assignments, pagination } = assignmentsRes;
  const courses = coursesRes.data;
  const semesters = semestersRes.data;

  const nextCursor = pagination.next_cursor;
  let nextCursorHref: string | null = null;
  if (nextCursor) {
    const qs = new URLSearchParams();
    if (searchParams.course_id) qs.set('course_id', searchParams.course_id);
    if (searchParams.semester_id) qs.set('semester_id', searchParams.semester_id);
    qs.set('cursor', nextCursor);
    nextCursorHref = `/admin/assignments?${qs.toString()}`;
  }

  return (
    <div className="px-8 py-10 max-w-6xl">
      <div className="mb-8">
        <h1 className="font-display text-h1-sm font-medium">Assignments</h1>
        <p className="text-body-sm text-muted mt-1">
          All submitted assignments. Click download for a 60-second signed link.
        </p>
      </div>

      <AssignmentsList
        assignments={assignments}
        courses={courses}
        semesters={semesters}
        selectedCourseId={searchParams.course_id}
        selectedSemesterId={searchParams.semester_id}
        nextCursorHref={nextCursorHref}
      />
    </div>
  );
}
