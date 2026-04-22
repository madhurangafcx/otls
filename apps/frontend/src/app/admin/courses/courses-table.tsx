'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { EnrollmentBadge } from '@/components/enrollment-badge';
import { Icons } from '@/components/icons';
import type { CoursePayload } from '@/lib/api';

type StatusFilter = 'all' | 'draft' | 'published';

export function CoursesTable({ courses }: { courses: CoursePayload[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((c) => {
      if (status !== 'all' && c.status !== status) return false;
      if (!q) return true;
      const t = c.title.toLowerCase();
      const d = (c.description ?? '').toLowerCase();
      return t.includes(q) || d.includes(q);
    });
  }, [courses, query, status]);

  return (
    <>
      {/* Filter row */}
      <div className="flex flex-col md:flex-row gap-3 mb-5">
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
        <label className="md:w-48 relative">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="w-full h-10 pl-3 pr-9 rounded border border-line bg-surface text-ink text-body-sm appearance-none focus:outline-none focus:border-accent-600 focus:ring-2 focus:ring-accent-600/20"
          >
            <option value="all">Status: All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <Icons.ChevronDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none"
          />
        </label>
      </div>

      <div className="text-body-sm text-muted mb-4">
        Showing <span className="tabular-nums">{visible.length}</span> of{' '}
        <span className="tabular-nums">{courses.length}</span> course
        {courses.length === 1 ? '' : 's'}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-10 text-center">
          <p className="text-body-sm text-muted">
            {query.trim() || status !== 'all'
              ? 'No matches for those filters.'
              : 'No courses yet.'}
          </p>
        </div>
      ) : (
        <div className="rounded-card border border-line bg-surface overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-caption uppercase text-muted tracking-[0.08em] bg-paper">
                <th className="text-left px-4 py-3 font-medium border-b border-line">
                  Title
                </th>
                <th className="text-right px-4 py-3 font-medium border-b border-line w-28">
                  Semesters
                </th>
                <th className="text-right px-4 py-3 font-medium border-b border-line w-28">
                  Enrollments
                </th>
                <th className="text-left px-4 py-3 font-medium border-b border-line w-36">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium border-b border-line w-32">
                  Updated
                </th>
                <th className="px-4 py-3 border-b border-line w-20" />
              </tr>
            </thead>
            <tbody>
              {visible.map((course) => (
                <tr key={course.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3.5">
                    <Link
                      href={`/admin/courses/${course.id}`}
                      className="font-display text-h4 font-medium hover:text-accent-600"
                    >
                      {course.title}
                    </Link>
                    {course.description && (
                      <div className="text-body-sm text-muted line-clamp-1 mt-0.5">
                        {course.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-body-sm">
                    {course.semester_count ?? 0}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums text-body-sm">
                    {course.enrollment_count ?? 0}
                  </td>
                  <td className="px-4 py-3.5">
                    <EnrollmentBadge status={course.status} />
                  </td>
                  <td className="px-4 py-3.5 text-body-sm text-muted tabular-nums">
                    {new Date(course.updated_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/admin/courses/${course.id}`}
                      className="text-accent-600 text-body-sm hover:underline"
                    >
                      Edit →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
