import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { DownloadLink } from '@/app/admin/assignments/download-link';
import { Icons } from '@/components/icons';
import { ProgressBar } from '@/components/progress-bar';
import { TopNav } from '@/components/top-nav';
import { ApiClientError, api, type SemesterPayload } from '@/lib/api';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { UploadDropzone } from './upload-dropzone';

type Params = {
  params: { courseId: string; semesterId: string };
};

// Extract the 11-char video ID from common YouTube URL shapes.
// Accepts: youtu.be/<id>, youtube.com/watch?v=<id>, youtube.com/embed/<id>,
// youtube.com/shorts/<id>. Returns null if no match.
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:v=)([A-Za-z0-9_-]{11})/,
    /(?:embed\/)([A-Za-z0-9_-]{11})/,
    /(?:shorts\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

function formatSubmittedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default async function SemesterViewerPage({ params }: Params) {
  const { courseId, semesterId } = params;

  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect(`/login?next=/courses/${courseId}/semesters/${semesterId}`);
  }

  const accessToken = session.access_token;
  const studentId = session.user.id;

  // Fetch in parallel — each failure mode is distinct.
  const [semesterRes, courseRes, mineRes, progressRes, semestersRes] =
    await Promise.allSettled([
      api.semesters.get(semesterId, accessToken),
      api.courses.get(courseId, accessToken),
      api.assignments.mine({ semester_id: semesterId }, accessToken),
      api.progress.forCourse(courseId, accessToken),
      api.courses.listSemesters(courseId, accessToken),
    ]);

  // Semester is required. 403 → not enrolled; 404 → bad id.
  if (semesterRes.status === 'rejected') {
    const err = semesterRes.reason;
    if (err instanceof ApiClientError) {
      if (err.status === 404) notFound();
      if (err.status === 403) {
        return (
          <main className="min-h-screen bg-paper text-ink">
            <TopNav active="my" />
            <div className="max-w-2xl mx-auto px-6 py-20 text-center">
              <h1 className="font-display text-h1 font-medium mb-3">Not enrolled</h1>
              <p className="text-body text-muted mb-6">
                You need an approved enrollment in this course before viewing its
                semesters.
              </p>
              <Link
                href={`/courses/${courseId}`}
                className="text-accent-600 hover:underline"
              >
                ← Back to course
              </Link>
            </div>
          </main>
        );
      }
    }
    throw err;
  }
  const semester = semesterRes.value.data;
  if (semester.course_id !== courseId) notFound();

  const course = courseRes.status === 'fulfilled' ? courseRes.value.data : null;
  const myAssignments = mineRes.status === 'fulfilled' ? mineRes.value.data : [];
  const progress = progressRes.status === 'fulfilled' ? progressRes.value.data : null;
  const allSemesters: SemesterPayload[] =
    semestersRes.status === 'fulfilled' ? semestersRes.value.data : [];

  // Sort defensively — backend returns sorted but we key prev/next off the
  // array position so don't trust incoming order silently.
  const sortedSemesters = [...allSemesters].sort((a, b) => a.sort_order - b.sort_order);
  const currentIndex = sortedSemesters.findIndex((s) => s.id === semesterId);
  const prev = currentIndex > 0 ? sortedSemesters[currentIndex - 1] : null;
  const next =
    currentIndex >= 0 && currentIndex < sortedSemesters.length - 1
      ? sortedSemesters[currentIndex + 1]
      : null;
  const displayIndex = currentIndex >= 0 ? currentIndex + 1 : null;

  const ytId = semester.youtube_url ? extractYouTubeId(semester.youtube_url) : null;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <TopNav active="my" />
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Back to course link (replaces the trailing "← Back" hack) */}
        <Link
          href={`/courses/${courseId}`}
          className="inline-flex items-center gap-1 text-body-sm text-muted hover:text-ink mb-6 transition-colors"
        >
          <Icons.ChevronLeft size={16} />
          {course?.title ?? 'Back to course'}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px] gap-10">
          {/* ── Main column ─────────────────────────────────────── */}
          <div className="min-w-0">
            {/* Eyebrow + title */}
            {displayIndex != null && (
              <div className="text-caption uppercase tracking-[0.09em] text-accent-600 mb-3">
                Semester {String(displayIndex).padStart(2, '0')}
              </div>
            )}
            <h1 className="font-display text-h1 font-medium mb-3">{semester.title}</h1>
            {semester.description && (
              <p className="text-body text-muted max-w-2xl mb-8">
                {semester.description}
              </p>
            )}

            {/* YouTube */}
            <div className="rounded-card border border-line bg-surface overflow-hidden mb-8">
              {ytId ? (
                <div className="aspect-video bg-ink">
                  <iframe
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
                    title={semester.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="aspect-video flex items-center justify-center text-muted text-body-sm">
                  No video available yet.
                </div>
              )}
            </div>

            {/* Upload */}
            <div className="mb-8">
              <UploadDropzone studentId={studentId} semesterId={semesterId} />
            </div>

            {/* Submissions history */}
            <section className="mb-10">
              <h2 className="font-display text-h3 font-medium mb-4">Your submissions</h2>
              {myAssignments.length === 0 ? (
                <div className="rounded-card border border-line bg-surface p-6 text-center text-body-sm text-muted">
                  No submissions yet. Upload above to mark this semester complete.
                </div>
              ) : (
                <ul className="rounded-card border border-line bg-surface overflow-hidden">
                  {myAssignments.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-4 px-5 py-4 border-b border-line last:border-0"
                    >
                      <div className="min-w-0 mr-4 flex items-center gap-3">
                        <Icons.FileText size={20} className="text-muted shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-body truncate">
                            {a.file_name}
                          </div>
                          <div className="text-caption text-muted mt-0.5">
                            {a.file_type.toUpperCase()} · submitted{' '}
                            {formatSubmittedAt(a.submitted_at)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-pill border border-success-border bg-success-bg text-success-fg text-caption">
                          <span className="w-1.5 h-1.5 rounded-pill bg-success-fg" />
                          Submitted
                        </span>
                        <DownloadLink assignmentId={a.id} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Prev / Next nav */}
            {sortedSemesters.length > 1 && (
              <nav
                aria-label="Semester navigation"
                className="flex items-center justify-between gap-3 pt-6 border-t border-line"
              >
                {prev ? (
                  <Link
                    href={`/courses/${courseId}/semesters/${prev.id}`}
                    className="flex-1 rounded border border-line bg-surface hover:bg-paper p-4 transition-colors group"
                  >
                    <div className="flex items-center gap-1 text-caption uppercase text-muted mb-1">
                      <Icons.ChevronLeft size={14} />
                      Previous
                    </div>
                    <div className="font-display text-body font-medium truncate group-hover:text-accent-600">
                      {prev.title}
                    </div>
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}
                {next ? (
                  <Link
                    href={`/courses/${courseId}/semesters/${next.id}`}
                    className="flex-1 rounded border border-line bg-surface hover:bg-paper p-4 transition-colors text-right group"
                  >
                    <div className="flex items-center justify-end gap-1 text-caption uppercase text-muted mb-1">
                      Next
                      <Icons.ChevronRight size={14} />
                    </div>
                    <div className="font-display text-body font-medium truncate group-hover:text-accent-600">
                      {next.title}
                    </div>
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}
              </nav>
            )}
          </div>

          {/* ── Sidebar: all semesters + course progress ────────── */}
          <aside className="lg:sticky lg:top-6 self-start">
            <div className="text-caption uppercase tracking-[0.09em] text-muted mb-3">
              Course
            </div>
            {course && (
              <div className="font-display text-h4 font-medium mb-4 leading-tight">
                {course.title}
              </div>
            )}
            <ol className="rounded-card border border-line bg-surface overflow-hidden">
              {sortedSemesters.map((s, i) => {
                const isCurrent = s.id === semesterId;
                const isComplete = s.completed_by_me === true;
                const rowClasses = isCurrent
                  ? 'bg-accent-50 border-l-2 border-accent-600'
                  : 'hover:bg-paper border-l-2 border-transparent';
                const content = (
                  <div
                    className={`flex items-start gap-3 px-4 py-3 border-b border-line last:border-0 transition-colors ${rowClasses}`}
                  >
                    {isComplete ? (
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 rounded-pill bg-success-bg text-success-fg shrink-0"
                        title="Completed"
                      >
                        <Icons.Check size={12} />
                      </span>
                    ) : (
                      <span
                        className={`w-5 text-caption tabular-nums shrink-0 mt-0.5 text-center ${
                          isCurrent ? 'text-accent-600' : 'text-subtle'
                        }`}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    )}
                    <span
                      className={`text-body-sm leading-snug ${
                        isCurrent
                          ? 'text-ink font-medium'
                          : isComplete
                            ? 'text-ink'
                            : 'text-muted'
                      }`}
                    >
                      {s.title}
                    </span>
                  </div>
                );
                return (
                  <li key={s.id}>
                    {isCurrent ? (
                      content
                    ) : (
                      <Link href={`/courses/${courseId}/semesters/${s.id}`}>
                        {content}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>

            {progress && progress.total > 0 && (
              <div className="mt-5">
                <div className="flex items-baseline justify-between text-caption text-muted mb-2">
                  <span>
                    {progress.completed} of {progress.total} complete
                  </span>
                  <span className="tabular-nums">{progress.percentage}%</span>
                </div>
                <ProgressBar value={progress.percentage} showLabel={false} />
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
