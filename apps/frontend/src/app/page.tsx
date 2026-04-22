// Landing page — dev-mode demo that end-to-end hits the backend, which hits
// Supabase. Proves the stack works. Will be replaced by the real Edulearn
// landing from DESIGN.md / docs/design/edulearn-ui/ in Phase 2.

type HealthResponse = {
  ok: boolean;
  db_reachable: boolean;
  db_latency_ms?: number;
  profiles_count?: number;
  timestamp: string;
  db_error?: string;
};

async function fetchHealth(): Promise<HealthResponse | { error: string }> {
  try {
    // /api/* is rewritten to http://localhost:8080/* by next.config.ts in dev.
    const res = await fetch('http://localhost:8080/health', { cache: 'no-store' });
    if (!res.ok) {
      return { error: `Backend responded ${res.status}` };
    }
    return (await res.json()) as HealthResponse;
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export default async function HomePage() {
  const health = await fetchHealth();
  const healthy = 'ok' in health && health.ok;

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
            Local dev scaffold. This page hits the Bun backend, which hits Supabase.
            If all three connect, the stack is live.
          </p>
        </div>

        <div className="rounded-card border border-line bg-surface p-6 mb-6">
          <h2 className="font-display text-h3 mb-4">Stack health</h2>

          {'error' in health ? (
            <div className="flex items-center gap-3 text-danger-fg">
              <span className="w-2 h-2 rounded-pill bg-danger-fg" />
              <div>
                <div className="font-medium">Backend unreachable</div>
                <div className="text-body-sm text-muted mt-1">{health.error}</div>
                <div className="text-body-sm text-subtle mt-2">
                  Is the backend running on port 8080? Check the other terminal.
                </div>
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body-sm">
              <dt className="text-muted">Backend</dt>
              <dd className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-pill ${healthy ? 'bg-success-fg' : 'bg-warning-fg'}`}
                />
                <span>{healthy ? 'Reachable' : 'Responding with errors'}</span>
              </dd>

              <dt className="text-muted">Database</dt>
              <dd className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-pill ${
                    health.db_reachable ? 'bg-success-fg' : 'bg-danger-fg'
                  }`}
                />
                <span>
                  {health.db_reachable
                    ? `Reachable (${health.db_latency_ms ?? '?'} ms)`
                    : health.db_error ?? 'Unreachable'}
                </span>
              </dd>

              {typeof health.profiles_count === 'number' && (
                <>
                  <dt className="text-muted">Profiles</dt>
                  <dd className="tabular">{health.profiles_count}</dd>
                </>
              )}

              <dt className="text-muted">Timestamp</dt>
              <dd className="font-mono text-body-sm text-muted">{health.timestamp}</dd>
            </dl>
          )}
        </div>

        <div className="text-body-sm text-muted">
          <p className="mb-2">Next steps:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Build auth module (blueprint §2.1–2.2)</li>
            <li>Build courses + semesters CRUD (§2.3–2.6)</li>
            <li>Build enrollment flow (§2.7–2.9)</li>
            <li>Port Edulearn UI screens from docs/design/edulearn-ui/</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
