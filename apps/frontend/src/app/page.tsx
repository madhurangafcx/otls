import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { api, ApiClientError } from '@/lib/api';

// Landing page. Reads the session from cookies (via @supabase/ssr) server-side,
// and if authenticated, fetches the user's profile from our backend to show
// their name + role. If not authenticated, shows "Log in" + "Create account" CTAs.
//
// Also surfaces live backend + DB health as a dev affordance — useful while
// the stack is still being built. Will go away in a later Phase 2 pass.

async function loadSession() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  try {
    const { data } = await api.auth.me(session.access_token);
    return { session, profile: data };
  } catch (err) {
    if (err instanceof ApiClientError) {
      // 401 means the token is invalid/expired — treat as logged out
      return null;
    }
    throw err;
  }
}

type HealthResponse = {
  ok: boolean;
  db_reachable: boolean;
  db_latency_ms?: number;
  profiles_count?: number;
  timestamp: string;
  db_error?: string;
};

async function loadHealth(): Promise<HealthResponse | { error: string }> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'}/health`,
      { cache: 'no-store' }
    );
    if (!res.ok) return { error: `Backend responded ${res.status}` };
    return (await res.json()) as HealthResponse;
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export default async function HomePage() {
  const [sessionState, health] = await Promise.all([loadSession(), loadHealth()]);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="max-w-3xl mx-auto px-6 py-20">
        <div className="mb-10">
          <span className="inline-block text-caption uppercase tracking-[0.09em] text-accent-600 mb-3">
            Edulearn
          </span>
          <h1 className="font-display text-h1 font-medium mb-4">
            Online Teaching & Learning System
          </h1>
          <p className="text-body-lg text-muted max-w-xl">
            Structured learning for curious minds. Recordings, assignments, and
            announcements in one place.
          </p>
        </div>

        {/* Session card */}
        {sessionState ? (
          <div className="rounded-card border border-line bg-surface p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-pill bg-accent-100 text-accent-700 flex items-center justify-center font-medium text-body-sm border border-line">
                {sessionState.profile.full_name
                  ?.split(' ')
                  .map((s) => s[0])
                  .join('')
                  .slice(0, 2) ?? sessionState.profile.email[0]?.toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="font-display text-h4 font-medium">
                  Welcome back,{' '}
                  {sessionState.profile.full_name ?? sessionState.profile.email}
                </div>
                <div className="text-body-sm text-muted">
                  {sessionState.profile.email}
                  <span className="inline-block ml-3 px-2 py-0.5 rounded-pill border border-line text-caption uppercase bg-paper">
                    {sessionState.profile.role}
                  </span>
                </div>
              </div>
              <Link
                href={sessionState.profile.role === 'admin' ? '/admin' : '/my-courses'}
                className="h-10 px-4 rounded bg-accent-600 hover:bg-accent-700 text-white font-medium text-body-sm flex items-center"
              >
                Go to dashboard
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-card border border-line bg-surface p-6 mb-6 flex items-center gap-3">
            <Link
              href="/login"
              className="h-10 px-5 rounded border border-line hover:bg-paper text-ink font-medium text-body-sm flex items-center"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="h-10 px-5 rounded bg-accent-600 hover:bg-accent-700 text-white font-medium text-body-sm flex items-center"
            >
              Create account
            </Link>
          </div>
        )}

        {/* Stack health (dev affordance) */}
        <div className="rounded-card border border-line bg-surface p-6 mb-6">
          <h2 className="font-display text-h3 mb-4">Stack health</h2>
          {'error' in health ? (
            <div className="flex items-center gap-3 text-danger-fg">
              <span className="w-2 h-2 rounded-pill bg-danger-fg" />
              <div>
                <div className="font-medium">Backend unreachable</div>
                <div className="text-body-sm text-muted mt-1">{health.error}</div>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body-sm">
              <dt className="text-muted">Backend</dt>
              <dd className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-pill ${health.ok ? 'bg-success-fg' : 'bg-warning-fg'}`}
                />
                <span>{health.ok ? 'Reachable' : 'Errors'}</span>
              </dd>

              <dt className="text-muted">Database</dt>
              <dd className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-pill ${health.db_reachable ? 'bg-success-fg' : 'bg-danger-fg'}`}
                />
                <span>
                  {health.db_reachable
                    ? `Reachable (${health.db_latency_ms ?? '?'} ms)`
                    : (health.db_error ?? 'Unreachable')}
                </span>
              </dd>

              {typeof health.profiles_count === 'number' && (
                <>
                  <dt className="text-muted">Profiles</dt>
                  <dd className="tabular">{health.profiles_count}</dd>
                </>
              )}
            </dl>
          )}
        </div>
      </div>
    </main>
  );
}
