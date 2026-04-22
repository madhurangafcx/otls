'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiClientError } from '@/lib/api';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type Props = {
  enrollmentId: string;
  currentStatus: 'pending' | 'approved' | 'rejected';
};

export function EnrollmentActions({ enrollmentId, currentStatus }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<'approved' | 'rejected' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(decision: 'approved' | 'rejected') {
    setError(null);
    setBusy(decision);
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');
      await api.enrollments.review(enrollmentId, decision, session.access_token);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : (err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  // For pending rows we show both buttons. For already-rejected rows, show a
  // single "Approve" button to re-open (blueprint §15.2 allows admin re-open).
  return (
    <div className="flex items-center gap-2 justify-end">
      {currentStatus !== 'approved' && (
        <button
          onClick={() => handle('approved')}
          disabled={busy !== null}
          className="h-8 px-3 rounded bg-accent-600 hover:bg-accent-700 disabled:bg-subtle text-white font-medium text-body-sm"
        >
          {busy === 'approved' ? '…' : 'Approve'}
        </button>
      )}
      {currentStatus === 'pending' && (
        <button
          onClick={() => handle('rejected')}
          disabled={busy !== null}
          className="h-8 px-3 rounded border border-danger-border text-danger-fg hover:bg-danger-bg font-medium text-body-sm"
        >
          {busy === 'rejected' ? '…' : 'Reject'}
        </button>
      )}
      {error && (
        <span className="text-body-sm text-danger-fg ml-2 shrink-0">{error}</span>
      )}
    </div>
  );
}
