'use client';

import { useMemo, useState } from 'react';
import type { AdminStudent } from '@/lib/api';
import { Avatar } from '@/components/avatar';
import { Icons } from '@/components/icons';

export function StudentsTable({ students }: { students: AdminStudent[] }) {
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const n = (s.full_name ?? '').toLowerCase();
      const e = s.email.toLowerCase();
      return n.includes(q) || e.includes(q);
    });
  }, [students, query]);

  return (
    <>
      <div className="relative mb-5 max-w-md">
        <Icons.Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name or email"
          className="w-full h-10 pl-9 pr-3 rounded border border-line bg-surface text-ink focus:outline-none focus:border-accent-600 focus:ring-2 focus:ring-accent-600/20"
        />
      </div>

      <div className="text-body-sm text-muted mb-4">
        Showing <span className="tabular-nums">{visible.length}</span> of{' '}
        <span className="tabular-nums">{students.length}</span> student
        {students.length === 1 ? '' : 's'}
      </div>

      <div className="rounded-card border border-line bg-surface overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-caption uppercase text-muted tracking-[0.08em] bg-paper">
              <th className="text-left px-5 py-3 font-medium border-b border-line">
                Student
              </th>
              <th className="text-left px-5 py-3 font-medium border-b border-line">
                Email
              </th>
              <th className="text-right px-5 py-3 font-medium border-b border-line w-32">
                Enrollments
              </th>
              <th className="text-right px-5 py-3 font-medium border-b border-line w-28">
                Approved
              </th>
              <th className="text-left px-5 py-3 font-medium border-b border-line w-36">
                Joined
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => (
              <tr key={s.id} className="border-b border-line last:border-0">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={s.full_name} email={s.email} size={32} />
                    <span className="font-medium text-body">
                      {s.full_name ?? '—'}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4 text-body-sm text-muted">{s.email}</td>
                <td className="px-5 py-4 text-right tabular-nums text-body-sm">
                  {s.enrollment_count}
                </td>
                <td className="px-5 py-4 text-right tabular-nums text-body-sm">
                  {s.approved_count}
                </td>
                <td className="px-5 py-4 text-body-sm text-muted tabular-nums">
                  {new Date(s.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
