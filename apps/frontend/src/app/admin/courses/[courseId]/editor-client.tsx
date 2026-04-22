'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  api,
  ApiClientError,
  type CoursePayload,
  type SemesterPayload,
} from '@/lib/api';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type Props = {
  course: CoursePayload;
  semesters: SemesterPayload[];
};

export function CourseEditorClient({ course, semesters }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? '');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    title !== course.title || (description || '') !== (course.description ?? '');

  async function getToken(): Promise<string | null> {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not logged in');
      await api.courses.update(course.id, { title, description }, token);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishToggle() {
    setError(null);
    setPublishing(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not logged in');
      const target = course.status === 'published' ? 'draft' : 'published';
      await api.courses.setStatus(course.id, target, token);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : (err as Error).message);
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${course.title}"? This cascades to semesters, enrollments, and announcements. Cannot be undone.`)) {
      return;
    }
    setError(null);
    setDeleting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not logged in');
      await api.courses.delete(course.id, token);
      router.push('/admin/courses');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : (err as Error).message);
      setDeleting(false);
    }
  }

  async function handleDeleteSemester(semesterId: string, semesterTitle: string) {
    if (!confirm(`Delete semester "${semesterTitle}"?`)) return;
    try {
      const token = await getToken();
      if (!token) throw new Error('Not logged in');
      await api.semesters.delete(semesterId, token);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : (err as Error).message);
    }
  }

  return (
    <>
      <div className="flex items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="font-display text-h1-sm font-medium">{course.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span
              className={`inline-flex items-center gap-1.5 text-caption uppercase px-2 py-0.5 rounded-pill border ${
                course.status === 'published'
                  ? 'bg-success-bg border-success-border text-success-fg'
                  : 'bg-warning-bg border-warning-border text-warning-fg'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-pill ${course.status === 'published' ? 'bg-success-fg' : 'bg-warning-fg'}`}
              />
              {course.status}
            </span>
            <span className="text-body-sm text-muted">
              Updated {new Date(course.updated_at).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="flex gap-3 shrink-0">
          <Link
            href={`/admin/courses/${course.id}/enrollments`}
            className="h-10 px-4 rounded border border-line bg-surface hover:bg-paper text-ink font-medium text-body-sm flex items-center"
          >
            Enrollments
          </Link>
          <Link
            href={`/admin/courses/${course.id}/announcements`}
            className="h-10 px-4 rounded border border-line bg-surface hover:bg-paper text-ink font-medium text-body-sm flex items-center"
          >
            Announcements
          </Link>
          <button
            onClick={handlePublishToggle}
            disabled={publishing}
            className="h-10 px-5 rounded bg-accent-600 hover:bg-accent-700 disabled:bg-subtle text-white font-medium text-body-sm"
          >
            {publishing
              ? '…'
              : course.status === 'published'
                ? 'Unpublish'
                : 'Publish'}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="h-10 px-4 rounded border border-danger-border text-danger-fg hover:bg-danger-bg font-medium text-body-sm"
          >
            {deleting ? '…' : 'Delete'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-danger-border bg-danger-bg text-danger-fg text-body-sm p-3 mb-6">
          {error}
        </div>
      )}

      {/* Edit course meta */}
      <div className="rounded-card border border-line bg-surface p-6 mb-6">
        <h2 className="font-display text-h3 font-medium mb-4">Course details</h2>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="title"
              className="block text-caption uppercase text-muted mb-2"
            >
              Title
            </label>
            <input
              id="title"
              type="text"
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-3 rounded border border-line bg-surface text-ink focus:outline-none focus:border-accent-600 focus:ring-2 focus:ring-accent-600/20"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-caption uppercase text-muted mb-2"
            >
              Description
            </label>
            <textarea
              id="description"
              rows={4}
              maxLength={5000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 rounded border border-line bg-surface text-ink focus:outline-none focus:border-accent-600 focus:ring-2 focus:ring-accent-600/20 resize-y"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className="h-10 px-5 rounded bg-accent-600 hover:bg-accent-700 disabled:bg-subtle text-white font-medium text-body-sm"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {dirty && (
              <span className="text-body-sm text-muted">Unsaved changes</span>
            )}
          </div>
        </div>
      </div>

      {/* Semester list */}
      <div className="rounded-card border border-line bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="font-display text-h3 font-medium">Semesters</h2>
          <Link
            href={`/admin/courses/${course.id}/semesters/new`}
            className="text-body-sm text-accent-600 font-medium hover:underline"
          >
            + Add semester
          </Link>
        </div>

        {semesters.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-body-sm text-muted mb-4">
              No semesters yet. Courses need at least one semester with a valid
              YouTube URL before they can be published.
            </p>
            <Link
              href={`/admin/courses/${course.id}/semesters/new`}
              className="inline-flex h-10 px-5 rounded bg-accent-600 hover:bg-accent-700 text-white font-medium text-body-sm items-center"
            >
              Add first semester
            </Link>
          </div>
        ) : (
          <ul>
            {semesters.map((s) => (
              <li
                key={s.id}
                className="grid grid-cols-[56px_1fr_auto] items-center gap-4 px-5 py-4 border-b border-line last:border-0"
              >
                <span className="font-display text-[24px] text-muted font-medium tabular">
                  {String(s.sort_order + 1).padStart(2, '0')}
                </span>
                <div>
                  <div className="font-medium text-body">{s.title}</div>
                  {s.youtube_url ? (
                    <a
                      href={s.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-body-sm text-accent-600 hover:underline break-all"
                    >
                      {s.youtube_url}
                    </a>
                  ) : (
                    <div className="text-body-sm text-warning-fg">
                      Missing YouTube URL (blocks publish)
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteSemester(s.id, s.title)}
                  className="text-body-sm text-muted hover:text-danger-fg"
                  title="Delete semester"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
