import Link from 'next/link';
import { AnnouncementForm } from '../announcement-form';

type Params = { params: { courseId: string } };

export default function NewAnnouncementPage({ params }: Params) {
  const { courseId } = params;
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
        <span>New</span>
      </div>

      <h1 className="font-display text-h1-sm font-medium mb-2">New announcement</h1>
      <p className="text-body-sm text-muted mb-8">
        Posts here show up on the student course page and in their unread count on
        /my-courses.
      </p>

      <div className="rounded-card border border-line bg-surface p-8">
        <AnnouncementForm courseId={courseId} />
      </div>
    </div>
  );
}
