import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { api, ApiClientError } from '@/lib/api';
import { CourseEditorClient } from './editor-client';

// Admin course editor. Server Component loads course + semesters; a
// CourseEditorClient child handles interactive bits (rename, publish,
// add/delete semester) with session tokens from cookies.

type Params = { params: { courseId: string } };

export default async function AdminCourseEditorPage({ params }: Params) {
  const { courseId } = params;

  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  let course;
  let semesters;
  try {
    const [courseRes, semestersRes] = await Promise.all([
      api.courses.get(courseId, session.access_token),
      api.courses.listSemesters(courseId, session.access_token),
    ]);
    course = courseRes.data;
    semesters = semestersRes.data;
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="max-w-4xl px-8 py-10">
      <div className="text-caption uppercase text-muted mb-4 tracking-[0.08em]">
        <Link href="/admin/courses" className="hover:text-ink">
          Courses
        </Link>{' '}
        <span className="text-subtle mx-2">›</span>
        <span>{course.title}</span>
      </div>

      <CourseEditorClient course={course} semesters={semesters} />
    </div>
  );
}
