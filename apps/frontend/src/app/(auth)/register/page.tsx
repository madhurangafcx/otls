'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiClientError } from '@/lib/api';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

// Password strength per DESIGN.md: 3-segment bar (weak / ok / strong).
function scorePassword(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length < 8) return 0;
  let score = 1;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw)) score++;
  return Math.min(3, score) as 0 | 1 | 2 | 3;
}

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = useMemo(() => scorePassword(password), [password]);
  const strengthLabel =
    password.length === 0
      ? ''
      : strength <= 1
        ? 'Weak'
        : strength === 2
          ? 'OK'
          : 'Strong';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { data } = await api.auth.register({
        email,
        password,
        full_name: fullName || undefined,
      });

      // Backend may return session:null if something went sideways — in that
      // case bounce to /login so the user can log in manually.
      if (!data.session) {
        router.push('/login');
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { error: setErr } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      if (setErr) throw new Error(setErr.message);

      router.push('/my-courses');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Registration failed');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper text-ink flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="inline-block text-caption uppercase tracking-[0.09em] text-accent-600 mb-3">
            Edulearn
          </span>
          <h1 className="font-display text-h1-sm font-medium">Create your account</h1>
          <p className="text-body-sm text-muted mt-2">
            Free to start. No credit card.
          </p>
        </div>

        <div className="rounded-card border border-line bg-surface p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="fullName"
                className="block text-caption uppercase text-muted mb-2"
              >
                Full name <span className="normal-case text-subtle">(optional)</span>
              </label>
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-10 px-3 rounded border border-line bg-surface text-ink focus:outline-none focus:border-accent-600 focus:ring-2 focus:ring-accent-600/20"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-caption uppercase text-muted mb-2">
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
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 rounded border border-line bg-surface text-ink focus:outline-none focus:border-accent-600 focus:ring-2 focus:ring-accent-600/20"
              />
              {/* 3-segment password strength per DESIGN.md */}
              <div className="mt-2 grid grid-cols-3 gap-1 h-1">
                <div
                  className={`rounded ${
                    strength >= 1
                      ? strength >= 3
                        ? 'bg-success-fg'
                        : strength === 2
                          ? 'bg-warning-fg'
                          : 'bg-danger-fg'
                      : 'bg-line'
                  }`}
                />
                <div
                  className={`rounded ${
                    strength >= 2
                      ? strength >= 3
                        ? 'bg-success-fg'
                        : 'bg-warning-fg'
                      : 'bg-line'
                  }`}
                />
                <div
                  className={`rounded ${strength >= 3 ? 'bg-success-fg' : 'bg-line'}`}
                />
              </div>
              {strengthLabel && (
                <div className="mt-1 text-body-sm text-muted">{strengthLabel}</div>
              )}
            </div>

            {error && (
              <div className="rounded border border-danger-border bg-danger-bg text-danger-fg text-body-sm p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || strength === 0}
              className="w-full h-10 rounded bg-accent-600 hover:bg-accent-700 disabled:bg-subtle text-white font-medium text-body-sm transition-colors"
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-body-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-accent-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
