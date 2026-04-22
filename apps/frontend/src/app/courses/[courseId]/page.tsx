import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { api, ApiClientError, type AnnouncementPayload } from '@/lib/api';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { EnrollButton } from './enroll-button';
import { AnnouncementCard } from '@/components/announcement-card';
import { TopNav } from '@/components/top-nav';

type Params = { params: { courseId: string } };

// Course detail — blueprint §15.4 student UI states:
//   No record     → "Request enrollment" button
//   pending       → yellow badge "Pending approval", content greyed
//   approved      → green badge, semester list visible
//   rejected      → red banner "Contact admin"
//
// Plus the anonymous case: "Log in to enroll" (CTA linking to /login?next=...)

export default async function CourseDetailPage({ params }: Params) {
  const { courseId } = params;

  let course;
  try {
    const res = await api.courses.get(courseId);
    course = res.data;
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) notFound();
    throw err;
  }

  if (course.status !== 'published') notFound();

  // Fetch session + enrollment state + (if approved) the semester list
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let enrollment: {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
  } | null = null;
  let semesters: Awaited<ReturnType<typeof api.courses.listSemesters>>['data'] | null =
    null;
  let announcements: AnnouncementPayload[] = [];

  if (session) {
    // Get my enrollments, find one for this course. Cheaper than a dedicated endpoint.
    const mine = await api.enrollments.mine(session.access_token);
    enrollment = mine.data.find((e) => e.course_id === courseId) ?? null;

    if (enrollment?.status === 'approved') {
      const [semRes, annRes] = await Promise.allSettled([
        api.courses.listSemesters(courseId, session.access_token),
        // Loading this list marks-read server-side (updates enrollments
        // .last_announcement_read_at). That clears the unread badge on
        // /my-courses on next load — which is the design-doc contract:
        // "tapping the course clears the count".
        api.announcements.listByCourse(courseId, { limit: 20 }, session.access_token),
      ]);
      semesters = semRes.status === 'fulfilled' ? semRes.value.data : [];
      announcements = annRes.status === 'fulfilled' ? annRes.value.data : [];
    }
  }

  // App origin for the WhatsApp share link body. Prefers the configured env
  // var; falls back to the actual request host so local dev and deployed
  // previews both produce clickable links.
  const hdrs = await headers();
  const appOrigin =
    process.env.NEXT_PUBLIC_APP_URL ??
    (() => {
      const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
      const proto = hdrs.get('x-forwarded-proto') ?? 'http';
      return host ? `${proto}://${host}` : 'http://localhost:3000';
    })();

  return (
    <main className="min-h-screen bg-paper text-ink">
      <TopNav active="catalog" />
      <div className="max-w-3xl mx-auto px-6 py-12">
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

        {/* Enrollment card — state machine */}
        <EnrollmentCard
          courseId={course.id}
          enrollment={enrollment}
          loggedIn={!!session}
        />

        {/* Announcements feed — only to approved students. Pinned first, then chrono. */}
        {enrollment?.status === 'approved' && announcements.length > 0 && (
          <section className="mt-8 mb-6">
            <h2 className="font-display text-h3 font-medium mb-3">Announcements</h2>
            <div className="space-y-3">
              {announcements.map((a) => (
                <AnnouncementCard
                  key={a.id}
                  announcement={a}
                  appOrigin={appOrigin}
                  variant={a.pinned ? 'pinned' : 'compact'}
                />
              ))}
            </div>
          </section>
        )}

        {/* Semester list — only visible to approved students */}
        {enrollment?.status === 'approved' && (
          <div className="rounded-card border border-line bg-surface overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-line">
              <h2 className="font-display text-h3 font-medium">Semesters</h2>
            </div>
            {!semesters || semesters.length === 0 ? (
              <div className="px-6 py-10 text-center text-body-sm text-muted">
                No semesters yet.
              </div>
            ) : (
              <ul>
                {semesters.map((s) => (
                  <li
                    key={s.id}
                    className="grid grid-cols-[56px_1fr_auto] items-center gap-4 px-5 py-4 border-b border-line last:border-0"
                  >
                    <span className="font-display text-[24px] text-muted font-medium tabular">
                      {String(s.sort_order + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <div className="font-medium text-body">{s.title}</div>
                      {s.description && (
                        <div className="text-body-sm text-muted line-clamp-1">
                          {s.description}
                        </div>
                      )}
                    </div>
                    <Link
                      href={`/courses/${course.id}/semesters/${s.id}`}
                      className="text-accent-600 text-body-sm font-medium hover:underline"
                    >
                      View →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-8">
          <Link href="/courses" className="text-body-sm text-muted hover:text-ink">
            ← Back to catalog
          </Link>
        </div>
      </div>
    </main>
  );
}

function EnrollmentCard({
  courseId,
  enrollment,
  loggedIn,
}: {
  courseId: string;
  enrollment: { id: string; status: 'pending' | 'approved' | 'rejected' } | null;
  loggedIn: boolean;
}) {
  // Anonymous
  if (!loggedIn) {
    return (
      <div className="rounded-card border border-line bg-surface p-6 mb-6">
        <h2 className="font-display text-h3 font-medium mb-3">Enrollment</h2>
        <p className="text-body-sm text-muted mb-4">
          Log in to request enrollment. Once an admin approves, you&apos;ll see
          the course&apos;s semesters + can submit assignments.
        </p>
        <Link
          href={`/login?next=/courses/${courseId}`}
          className="inline-flex h-10 px-5 rounded bg-accent-600 hover:bg-accent-700 text-white font-medium text-body-sm items-center"
        >
          Log in to enroll
        </Link>
      </div>
    );
  }

  // No record
  if (!enrollment) {
    return (
      <div className="rounded-card border border-line bg-surface p-6 mb-6">
        <h2 className="font-display text-h3 font-medium mb-3">Enrollment</h2>
        <p className="text-body-sm text-muted mb-4">
          Request enrollment. Course content unlocks once an admin approves.
        </p>
        <EnrollButton courseId={courseId} />
      </div>
    );
  }

  // Pending
  if (enrollment.status === 'pending') {
    return (
      <div className="rounded-card border border-warning-border bg-warning-bg p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-2 h-2 rounded-pill bg-warning-fg" />
          <h2 className="font-display text-h3 font-medium text-warning-fg">
            Pending review
          </h2>
        </div>
        <p className="text-body-sm text-warning-fg">
          Your request is with an admin. You&apos;ll get access as soon as it&apos;s approved.
        </p>
      </div>
    );
  }

  // Approved
  if (enrollment.status === 'approved') {
    return (
      <div className="rounded-card border border-success-border bg-success-bg p-6 mb-6">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-pill bg-success-fg" />
          <h2 className="font-display text-h3 font-medium text-success-fg">
            You&apos;re enrolled
          </h2>
        </div>
        <p className="text-body-sm text-success-fg mt-2">
          Scroll down for the semester list.
        </p>
      </div>
    );
  }

  // Rejected
  return (
    <div className="rounded-card border border-danger-border bg-danger-bg p-6 mb-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="w-2 h-2 rounded-pill bg-danger-fg" />
        <h2 className="font-display text-h3 font-medium text-danger-fg">
          Enrollment rejected
        </h2>
      </div>
      <p className="text-body-sm text-danger-fg">
        Your request wasn&apos;t approved. Contact an admin if you think this is a mistake.
      </p>
    </div>
  );
}
