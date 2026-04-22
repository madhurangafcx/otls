import { supabase } from '../../config/supabase';

// Dashboard stats. Four scalars — each a cheap COUNT head query.
// Not using the courses/enrollments/assignments repositories because the
// head:count trick is cheaper than pulling rows we don't need.

export type AdminStatsRow = {
  students: number;
  courses_total: number;
  courses_draft: number;
  pending_enrollments: number;
  submissions_today: number;
};

export type AdminStudentRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  enrollment_count: number;
  approved_count: number;
};

export const adminRepository = {
  // List every student profile with an enrollment-count aggregate. Uses the
  // same nested-count select pattern as courses.repository to avoid N+1.
  async listStudents(): Promise<AdminStudentRow[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, created_at, enrollments(count)')
      .eq('role', 'student')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`admin.listStudents failed: ${error.message}`);

    // Second pass: approved-only count per student. Supabase can't do a
    // filtered nested count (no PostgREST relationship filters on aggregates),
    // so we pull the approved-enrollment rows and bucket in memory. Scale is
    // pilot — tens of students with single-digit enrollments each — fine.
    const { data: approved, error: approvedErr } = await supabase
      .from('enrollments')
      .select('student_id')
      .eq('status', 'approved');
    if (approvedErr) throw new Error(`admin.listStudents approved: ${approvedErr.message}`);
    const approvedByStudent = new Map<string, number>();
    for (const row of approved ?? []) {
      const id = (row as { student_id: string }).student_id;
      approvedByStudent.set(id, (approvedByStudent.get(id) ?? 0) + 1);
    }

    return (data ?? []).map((row) => {
      const r = row as {
        id: string;
        email: string;
        full_name: string | null;
        avatar_url: string | null;
        created_at: string;
        enrollments?: { count: number }[];
      };
      return {
        id: r.id,
        email: r.email,
        full_name: r.full_name,
        avatar_url: r.avatar_url,
        created_at: r.created_at,
        enrollment_count: r.enrollments?.[0]?.count ?? 0,
        approved_count: approvedByStudent.get(r.id) ?? 0,
      };
    });
  },

  async getStats(): Promise<AdminStatsRow> {
    // Compute "today" in UTC. For pilot scale this is fine. Per-tenant
    // timezone handling is future work.
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const startIso = startOfDay.toISOString();

    const [studentsRes, coursesRes, draftsRes, pendingRes, submissionsRes] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student'),
        supabase.from('courses').select('*', { count: 'exact', head: true }),
        supabase
          .from('courses')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'draft'),
        supabase
          .from('enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending'),
        supabase
          .from('assignments')
          .select('*', { count: 'exact', head: true })
          .gte('submitted_at', startIso),
      ]);

    for (const r of [studentsRes, coursesRes, draftsRes, pendingRes, submissionsRes]) {
      if (r.error) throw new Error(`admin.getStats failed: ${r.error.message}`);
    }

    return {
      students: studentsRes.count ?? 0,
      courses_total: coursesRes.count ?? 0,
      courses_draft: draftsRes.count ?? 0,
      pending_enrollments: pendingRes.count ?? 0,
      submissions_today: submissionsRes.count ?? 0,
    };
  },
};
