import { api } from '@/lib/api';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { StudentsTable } from './students-table';

export default async function AdminStudentsPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: students } = await api.admin.listStudents(session.access_token);

  return (
    <div className="max-w-6xl px-8 py-10">
      <div className="mb-8">
        <h1 className="font-display text-h1-sm font-medium">Students</h1>
        <p className="text-body-sm text-muted mt-1">
          Every account with role=student. Enrollment count includes pending and rejected.
        </p>
      </div>

      {students.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-12 text-center">
          <h2 className="font-display text-h3 mb-2">No students yet</h2>
          <p className="text-body-sm text-muted">
            Students appear here once they sign up.
          </p>
        </div>
      ) : (
        <StudentsTable students={students} />
      )}
    </div>
  );
}
