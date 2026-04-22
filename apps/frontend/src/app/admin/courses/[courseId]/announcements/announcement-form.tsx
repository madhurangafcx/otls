'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiClientError } from '@/lib/api';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type Props = {
  courseId: string;
  // When editing, pass the existing announcement. Omit for create.
  existing?: {
    id: string;
    title: string;
    body: string;
    pinned: boolean;
  };
};

// Shared create/edit form. Mirrors the semester form's shape — title + body
// textarea + pinned checkbox. Pin conflict (409) is surfaced as a non-fatal
// message the user can retry.
export function AnnouncementForm({ courseId, existing }: Props) {
  const router = useRouter();
  const isEdit = !!existing;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [pinned, setPinned] = useState(existing?.pinned ?? false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function getToken(): Promise<string> {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('Not logged in');
    return session.access_token;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.');
      return;
    }
    setSubmitting(true);
    try {
      const token = await getToken();
      if (isEdit) {
        await api.announcements.update(
          existing!.id,
          { title, body, pinned },
          token
        );
      } else {
        await api.announcements.create(
          { course_id: courseId, title, body, pinned },
          token
        );
      }
      router.push(`/admin/courses/${courseId}/announcements`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) setError(err.message);
      else setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="title" className="block text-caption uppercase text-muted mb-2">
          Title
        </label>
        <input
          id="title"
          type="text"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Mid-term schedule update"
          className="w-full h-10 px-3 rounded border border-line bg-surface text-ink focus:outline-none focus:border-accent-600 focus:ring-2 focus:ring-accent-600/20"
        />
        <div className="mt-1 text-caption text-muted tabular-nums">
          {title.length}/120
        </div>
      </div>

      <div>
        <label htmlFor="body" className="block text-caption uppercase text-muted mb-2">
          Body
        </label>
        <textarea
          id="body"
          required
          rows={6}
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What do students need to know?"
          className="w-full px-3 py-2.5 rounded border border-line bg-surface text-ink focus:outline-none focus:border-accent-600 focus:ring-2 focus:ring-accent-600/20 resize-y"
        />
        <div className="mt-1 text-caption text-muted tabular-nums">
          {body.length}/2000
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
          className="w-4 h-4 rounded border-line accent-accent-600"
        />
        <span className="text-body-sm">
          Pin to top.{' '}
          <span className="text-muted">
            Only one announcement can be pinned per course. Pinning this one will
            unpin any other.
          </span>
        </span>
      </label>

      {error && (
        <div className="rounded border border-danger-border bg-danger-bg text-danger-fg text-body-sm p-3">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting || !title.trim() || !body.trim()}
          className="h-10 px-5 rounded bg-accent-600 hover:bg-accent-700 disabled:bg-subtle text-white font-medium text-body-sm"
        >
          {submitting ? (isEdit ? 'Saving…' : 'Posting…') : isEdit ? 'Save changes' : 'Post announcement'}
        </button>
        <Link
          href={`/admin/courses/${courseId}/announcements`}
          className="h-10 px-5 rounded border border-line bg-surface hover:bg-paper text-ink font-medium text-body-sm flex items-center"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
