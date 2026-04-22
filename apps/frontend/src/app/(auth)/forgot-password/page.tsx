'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Icons } from '@/components/icons';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

// Forgot-password flow, step 1: ask for the email. Supabase sends a reset
// email whose link carries a one-time PKCE token. Clicking the link sets a
// temporary session and lands on /reset-password where the user picks a new
// password.

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (err) throw new Error(err.message);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="font-display text-h1-sm font-medium">Reset password</h1>
        <p className="text-body-sm text-muted mt-2">
          Enter the email on your account and we&apos;ll send a reset link.
        </p>
      </div>

      <div className="rounded-card border border-line bg-surface p-8">
        {sent ? (
          <div className="text-center py-4">
            <div className="mx-auto w-12 h-12 rounded-pill bg-success-bg text-success-fg flex items-center justify-center mb-4">
              <Icons.Mail size={22} />
            </div>
            <h2 className="font-display text-h3 font-medium mb-2">Check your email</h2>
            <p className="text-body-sm text-muted">
              If an account exists for{' '}
              <span className="font-medium text-ink">{email}</span>, a reset link is on
              its way. The link expires in 1 hour.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
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

            {error && (
              <div className="rounded border border-danger-border bg-danger-bg text-danger-fg text-body-sm p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 rounded bg-accent-600 hover:bg-accent-700 disabled:bg-subtle text-white font-medium text-body-sm"
            >
              {submitting ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
      </div>

      <p className="mt-6 text-center text-body-sm text-muted">
        Remembered it?{' '}
        <Link href="/login" className="text-accent-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
