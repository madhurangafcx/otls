import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from './env';

// Service-role client. BYPASSES RLS. Used by the backend for all privileged
// operations. Never expose the service_role key to any client-reachable code.
//
// Note: even though this bypasses RLS at the DB level, RLS policies still run
// as defense-in-depth. A bug in the service layer that skips authz can't also
// bypass the DB's RLS — the two layers catch different classes of mistake.
// (Blueprint §5.5, design-doc Eureka moment.)
export const supabase: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      // Backend is stateless: each request is authenticated via the user's JWT
      // in a middleware. The service-role client itself has no persistent session.
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
);
