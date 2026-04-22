'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiClientError } from '@/lib/api';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function NewCoursePage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');

      const { data: course } = await api.courses.create(
        { title, description: description || undefined },
        session.access_token
      );

      router.push(`/admin/courses/${course.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) setError(err.message);
      else setError(err instanceof Error ? err.message : 'Failed to create course');
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
        <span>New course</span>
      </div>

      <h1 className="font-display text-h1-sm font-medium mb-2">New course</h1>
      <p className="text-body-sm text-muted mb-8">
        Courses start in draft. Add at least one semester with a YouTube URL, then publish.
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
              placeholder="e.g. Grade 10 Chemistry"
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
              rows={4}
              maxLength={5000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What will students learn?"
              className="w-full px-3 py-2.5 rounded border border-line bg-surface text-ink focus:outline-none focus:border-accent-600 focus:ring-2 focus:ring-accent-600/20 resize-y"
            />
          </div>

          {error && (
            <div className="rounded border border-danger-border bg-danger-bg text-danger-fg text-body-sm p-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="h-10 px-5 rounded bg-accent-600 hover:bg-accent-700 disabled:bg-subtle text-white font-medium text-body-sm"
            >
              {submitting ? 'Creating…' : 'Create course'}
            </button>
            <Link
              href="/admin/courses"
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
