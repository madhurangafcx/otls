'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiClientError } from '@/lib/api';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type Params = { params: { courseId: string } };

// YouTube URL regex — mirrors the one in apps/backend/src/modules/semesters/semesters.schemas.ts.
// Client-side validation is UX polish; the backend is the source of truth.
const YT_RE =
  /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=[\w-]{11}(&[^\s]*)?|youtu\.be\/[\w-]{11}(\?[^\s]*)?)$/;

export default function NewSemesterPage({ params }: Params) {
  const { courseId } = params;
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const urlValid = youtubeUrl === '' || YT_RE.test(youtubeUrl.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!urlValid) {
      setError('YouTube URL must be youtube.com/watch?v=… or youtu.be/…');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');

      await api.semesters.create(
        {
          course_id: courseId,
          title,
          description: description || undefined,
          youtube_url: youtubeUrl.trim() || undefined,
        },
        session.access_token
      );

      router.push(`/admin/courses/${courseId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl px-8 py-10">
      <div className="text-caption uppercase text-muted mb-4 tracking-[0.08em]">
        <Link href="/admin/courses" className="hover:text-ink">
          Courses
        </Link>{' '}
        <span className="text-subtle mx-2">›</span>
        <Link href={`/admin/courses/${courseId}`} className="hover:text-ink">
          Course
        </Link>{' '}
        <span className="text-subtle mx-2">›</span>
        <span>New semester</span>
      </div>

      <h1 className="font-display text-h1-sm font-medium mb-2">New semester</h1>
      <p className="text-body-sm text-muted mb-8">
        Add a module with a YouTube recording. All semesters must have a valid
        URL before the course can be published.
      </p>

      <div className="rounded-card border border-line bg-surface p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="title" className="block text-caption uppercase text-muted mb-2">
              Title
            </label>
            <input
              id="title"
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Atomic structure"
              className="w-full h-10 px-3 rounded border border-line bg-surface text-ink focus:outline-none focus:border-accent-600 focus:ring-2 focus:ring-accent-600/20"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-caption uppercase text-muted mb-2"
            >
              Description <span className="normal-case text-subtle">(optional)</span>
            </label>
            <textarea
              id="description"
              rows={3}
              maxLength={5000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this semester cover?"
              className="w-full px-3 py-2.5 rounded border border-line bg-surface text-ink focus:outline-none focus:border-accent-600 focus:ring-2 focus:ring-accent-600/20 resize-y"
            />
          </div>

          <div>
            <label htmlFor="youtube" className="block text-caption uppercase text-muted mb-2">
              YouTube URL <span className="normal-case text-subtle">(required for publish)</span>
            </label>
            <input
              id="youtube"
              type="url"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className={`w-full h-10 px-3 rounded border bg-surface text-ink focus:outline-none focus:ring-2 ${
                urlValid
                  ? 'border-line focus:border-accent-600 focus:ring-accent-600/20'
                  : 'border-danger-border focus:border-danger-fg focus:ring-danger-fg/20'
              }`}
            />
            {!urlValid && youtubeUrl.length > 0 && (
              <p className="mt-1 text-body-sm text-danger-fg">
                Not a valid YouTube URL format
              </p>
            )}
          </div>

          {error && (
            <div className="rounded border border-danger-border bg-danger-bg text-danger-fg text-body-sm p-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || !title.trim() || !urlValid}
              className="h-10 px-5 rounded bg-accent-600 hover:bg-accent-700 disabled:bg-subtle text-white font-medium text-body-sm"
            >
              {submitting ? 'Creating…' : 'Add semester'}
            </button>
            <Link
              href={`/admin/courses/${courseId}`}
              className="h-10 px-5 rounded border border-line bg-surface hover:bg-paper text-ink font-medium text-body-sm flex items-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
