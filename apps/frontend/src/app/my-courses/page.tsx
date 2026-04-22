import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { api, ApiClientError } from '@/lib/api';

// Placeholder /my-courses page for Phase 2. Real implementation lands in
// Phase 3 when the courses + enrollments modules are built.
// For now: proves the protected route + session cookies work end-to-end.

export default async function MyCoursesPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // Middleware should have caught this, but defense in depth.
    return (
      <main className="min-h-screen bg-paper text-ink flex items-center justify-center">
        <Link href="/login" className="text-accent-600 hover:underline">
          Log in to continue
        </Link>
      </main>
    );
  }

  let profileState: { name: string; email: string; role: string } | { error: string };
  try {
    const { data } = await api.auth.me(session.access_token);
    profileState = {
      name: data.full_name ?? data.email,
      email: data.email,
      role: data.role,
    };
  } catch (err) {
    profileState = {
      error: err instanceof ApiClientError ? err.message : 'Failed to load profile',
    };
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex items-baseline justify-between mb-8">
          <h1 className="font-display text-h1-sm font-medium">My Courses</h1>
          <Link href="/" className="text-body-sm text-muted hover:text-ink">
            ← Home
          </Link>
        </div>

        {'error' in profileState ? (
          <div className="rounded border border-danger-border bg-danger-bg text-danger-fg p-4">
            {profileState.error}
          </div>
        ) : (
          <>
            <div className="rounded-card border border-line bg-surface p-6 mb-6">
              <div className="text-caption uppercase text-muted mb-2">Signed in as</div>
              <div className="font-display text-h3 font-medium">{profileState.name}</div>
              <div className="text-body-sm text-muted mt-1">
                {profileState.email}
                <span className="inline-block ml-3 px-2 py-0.5 rounded-pill border border-line text-caption uppercase bg-paper">
                  {profileState.role}
                </span>
              </div>
            </div>

            <div className="rounded-card border border-line bg-surface p-10 text-center">
              <div className="text-muted mb-3">📚 (placeholder icon)</div>
              <h2 className="font-display text-h3 mb-2">No courses yet</h2>
              <p className="text-body-sm text-muted max-w-sm mx-auto">
                Course catalog + enrollment flow lands in Phase 3. For now this
                page exists to prove the protected-route + session-cookie round trip works.
              </p>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
