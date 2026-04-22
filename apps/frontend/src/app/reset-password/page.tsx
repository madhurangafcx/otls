'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Icons } from '@/components/icons';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

// Forgot-password flow, step 2: user landed here via the email link. Supabase
// exchanges the recovery token in the URL fragment for a temporary session
// (handled automatically by the browser client on page load). From there, the
// user picks a new password and we call auth.updateUser.

function scorePassword(pw: string): 0 | 1 | 2 | 3 {
  if (pw.length < 8) return 0;
  let score = 1;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw) && /\d/.test(pw)) score++;
  return Math.min(3, score) as 0 | 1 | 2 | 3;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const strength = useMemo(() => scorePassword(password), [password]);

  // On mount, verify the recovery session is active. If the user opened this
  // URL directly (no link clicked), there's no session — bounce them to
  // /forgot-password.
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setError('This reset link is invalid or expired. Request a new one.');
        setReady(true);
        return;
      }
      setEmail(session.user.email ?? null);
      setReady(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw new Error(err.message);
      setDone(true);
      // Pause on the success state so the user sees confirmation, then land
      // them back in the app.
      setTimeout(() => {
        router.push('/my-courses');
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="font-display text-h1-sm font-medium">Set a new password</h1>
        {email && (
          <p className="text-body-sm text-muted mt-2">
            For <span className="font-medium text-ink">{email}</span>
          </p>
        )}
      </div>

      <div className="rounded-card border border-line bg-surface p-8">
        {!ready ? (
          <div className="text-body-sm text-muted text-center py-4">Loading…</div>
        ) : done ? (
          <div className="text-center py-4">
            <div className="mx-auto w-12 h-12 rounded-pill bg-success-bg text-success-fg flex items-center justify-center mb-4">
              <Icons.CircleCheck size={22} />
            </div>
            <h2 className="font-display text-h3 font-medium mb-1">Password updated</h2>
            <p className="text-body-sm text-muted">Redirecting you to your courses…</p>
          </div>
        ) : error && !email ? (
          // Expired/invalid link state — no session, just an error.
          <div>
            <div className="rounded border border-danger-border bg-danger-bg text-danger-fg text-body-sm p-3 mb-4">
              {error}
            </div>
            <Link
              href="/forgot-password"
              className="w-full inline-flex justify-center items-center h-10 px-5 rounded bg-accent-600 hover:bg-accent-700 text-white font-medium text-body-sm"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="password"
                className="block text-caption uppercase text-muted mb-2"
              >
                New password
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
              <div className="mt-2 grid grid-cols-3 gap-1 h-1">
                <div
                  className={`rounded ${strength >= 1 ? (strength >= 3 ? 'bg-success-fg' : strength === 2 ? 'bg-warning-fg' : 'bg-danger-fg') : 'bg-line'}`}
                />
                <div
                  className={`rounded ${strength >= 2 ? (strength >= 3 ? 'bg-success-fg' : 'bg-warning-fg') : 'bg-line'}`}
                />
                <div
                  className={`rounded ${strength >= 3 ? 'bg-success-fg' : 'bg-line'}`}
                />
              </div>
              <div className="mt-1.5 text-body-sm text-muted">
                8+ characters, include a number.
              </div>
            </div>

            {error && (
              <div className="rounded border border-danger-border bg-danger-bg text-danger-fg text-body-sm p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || strength === 0}
              className="w-full h-10 rounded bg-accent-600 hover:bg-accent-700 disabled:bg-subtle text-white font-medium text-body-sm"
            >
              {submitting ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
