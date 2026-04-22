import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, ApiClientError } from '@/lib/api';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// Course detail — public view. Shows course info + placeholder "Enroll" CTA
// (real enrollment flow lands in Phase 4). Once the enrollment module is live,
// this page will render one of three states: not-enrolled (enroll button),
// pending (yellow badge + locked content), rejected (red banner).

type Params = { params: { courseId: string } };

export default async function CourseDetailPage({ params }: Params) {
  const { courseId } = params;

  // Course is public when published — no auth required
  let course;
  try {
    const res = await api.courses.get(courseId);
    course = res.data;
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  if (course.status !== 'published') {
    notFound();
  }

  // Check session for the CTA treatment (logged in → "Request enrollment",
  // logged out → "Log in to enroll")
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Breadcrumbs */}
        <div className="text-caption uppercase text-muted mb-6 tracking-[0.08em]">
          <Link href="/courses" className="hover:text-ink">
            Courses
          </Link>{' '}
          <span className="text-subtle mx-2">›</span>
          <span>{course.title}</span>
        </div>

        <h1 className="font-display text-h1 font-medium mb-4">{course.title}</h1>

        {course.description && (
          <p className="text-body-lg text-muted max-w-2xl mb-10">{course.description}</p>
        )}

        <div className="rounded-card border border-line bg-surface p-6 mb-6">
          <h2 className="font-display text-h3 mb-4">Enrollment</h2>
          <p className="text-body-sm text-muted mb-4">
            This course is open for enrollment. Semester content unlocks once an
            admin approves your request.
          </p>
          {session ? (
            <button
              disabled
              className="h-10 px-5 rounded bg-accent-600 text-white font-medium text-body-sm opacity-70 cursor-not-allowed"
              title="Enrollment will be wired up in Phase 4"
            >
              Request enrollment (Phase 4)
            </button>
          ) : (
            <Link
              href={`/login?next=/courses/${course.id}`}
              className="inline-flex h-10 px-5 rounded bg-accent-600 hover:bg-accent-700 text-white font-medium text-body-sm items-center"
            >
              Log in to enroll
            </Link>
          )}
        </div>

        <div className="rounded-card border border-line bg-surface p-6">
          <h2 className="font-display text-h3 mb-4">Semesters</h2>
          <p className="text-body-sm text-muted">
            Semester content (YouTube recording + assignment) appears here once
            your enrollment is approved.
          </p>
        </div>

        <div className="mt-8">
          <Link href="/courses" className="text-body-sm text-muted hover:text-ink">
            ← Back to catalog
          </Link>
        </div>
      </div>
    </main>
  );
}
