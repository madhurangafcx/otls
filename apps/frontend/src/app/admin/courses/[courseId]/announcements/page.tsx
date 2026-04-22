import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ApiClientError, api } from '@/lib/api';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { RowActions } from './row-actions';

type Params = { params: { courseId: string } };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default async function AdminAnnouncementsListPage({ params }: Params) {
  const { courseId } = params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect(`/login?next=/admin/courses/${courseId}/announcements`);

  let course;
  let announcements;
  try {
    const [cRes, aRes] = await Promise.all([
      api.courses.get(courseId, session.access_token),
      api.announcements.listByCourse(courseId, { limit: 50 }, session.access_token),
    ]);
    course = cRes.data;
    announcements = aRes.data;
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) notFound();
    throw err;
  }

  return (
    <div className="max-w-4xl px-8 py-10">
      <div className="text-caption uppercase text-muted mb-4 tracking-[0.08em]">
        <Link href="/admin/courses" className="hover:text-ink">
          Courses
        </Link>
        <span className="text-subtle mx-2">›</span>
        <Link href={`/admin/courses/${courseId}`} className="hover:text-ink">
          {course.title}
        </Link>
        <span className="text-subtle mx-2">›</span>
        <span>Announcements</span>
      </div>

      <div className="flex items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="font-display text-h1-sm font-medium">Announcements</h1>
          <p className="text-body-sm text-muted mt-1">
            Course-wide notices. Enrolled students see them on the course page and in
            their unread badges on /my-courses.
          </p>
        </div>
        <Link
          href={`/admin/courses/${courseId}/announcements/new`}
          className="h-10 px-5 rounded bg-accent-600 hover:bg-accent-700 text-white font-medium text-body-sm flex items-center shrink-0"
        >
          + New announcement
        </Link>
      </div>

      {announcements.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-12 text-center">
          <h2 className="font-display text-h3 mb-2">No announcements yet</h2>
          <p className="text-body-sm text-muted mb-6">
            Post the first one to tell your students something.
          </p>
          <Link
            href={`/admin/courses/${courseId}/announcements/new`}
            className="inline-flex h-10 px-5 rounded bg-accent-600 hover:bg-accent-700 text-white font-medium text-body-sm items-center"
          >
            Post first announcement
          </Link>
        </div>
      ) : (
        <ul className="rounded-card border border-line bg-surface overflow-hidden">
          {announcements.map((a) => (
            <li
              key={a.id}
              className={`px-5 py-4 border-b border-line last:border-0 ${
                a.pinned ? 'bg-warning-bg/30' : ''
              }`}
            >
              <div className="flex items-baseline justify-between gap-4 mb-1">
                <div className="min-w-0 flex items-center gap-3">
                  {a.pinned && (
                    <span className="inline-flex items-center gap-1 text-caption uppercase text-warning-fg tracking-[0.08em] shrink-0">
                      ★ Pinned
                    </span>
                  )}
                  <h3 className="font-display text-h3 font-medium truncate">{a.title}</h3>
                </div>
                <span className="text-caption text-muted shrink-0">
                  {formatDate(a.created_at)}
                </span>
              </div>
              <p className="text-body-sm text-muted whitespace-pre-wrap line-clamp-3 mb-3">
                {a.body}
              </p>
              <RowActions
                courseId={courseId}
                announcementId={a.id}
                pinned={a.pinned}
                title={a.title}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
