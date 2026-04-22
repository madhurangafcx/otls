'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api, ApiClientError } from '@/lib/api';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { AuthShell } from '@/components/auth-shell';
import { Icons } from '@/components/icons';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') ?? '/my-courses';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { data } = await api.auth.login({ email, password });

      // Persist the session as HTTP-only cookies via the browser Supabase
      // client. After this, middleware + Server Components see the session.
      const supabase = getSupabaseBrowserClient();
      const { error: setErr } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      if (setErr) throw new Error(setErr.message);

      // Full navigation so Server Components re-read the fresh session
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Login failed');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setSubmitting(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      if (oauthErr) throw new Error(oauthErr.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google login failed');
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="font-display text-h1-sm font-medium">Welcome back</h1>
        <p className="text-body-sm text-muted mt-2">
          Sign in to continue learning.
        </p>
      </div>

      <div className="rounded-card border border-line bg-surface p-8">
        {/* Google — primary path for pilot users */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={submitting}
          className="w-full h-10 rounded border border-line bg-surface hover:bg-paper disabled:opacity-60 text-ink font-medium text-body-sm transition-colors inline-flex items-center justify-center gap-2"
        >
          <Icons.Google size={18} />
          Continue with Google
        </button>

        <div className="flex items-center gap-4 my-6">
          <div className="h-px bg-line flex-1" />
          <span className="text-caption uppercase text-subtle">
            or sign in with email
          </span>
          <div className="h-px bg-line flex-1" />
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-caption uppercase text-muted mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 rounded border border-line bg-surface text-ink focus:outline-none focus:border-accent-600 focus:ring-2 focus:ring-accent-600/20"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-caption uppercase text-muted mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 px-3 rounded border border-line bg-surface text-ink focus:outline-none focus:border-accent-600 focus:ring-2 focus:ring-accent-600/20"
            />
          </div>

          {error && (
            <div className="rounded border border-danger-border bg-danger-bg text-danger-fg text-body-sm p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-10 rounded bg-accent-600 hover:bg-accent-700 disabled:bg-subtle text-white font-medium text-body-sm transition-colors"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-body-sm text-muted">
        New here?{' '}
        <Link href="/register" className="text-accent-600 hover:underline">
          Create an account →
        </Link>
      </p>
    </AuthShell>
  );
}
