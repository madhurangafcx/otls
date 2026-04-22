'use client';

import { useMemo, useState, useTransition } from 'react';
import { CourseCard } from '@/components/course-card';
import { Icons } from '@/components/icons';
import { ApiClientError, api, type CoursePayload } from '@/lib/api';

type SortKey = 'newest' | 'title';

export function CatalogClient({
  initialCourses,
  initialNextCursor,
}: {
  initialCourses: CoursePayload[];
  initialNextCursor: string | null;
}) {
  const [courses, setCourses] = useState<CoursePayload[]>(initialCourses);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? courses.filter((c) => {
          const t = c.title.toLowerCase();
          const d = (c.description ?? '').toLowerCase();
          return t.includes(q) || d.includes(q);
        })
      : courses;
    if (sort === 'title') {
      return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    }
    return filtered;
  }, [courses, query, sort]);

  function loadMore() {
    if (!nextCursor) return;
    startTransition(async () => {
      setLoadError(null);
      try {
        const res = await api.courses.list({
          status: 'published',
          cursor: nextCursor,
          limit: 24,
        });
        setCourses((prev) => [...prev, ...res.data]);
        setNextCursor(res.pagination.next_cursor);
      } catch (err) {
        setLoadError(
          err instanceof ApiClientError
            ? `${err.status} ${err.message}`
            : err instanceof Error
              ? err.message
              : 'Failed to load more'
        );
      }
    });
  }

  return (
    <>
      {/* Filter row */}
      <div className="flex flex-col md:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Icons.Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses"
            className="w-full h-10 pl-9 pr-3 rounded border border-line bg-surface text-ink focus:outline-none focus:border-accent-600 focus:ring-2 focus:ring-accent-600/20"
          />
        </div>
        <label className="md:w-52 relative">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="w-full h-10 pl-3 pr-9 rounded border border-line bg-surface text-ink text-body-sm appearance-none focus:outline-none focus:border-accent-600 focus:ring-2 focus:ring-accent-600/20"
          >
            <option value="newest">Newest first</option>
            <option value="title">Title A–Z</option>
          </select>
          <Icons.ChevronDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none"
          />
        </label>
      </div>

      {/* Count */}
      <div className="text-body-sm text-muted mb-4">
        {query.trim() ? (
          <>
            Showing <span className="tabular-nums">{visible.length}</span> result
            {visible.length === 1 ? '' : 's'} for &ldquo;{query.trim()}&rdquo;
          </>
        ) : (
          <>
            Showing <span className="tabular-nums">{courses.length}</span> course
            {courses.length === 1 ? '' : 's'}
            {nextCursor && ' · more available'}
          </>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-12 text-center">
          <h2 className="font-display text-h3 mb-2">
            {query.trim() ? 'No matches' : 'No courses yet'}
          </h2>
          <p className="text-body-sm text-muted">
            {query.trim()
              ? 'Try a different search term.'
              : 'The catalog is empty. Check back later.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visible.map((c) => (
            <CourseCard
              key={c.id}
              title={c.title}
              description={c.description}
              status={c.status}
              semesterCount={c.semester_count}
              href={`/courses/${c.id}`}
            />
          ))}
        </div>
      )}

      {/* Load more — only when not searching (search filters current set only) */}
      {nextCursor && !query.trim() && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={isPending}
            className="h-10 px-6 rounded border border-line bg-surface hover:bg-paper disabled:opacity-60 text-ink font-medium text-body-sm transition-colors inline-flex items-center gap-2"
          >
            {isPending ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      {loadError && (
        <div className="mt-4 rounded border border-danger-border bg-danger-bg text-danger-fg text-body-sm p-3">
          {loadError}
        </div>
      )}
    </>
  );
}
