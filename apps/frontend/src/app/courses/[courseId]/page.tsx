import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { api, ApiClientError, type AnnouncementPayload } from '@/lib/api';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { EnrollButton } from './enroll-button';
import { AnnouncementCard } from '@/components/announcement-card';
import { TopNav } from '@/components/top-nav';
import { Icons } from '@/components/icons';

type Params = { params: { courseId: string } };

// Course detail — blueprint §15.4 student UI states:
//   No record     → "Request enrollment" button
//   pending       → yellow badge "Pending approval", content greyed
//   approved      → green badge, semester list visible
//   rejected      → red banner "Contact admin"
// Plus the anonymous case: "Log in to enroll" (CTA linking to /login?next=...)
//
// Two-column layout per docs/design/GAPS.md §3: content left, sticky
// enrollment card right. Non-approved visitors see a locked-preview
// semester list populated from the public /semester-titles endpoint.

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

  // Fetch session + enrollment state + (if approved) the full semester list
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let enrollment: {
    id: string;
    status: 'pending' | 'approved' | 'rejected';
  } | null = null;
  let fullSemesters: Awaited<
    ReturnType<typeof api.courses.listSemesters>
  >['data'] | null = null;
  let announcements: AnnouncementPayload[] = [];

  if (session) {
    const mine = await api.enrollments.mine(session.access_token);
    enrollment = mine.data.find((e) => e.course_id === courseId) ?? null;

    if (enrollment?.status === 'approved') {
      const [semRes, annRes] = await Promise.allSettled([
        api.courses.listSemesters(courseId, session.access_token),
        // Loading this list marks-read server-side (updates enrollments
        // .last_announcement_read_at). That clears the unread badge on
        // /my-courses on next load.
        api.announcements.listByCourse(courseId, { limit: 20 }, session.access_token),
      ]);
      fullSemesters = semRes.status === 'fulfilled' ? semRes.value.data : [];
      announcements = annRes.status === 'fulfilled' ? annRes.value.data : [];
    }
  }

  // Titles-only preview for visitors who aren't approved yet. Published courses
  // expose their semester titles so users see what they'll get upon enrolling.
  let titlesPreview:
    | { id: string; title: string; sort_order: number }[]
    | null = null;
  if (enrollment?.status !== 'approved') {
    try {
      const res = await api.courses.listSemesterTitles(courseId);
      titlesPreview = res.data;
    } catch {
      titlesPreview = [];
    }
  }

  // App origin for the WhatsApp share link body.
  const hdrs = await headers();
  const appOrigin =
    process.env.NEXT_PUBLIC_APP_URL ??
    (() => {
      const host = hdrs.get('x-forwarded-host') ?? hdrs.get('host');
      const proto = hdrs.get('x-forwarded-proto') ?? 'http';
      return host ? `${proto}://${host}` : 'http://localhost:3000';
    })();

  const semesterCount =
    course.semester_count ??
    fullSemesters?.length ??
    titlesPreview?.length ??
    0;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <TopNav active="catalog" />
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Breadcrumb */}
        <div className="text-caption uppercase text-muted mb-6 tracking-[0.08em]">
          <Link href="/courses" className="hover:text-ink">
            Courses
          </Link>{' '}
          <span className="text-subtle mx-2">›</span>
          <span>{course.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-10">
          {/* ── Main column ─────────────────────────────────────── */}
          <div className="min-w-0">
            {semesterCount > 0 && (
              <div className="text-caption uppercase tracking-[0.09em] text-accent-600 mb-3">
                {semesterCount} semester{semesterCount === 1 ? '' : 's'}
              </div>
            )}
            <h1 className="font-display text-h1 font-medium mb-4">{course.title}</h1>
            {course.description && (
              <p className="text-body-lg text-muted max-w-2xl mb-10 font-serif leading-relaxed">
                {course.description}
              </p>
            )}

            {/* Announcements feed — only to approved students */}
            {enrollment?.status === 'approved' && announcements.length > 0 && (
              <section className="mb-8">
                <h2 className="font-display text-h3 font-medium mb-3">
                  Announcements
                </h2>
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

            {/* Approved — unlocked semester list with links */}
            {enrollment?.status === 'approved' && (
              <section>
                <h2 className="font-display text-h3 font-medium mb-4">Semesters</h2>
                <div className="rounded-card border border-line bg-surface overflow-hidden">
                  {!fullSemesters || fullSemesters.length === 0 ? (
                    <div className="px-6 py-10 text-center text-body-sm text-muted">
                      No semesters yet.
                    </div>
                  ) : (
                    <ul>
                      {fullSemesters.map((s, i) => (
                        <li
                          key={s.id}
                          className="grid grid-cols-[56px_1fr_auto] items-center gap-4 px-5 py-4 border-b border-line last:border-0"
                        >
                          <span className="font-display text-[24px] text-muted font-medium tabular-nums">
                            {String(i + 1).padStart(2, '0')}
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
                            className="text-accent-600 text-body-sm font-medium hover:underline inline-flex items-center gap-1"
                          >
                            View
                            <Icons.ArrowRight size={14} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            )}

            {/* Not approved — locked preview list */}
            {enrollment?.status !== 'approved' && titlesPreview && (
              <section>
                <h2 className="font-display text-h3 font-medium mb-4">
                  What you&apos;ll learn
                </h2>
                <div className="rounded-card border border-line bg-surface overflow-hidden">
                  {titlesPreview.length === 0 ? (
                    <div className="px-6 py-10 text-center text-body-sm text-muted">
                      No semesters yet.
                    </div>
                  ) : (
                    <ul>
                      {titlesPreview.map((s, i) => (
                        <li
                          key={s.id}
                          className="grid grid-cols-[56px_1fr_auto] items-center gap-4 px-5 py-4 border-b border-line last:border-0"
                        >
                          <span className="font-display text-[24px] text-subtle font-medium tabular-nums">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <div className="font-medium text-body text-muted">
                            {s.title}
                          </div>
                          <span
                            className="inline-flex items-center gap-1.5 text-caption text-subtle"
                            title="Enroll to view"
                          >
                            <Icons.Lock size={14} />
                            Locked
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* ── Sticky enrollment card ─────────────────────────── */}
          <aside className="lg:sticky lg:top-6 self-start">
            <EnrollmentCard
              courseId={course.id}
              enrollment={enrollment}
              loggedIn={!!session}
              semesterCount={semesterCount}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

function EnrollmentCard({
  courseId,
  enrollment,
  loggedIn,
  semesterCount,
}: {
  courseId: string;
  enrollment: { id: string; status: 'pending' | 'approved' | 'rejected' } | null;
  loggedIn: boolean;
  semesterCount: number;
}) {
  const metaList = (
    <ul className="space-y-2.5 mt-5 text-body-sm text-muted">
      {semesterCount > 0 && (
        <li className="flex items-center gap-2">
          <Icons.Layers size={16} className="text-subtle shrink-0" />
          {semesterCount} semester{semesterCount === 1 ? '' : 's'}
        </li>
      )}
      <li className="flex items-center gap-2">
        <Icons.PlayCircle size={16} className="text-subtle shrink-0" />
        Video lessons
      </li>
      <li className="flex items-center gap-2">
        <Icons.FileText size={16} className="text-subtle shrink-0" />
        PDF or DOCX assignments
      </li>
      <li className="flex items-center gap-2">
        <Icons.UserCheck size={16} className="text-subtle shrink-0" />
        Instructor feedback
      </li>
    </ul>
  );

  // Anonymous
  if (!loggedIn) {
    return (
      <div className="rounded-card border border-line bg-surface p-6">
        <h2 className="font-display text-h4 font-medium mb-2">Enrollment</h2>
        <p className="text-body-sm text-muted mb-4">
          Log in to request enrollment. Once an admin approves, the full
          course unlocks.
        </p>
        <Link
          href={`/login?next=/courses/${courseId}`}
          className="w-full inline-flex justify-center items-center h-10 px-5 rounded bg-accent-600 hover:bg-accent-700 text-white font-medium text-body-sm"
        >
          Log in to enroll
        </Link>
        <div className="h-px bg-line my-5" />
        {metaList}
      </div>
    );
  }

  // No record yet
  if (!enrollment) {
    return (
      <div className="rounded-card border border-line bg-surface p-6">
        <h2 className="font-display text-h4 font-medium mb-2">Enrollment</h2>
        <p className="text-body-sm text-muted mb-4">
          Request enrollment. Course content unlocks once an admin approves.
        </p>
        <EnrollButton courseId={courseId} />
        <div className="h-px bg-line my-5" />
        {metaList}
      </div>
    );
  }

  // Pending
  if (enrollment.status === 'pending') {
    return (
      <div className="rounded-card border border-warning-border bg-warning-bg p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-pill bg-warning-fg" />
          <h2 className="font-display text-h4 font-medium text-warning-fg">
            Pending review
          </h2>
        </div>
        <p className="text-body-sm text-warning-fg">
          Your request is with an admin. You&apos;ll get access as soon as it&apos;s
          approved.
        </p>
      </div>
    );
  }

  // Approved
  if (enrollment.status === 'approved') {
    return (
      <div className="rounded-card border border-success-border bg-success-bg p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-pill bg-success-fg" />
          <h2 className="font-display text-h4 font-medium text-success-fg">
            You&apos;re enrolled
          </h2>
        </div>
        <p className="text-body-sm text-success-fg mb-4">
          Dive into the semester list below.
        </p>
        <Link
          href="/my-courses"
          className="inline-flex items-center gap-1 text-body-sm font-medium text-success-fg hover:underline"
        >
          View all my courses
          <Icons.ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  // Rejected
  return (
    <div className="rounded-card border border-danger-border bg-danger-bg p-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-pill bg-danger-fg" />
        <h2 className="font-display text-h4 font-medium text-danger-fg">
          Enrollment rejected
        </h2>
      </div>
      <p className="text-body-sm text-danger-fg">
        Your request wasn&apos;t approved. Contact an admin if you think this is a
        mistake.
      </p>
    </div>
  );
}
