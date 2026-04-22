'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Icons } from '@/components/icons';
import type { CoursePayload, SemesterPayload } from '@/lib/api';

type Props = {
  courses: CoursePayload[];
  semesters: SemesterPayload[];
  // Current URL filters — drive controlled select values
  selectedCourseId?: string;
  selectedSemesterId?: string;
  studentQuery: string;
  onStudentQueryChange: (q: string) => void;
};

// Client-side filter bar. Course + Semester dropdowns push to the URL
// (server re-fetches on param change). Student search is a controlled input
// owned by the parent — it filters the already-loaded rows without a round
// trip since backend doesn't support free-text student search yet.
export function AssignmentsFilters({
  courses,
  semesters,
  selectedCourseId,
  selectedSemesterId,
  studentQuery,
  onStudentQueryChange,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [localQuery, setLocalQuery] = useState(studentQuery);

  // Keep local input synced if URL changes (e.g., back/forward).
  useEffect(() => {
    setLocalQuery(studentQuery);
  }, [studentQuery]);

  function pushParams(next: { course_id?: string; semester_id?: string }) {
    startTransition(() => {
      const qs = new URLSearchParams();
      if (next.course_id) qs.set('course_id', next.course_id);
      if (next.semester_id) qs.set('semester_id', next.semester_id);
      router.push(qs.toString() ? `${pathname}?${qs.toString()}` : pathname);
    });
  }

  function onCourseChange(courseId: string) {
    // Clearing the course also clears the semester filter (semesters depend
    // on a selected course). Same for picking a different course.
    pushParams({ course_id: courseId || undefined });
  }

  function onSemesterChange(semesterId: string) {
    pushParams({
      course_id: selectedCourseId,
      semester_id: semesterId || undefined,
    });
  }

  function clearAll() {
    setLocalQuery('');
    onStudentQueryChange('');
    pushParams({});
  }

  const hasFilters = !!selectedCourseId || !!selectedSemesterId || !!studentQuery;

  return (
    <div className="flex flex-col md:flex-row gap-3 mb-6">
      {/* Course */}
      <label className="md:w-64 relative">
        <select
          value={selectedCourseId ?? ''}
          onChange={(e) => onCourseChange(e.target.value)}
          disabled={isPending}
          className="w-full h-10 pl-3 pr-9 rounded border border-line bg-surface text-ink text-body-sm appearance-none focus:outline-none focus:border-accent-600 focus:ring-2 focus:ring-accent-600/20 disabled:opacity-60"
        >
          <option value="">Course: All</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <Icons.ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none"
        />
      </label>

      {/* Semester — only meaningful once a course is selected */}
      <label className="md:w-56 relative">
        <select
          value={selectedSemesterId ?? ''}
          onChange={(e) => onSemesterChange(e.target.value)}
          disabled={isPending || !selectedCourseId}
          className="w-full h-10 pl-3 pr-9 rounded border border-line bg-surface text-ink text-body-sm appearance-none focus:outline-none focus:border-accent-600 focus:ring-2 focus:ring-accent-600/20 disabled:opacity-60"
        >
          <option value="">
            {selectedCourseId ? 'Semester: All' : 'Pick a course first'}
          </option>
          {semesters.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <Icons.ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none"
        />
      </label>

      {/* Student search */}
      <div className="relative flex-1">
        <Icons.Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none"
        />
        <input
          type="search"
          value={localQuery}
          onChange={(e) => {
            setLocalQuery(e.target.value);
            onStudentQueryChange(e.target.value);
          }}
          placeholder="Search student name or email"
          className="w-full h-10 pl-9 pr-3 rounded border border-line bg-surface text-ink focus:outline-none focus:border-accent-600 focus:ring-2 focus:ring-accent-600/20"
        />
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={clearAll}
          className="h-10 px-4 rounded text-body-sm text-muted hover:text-ink inline-flex items-center gap-1"
        >
          <Icons.X size={14} />
          Clear
        </button>
      )}
    </div>
  );
}
