'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Avatar } from '@/components/avatar';
import { Icons } from '@/components/icons';
import type { AssignmentWithRelations, CoursePayload, SemesterPayload } from '@/lib/api';
import { AssignmentsFilters } from './assignments-filters';
import { DownloadLink } from './download-link';

function formatSubmittedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

type Props = {
  assignments: AssignmentWithRelations[];
  courses: CoursePayload[];
  semesters: SemesterPayload[];
  selectedCourseId?: string;
  selectedSemesterId?: string;
  nextCursorHref: string | null;
};

export function AssignmentsList({
  assignments,
  courses,
  semesters,
  selectedCourseId,
  selectedSemesterId,
  nextCursorHref,
}: Props) {
  const [studentQuery, setStudentQuery] = useState('');

  const visible = useMemo(() => {
    const q = studentQuery.trim().toLowerCase();
    if (!q) return assignments;
    return assignments.filter((a) => {
      const name = (a.student?.full_name ?? '').toLowerCase();
      const email = (a.student?.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [assignments, studentQuery]);

  return (
    <>
      <AssignmentsFilters
        courses={courses}
        semesters={semesters}
        selectedCourseId={selectedCourseId}
        selectedSemesterId={selectedSemesterId}
        studentQuery={studentQuery}
        onStudentQueryChange={setStudentQuery}
      />

      <div className="text-body-sm text-muted mb-4">
        Showing <span className="tabular-nums">{visible.length}</span>
        {studentQuery.trim() && assignments.length !== visible.length && (
          <>
            {' '}
            of <span className="tabular-nums">{assignments.length}</span> loaded
          </>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-12 text-center">
          <h2 className="font-display text-h3 mb-2">
            {assignments.length === 0
              ? 'No submissions yet'
              : 'No matches for those filters'}
          </h2>
          <p className="text-body-sm text-muted">
            {assignments.length === 0
              ? 'Assignments show up here once students start submitting.'
              : 'Try clearing filters or refining the search.'}
          </p>
        </div>
      ) : (
        <div className="rounded-card border border-line bg-surface overflow-hidden">
          <table className="w-full text-body-sm">
            <thead className="bg-paper border-b border-line">
              <tr className="text-caption uppercase text-muted tracking-[0.08em]">
                <th className="text-left px-5 py-3 font-medium">Student</th>
                <th className="text-left px-5 py-3 font-medium">Course</th>
                <th className="text-left px-5 py-3 font-medium">Semester</th>
                <th className="text-left px-5 py-3 font-medium">File</th>
                <th className="text-left px-5 py-3 font-medium">Submitted</th>
                <th className="text-right px-5 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((a) => (
                <tr key={a.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={a.student?.full_name}
                        email={a.student?.email}
                        size={32}
                      />
                      <div>
                        <div className="font-medium">{a.student?.full_name ?? '—'}</div>
                        <div className="text-caption text-muted">
                          {a.student?.email ?? ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-medium">
                    {a.semester?.course?.title ?? '—'}
                  </td>
                  <td className="px-5 py-4 text-muted">{a.semester?.title ?? '—'}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icons.FileText size={16} className="text-muted shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium truncate max-w-[220px]">
                          {a.file_name}
                        </div>
                        <div className="text-caption text-muted uppercase">
                          {a.file_type}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted tabular-nums">
                    {formatSubmittedAt(a.submitted_at)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <DownloadLink assignmentId={a.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nextCursorHref && !studentQuery.trim() && (
        <div className="mt-6 flex justify-center">
          <Link
            href={nextCursorHref}
            className="inline-flex h-10 px-5 rounded border border-line bg-surface hover:bg-paper text-body-sm font-medium items-center"
          >
            Load next page →
          </Link>
        </div>
      )}
    </>
  );
}
