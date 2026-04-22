import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { api } from '@/lib/api';
import { TopNav } from '@/components/top-nav';
import { MyCoursesClient } from './my-courses-client';

export default async function MyCoursesPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect('/login?next=/my-courses');

  const [{ data: enrollments }, progressRes, announcementOverview] =
    await Promise.all([
      api.enrollments.mine(session.access_token),
      api.progress.overview(session.access_token).catch(() => ({ data: [] })),
      api.announcements.overview(session.access_token).catch(() => ({ data: [] })),
    ]);
  const announcementsByCourse = new Map(
    announcementOverview.data.map((o) => [o.course_id, o])
  );

  // Right rail: 5 most recent announcements across all approved courses.
  const railItems = announcementOverview.data
    .flatMap((o) =>
      o.recent.map((a) => ({
        ...a,
        course_title: o.course_title,
      }))
    )
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 5);

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <TopNav active="my" />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="font-display text-h1 font-medium">My Courses</h1>
          <p className="text-body-sm text-muted mt-1">
            Pick up where you left off, or revisit completed work. Browse the{' '}
            <Link href="/courses" className="text-accent-600 hover:underline">
              catalog
            </Link>{' '}
            to request more.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-8">
          <div>
            <MyCoursesClient
              enrollments={enrollments}
              progress={progressRes.data}
              announcementsByCourse={announcementsByCourse}
            />
          </div>

          {/* Right rail — kept from earlier design (beyond mockup, useful for
              students with many announcements). Collapses above the main
              column on mobile via lg: breakpoint. */}
          <aside className="lg:sticky lg:top-6 self-start">
            <h2 className="font-display text-h3 font-medium mb-4">Recent posts</h2>
            {railItems.length === 0 ? (
              <div className="rounded-card border border-line bg-surface p-5 text-body-sm text-muted">
                No announcements yet in your courses.
              </div>
            ) : (
              <ul className="rounded-card border border-line bg-surface overflow-hidden">
                {railItems.map((a) => (
                  <li
                    key={a.id}
                    className="px-4 py-3 border-b border-line last:border-0"
                  >
                    <Link
                      href={`/courses/${a.course_id}`}
                      className="block group"
                    >
                      <div className="text-caption uppercase text-muted tracking-[0.08em] mb-1 flex items-center gap-2">
                        <span className="truncate">{a.course_title}</span>
                        <span className="text-subtle">·</span>
                        <span className="shrink-0">{formatDate(a.created_at)}</span>
                      </div>
                      <div className="font-medium text-body-sm group-hover:text-accent-600 line-clamp-2">
                        {a.title}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
