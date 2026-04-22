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
import { EnrollmentBadge } from '@/components/enrollment-badge';
import { Icons } from '@/components/icons';

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
  // Optimistic status — reflects the pending radio choice while the PATCH is in
  // flight. Falls back to course.status if the call fails (422 publish-validation).
  const [optimisticStatus, setOptimisticStatus] =
    useState<CoursePayload['status']>(course.status);
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

  async function handleStatusChange(next: CoursePayload['status']) {
    if (next === optimisticStatus) return;
    setError(null);
    setOptimisticStatus(next);
    setPublishing(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not logged in');
      await api.courses.setStatus(course.id, next, token);
      router.refresh();
    } catch (err) {
      // Roll back visually — the 422 (no semesters / missing youtube_url)
      // lives on course.status, not on next.
      setOptimisticStatus(course.status);
      setError(err instanceof ApiClientError ? err.message : (err as Error).message);
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete() {
    if (
      !confirm(
        `Delete "${course.title}"? This cascades to semesters, enrollments, and announcements. Cannot be undone.`
      )
    ) {
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
      {/* Eyebrow + title row */}
      <div className="text-caption uppercase tracking-[0.09em] text-accent-600 mb-3">
        Edit course
      </div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="min-w-0">
          <h1 className="font-display text-h1-sm font-medium truncate">
            {course.title}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <EnrollmentBadge status={course.status} />
            <span className="text-body-sm text-muted">
              Updated {new Date(course.updated_at).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
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
        </div>
      </div>

      {error && (
        <div className="rounded border border-danger-border bg-danger-bg text-danger-fg text-body-sm p-3 mb-6">
          {error}
        </div>
      )}

      {/* Two-column layout: Details left, Semesters right */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-6">
        {/* ── Details card ───────────────────────────────────── */}
        <div className="rounded-card border border-line bg-surface p-6">
          <h2 className="font-display text-h3 font-medium mb-5">Course details</h2>

          <div className="space-y-5">
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
                rows={5}
                maxLength={5000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2.5 rounded border border-line bg-surface text-ink focus:outline-none focus:border-accent-600 focus:ring-2 focus:ring-accent-600/20 resize-y"
              />
            </div>

            {/* Status radios — replaces the old Publish/Unpublish button. */}
            <fieldset>
              <legend className="block text-caption uppercase text-muted mb-2">
                Status
              </legend>
              <div className="grid grid-cols-2 gap-2">
                <StatusRadio
                  label="Draft"
                  description="Hidden from the public catalog"
                  value="draft"
                  checked={optimisticStatus === 'draft'}
                  disabled={publishing}
                  onChange={() => handleStatusChange('draft')}
                />
                <StatusRadio
                  label="Published"
                  description="Visible + open for enrollment"
                  value="published"
                  checked={optimisticStatus === 'published'}
                  disabled={publishing}
                  onChange={() => handleStatusChange('published')}
                />
              </div>
              {publishing && (
                <div className="mt-2 text-caption text-muted">
                  Updating status…
                </div>
              )}
            </fieldset>

            <div className="h-px bg-line" />

            <div className="flex items-center justify-between gap-3">
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
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="h-10 px-4 rounded border border-danger-border text-danger-fg hover:bg-danger-bg font-medium text-body-sm"
              >
                {deleting ? '…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Semesters card ─────────────────────────────────── */}
        <div className="rounded-card border border-line bg-surface overflow-hidden h-fit">
          <div className="flex items-center justify-between px-5 py-4 border-b border-line">
            <h2 className="font-display text-h3 font-medium">Semesters</h2>
            <Link
              href={`/admin/courses/${course.id}/semesters/new`}
              className="inline-flex items-center gap-1 text-body-sm text-accent-600 font-medium hover:underline"
            >
              <Icons.Plus size={14} />
              Add
            </Link>
          </div>

          {semesters.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-body-sm text-muted mb-4">
                No semesters yet. Courses need at least one semester with a
                valid YouTube URL before they can be published.
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
              {semesters.map((s, i) => (
                <li
                  key={s.id}
                  className="grid grid-cols-[36px_1fr_auto] items-center gap-3 px-4 py-3.5 border-b border-line last:border-0"
                >
                  <span className="font-display text-[20px] text-subtle font-medium tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium text-body truncate">{s.title}</div>
                    {s.youtube_url ? (
                      <a
                        href={s.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-body-sm text-accent-600 hover:underline truncate inline-block max-w-full"
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
                    className="h-8 w-8 inline-flex items-center justify-center rounded text-muted hover:bg-black/[0.05] hover:text-danger-fg shrink-0"
                    title="Delete semester"
                    aria-label={`Delete ${s.title}`}
                  >
                    <Icons.X size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function StatusRadio({
  label,
  description,
  value,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 px-3.5 py-3 rounded border cursor-pointer transition-colors ${
        checked
          ? 'border-accent-600 bg-accent-50'
          : 'border-line hover:bg-paper'
      } ${disabled ? 'opacity-60 cursor-wait' : ''}`}
    >
      <input
        type="radio"
        name="status"
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 accent-accent-600"
      />
      <div className="min-w-0">
        <div className="text-body-sm font-medium text-ink">{label}</div>
        <div className="text-caption text-muted mt-0.5">{description}</div>
      </div>
    </label>
  );
}
