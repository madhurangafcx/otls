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

export const adminRepository = {
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
