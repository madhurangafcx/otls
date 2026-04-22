import { getSupabaseServerClient } from '@/lib/supabase-server';
import { api } from '@/lib/api';
import { EnrollmentsAdminClient } from './enrollments-client';

// Cross-course enrollments view. Pulls every enrollment (any status) with
// course + student joined in. Scoped at 50 to stay responsive at pilot scale;
// for a real growth path, wire cursor pagination here (matches assignments
// page's pattern).
export default async function AdminEnrollmentsPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data } = await api.enrollments.listForAdmin(
    { limit: 50 },
    session.access_token
  );

  return (
    <div className="max-w-6xl px-8 py-10">
      <div className="mb-8">
        <h1 className="font-display text-h1-sm font-medium">Enrollments</h1>
        <p className="text-body-sm text-muted mt-1">
          Every request across every course. Click a course title to drill into
          its per-course review page.
        </p>
      </div>

      <EnrollmentsAdminClient initial={data} />
    </div>
  );
}
