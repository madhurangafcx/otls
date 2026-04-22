import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { api, ApiClientError } from '@/lib/api';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { UploadDropzone } from './upload-dropzone';
import { TopNav } from '@/components/top-nav';

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
  const [semesterRes, courseRes, mineRes, progressRes] = await Promise.allSettled([
    api.semesters.get(semesterId, accessToken),
    api.courses.get(courseId, accessToken),
    api.assignments.mine({ semester_id: semesterId }, accessToken),
    api.progress.forCourse(courseId, accessToken),
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
  const myAssignments =
    mineRes.status === 'fulfilled' ? mineRes.value.data : [];
  const progress =
    progressRes.status === 'fulfilled' ? progressRes.value.data : null;

  const ytId = semester.youtube_url ? extractYouTubeId(semester.youtube_url) : null;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <TopNav active="my" />
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Breadcrumb */}
        <div className="text-caption uppercase text-muted mb-6 tracking-[0.08em]">
          <Link href="/courses" className="hover:text-ink">
            Courses
          </Link>
          <span className="text-subtle mx-2">›</span>
          <Link href={`/courses/${courseId}`} className="hover:text-ink">
            {course?.title ?? 'Course'}
          </Link>
          <span className="text-subtle mx-2">›</span>
          <span>{semester.title}</span>
        </div>

        <div className="flex items-baseline justify-between mb-2">
          <h1 className="font-display text-h1 font-medium">{semester.title}</h1>
          {progress && progress.total > 0 && (
            <span className="text-caption uppercase text-muted tracking-[0.08em]">
              {progress.completed}/{progress.total} semesters · {progress.percentage}%
            </span>
          )}
        </div>
        {semester.description && (
          <p className="text-body text-muted max-w-2xl mb-8">{semester.description}</p>
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
        <section>
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
                  className="flex items-center justify-between px-5 py-4 border-b border-line last:border-0"
                >
                  <div className="min-w-0 mr-4">
                    <div className="font-medium text-body truncate">{a.file_name}</div>
                    <div className="text-caption text-muted mt-0.5">
                      {a.file_type.toUpperCase()} · submitted {formatSubmittedAt(a.submitted_at)}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-pill border border-success-border bg-success-bg text-success-fg text-caption shrink-0">
                    <span className="w-1.5 h-1.5 rounded-pill bg-success-fg" />
                    Submitted
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-10">
          <Link
            href={`/courses/${courseId}`}
            className="text-body-sm text-muted hover:text-ink"
          >
            ← Back to course
          </Link>
        </div>
      </div>
    </main>
  );
}
