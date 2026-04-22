import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ApiClientError, api } from '@/lib/api';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { EnrollmentsClient } from './enrollments-client';

type Params = { params: { courseId: string } };

export default async function AdminCourseEnrollmentsPage({ params }: Params) {
  const { courseId } = params;

  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  let course: Awaited<ReturnType<typeof api.courses.get>>['data'];
  let enrollments: Awaited<ReturnType<typeof api.enrollments.listForCourse>>['data'];
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

  return (
    <div className="max-w-6xl px-8 py-10">
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

      <EnrollmentsClient initial={enrollments} />
    </div>
  );
}
