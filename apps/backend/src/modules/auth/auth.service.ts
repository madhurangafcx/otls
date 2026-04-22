import { createClient } from '@supabase/supabase-js';
import { env } from '../../config/env';
import { supabase } from '../../config/supabase';
import type { LoginInput, RegisterInput } from './auth.schemas';

// Named errors the routes layer maps to specific HTTP status codes.
export class AuthError extends Error {
  constructor(
    public code:
      | 'EMAIL_TAKEN'
      | 'INVALID_CREDENTIALS'
      | 'WEAK_PASSWORD'
      | 'PROFILE_NOT_FOUND'
      | 'SUPABASE_ERROR',
    message: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// A non-privileged client (anon key, not service_role) for operations that
// must run as an end user — specifically signInWithPassword which needs to
// respect Supabase's own password policy + rate limiting.
const anonClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

export const authService = {
  // Blueprint §2.1 steps 3-5: create user via admin API, trigger auto-creates
  // profiles row, return session so frontend can establish a cookie.
  async register(input: RegisterInput) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: input.email,
      password: input.password,
      // email_confirm:true means "mark this email as already confirmed" so the
      // user can log in immediately without a confirmation email round trip.
      // Blueprint §2.1 v0.1 skips the email verification step.
      email_confirm: true,
      user_metadata: input.full_name ? { full_name: input.full_name } : undefined,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already') || msg.includes('exists')) {
        throw new AuthError('EMAIL_TAKEN', 'An account with that email already exists');
      }
      if (msg.includes('password')) {
        throw new AuthError('WEAK_PASSWORD', error.message);
      }
      throw new AuthError('SUPABASE_ERROR', error.message);
    }

    if (!data.user) {
      throw new AuthError('SUPABASE_ERROR', 'User creation returned no user');
    }

    // Issue a session so the frontend can log the user in immediately.
    // signInWithPassword uses the anon client (not service_role) so Supabase's
    // normal auth flow runs.
    const { data: sessionData, error: sessionErr } =
      await anonClient.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });

    if (sessionErr || !sessionData.session) {
      // User was created but session creation failed — unusual, log + return a
      // partial response so the frontend can redirect to /login.
      console.error(
        '[auth.register] user created but session failed:',
        sessionErr?.message
      );
      return { user: data.user, session: null };
    }

    return { user: sessionData.user, session: sessionData.session };
  },

  async login(input: LoginInput) {
    const { data, error } = await anonClient.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      // Supabase returns "Invalid login credentials" for both wrong-email and
      // wrong-password by design (prevents user enumeration). We preserve that.
      throw new AuthError('INVALID_CREDENTIALS', 'Invalid email or password');
    }

    if (!data.session || !data.user) {
      throw new AuthError('SUPABASE_ERROR', 'Login returned no session');
    }

    return { user: data.user, session: data.session };
  },

  async logout(accessToken: string) {
    // Revokes the refresh token server-side. The frontend is responsible for
    // clearing its own cookies.
    const { error } = await anonClient.auth.admin.signOut(accessToken);
    if (error) {
      // Not fatal — if the token is already invalid, logout is already effective.
      console.warn('[auth.logout] signOut warning:', error.message);
    }
  },

  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, role, created_at')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw new AuthError('PROFILE_NOT_FOUND', 'Profile not found for user');
    }
    return data;
  },
};
