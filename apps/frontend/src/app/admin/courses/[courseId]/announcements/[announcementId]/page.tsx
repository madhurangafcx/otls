import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { api, ApiClientError } from '@/lib/api';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { AnnouncementForm } from '../announcement-form';

type Params = {
  params: { courseId: string; announcementId: string };
};

export default async function EditAnnouncementPage({ params }: Params) {
  const { courseId, announcementId } = params;
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    redirect(
      `/login?next=/admin/courses/${courseId}/announcements/${announcementId}`
    );
  }

  let announcement;
  try {
    const { data } = await api.announcements.get(announcementId, session.access_token);
    announcement = data;
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) notFound();
    throw err;
  }
  if (announcement.course_id !== courseId) notFound();

  return (
    <div className="max-w-2xl px-8 py-10">
      <div className="text-caption uppercase text-muted mb-4 tracking-[0.08em]">
        <Link href="/admin/courses" className="hover:text-ink">
          Courses
        </Link>
        <span className="text-subtle mx-2">›</span>
        <Link href={`/admin/courses/${courseId}`} className="hover:text-ink">
          Course
        </Link>
        <span className="text-subtle mx-2">›</span>
        <Link
          href={`/admin/courses/${courseId}/announcements`}
          className="hover:text-ink"
        >
          Announcements
        </Link>
        <span className="text-subtle mx-2">›</span>
        <span>Edit</span>
      </div>

      <h1 className="font-display text-h1-sm font-medium mb-2">Edit announcement</h1>

      <div className="rounded-card border border-line bg-surface p-8">
        <AnnouncementForm
          courseId={courseId}
          existing={{
            id: announcement.id,
            title: announcement.title,
            body: announcement.body,
            pinned: announcement.pinned,
          }}
        />
      </div>
    </div>
  );
}
