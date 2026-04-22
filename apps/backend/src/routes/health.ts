import { Hono } from 'hono';
import { supabase } from '../config/supabase';

export const healthRoutes = new Hono();

// GET /health
// Returns 200 only when Supabase is reachable. Load balancers hit this endpoint.
healthRoutes.get('/', async (c) => {
  const startedAt = Date.now();

  // Trivial connectivity probe: count rows in profiles (0 on fresh DB, but that's fine).
  // `head: true` returns only the count header, no row bodies — cheap check.
  const { error, count } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const dbLatencyMs = Date.now() - startedAt;
  const dbReachable = !error;

  if (!dbReachable) {
    return c.json(
      {
        ok: false,
        db_reachable: false,
        db_error: error.message,
        timestamp: new Date().toISOString(),
      },
      503
    );
  }

  return c.json({
    ok: true,
    db_reachable: true,
    db_latency_ms: dbLatencyMs,
    profiles_count: count ?? 0,
    timestamp: new Date().toISOString(),
  });
});
