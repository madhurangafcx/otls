'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiClientError } from '@/lib/api';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Icons } from '@/components/icons';

type Props = {
  enrollmentId: string;
  currentStatus: 'pending' | 'approved' | 'rejected';
  // compact: icon-only pill buttons for use in dense surfaces (admin dashboard
  // row). Otherwise renders full-width "Approve" / "Reject" text buttons used
  // in the per-course enrollments table.
  compact?: boolean;
};

export function EnrollmentActions({
  enrollmentId,
  currentStatus,
  compact = false,
}: Props) {
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

  const showApprove = currentStatus !== 'approved';
  const showReject = currentStatus === 'pending';

  if (compact) {
    return (
      <div className="flex items-center gap-1 shrink-0">
        {showApprove && (
          <button
            onClick={() => handle('approved')}
            disabled={busy !== null}
            title="Approve"
            className="h-8 w-8 inline-flex items-center justify-center rounded bg-accent-600 hover:bg-accent-700 disabled:bg-subtle text-white transition-colors"
          >
            {busy === 'approved' ? (
              <span className="text-caption">…</span>
            ) : (
              <Icons.Check size={16} />
            )}
          </button>
        )}
        {showReject && (
          <button
            onClick={() => handle('rejected')}
            disabled={busy !== null}
            title="Reject"
            className="h-8 w-8 inline-flex items-center justify-center rounded border border-danger-border text-danger-fg hover:bg-danger-bg disabled:opacity-60 transition-colors"
          >
            {busy === 'rejected' ? (
              <span className="text-caption">…</span>
            ) : (
              <Icons.X size={16} />
            )}
          </button>
        )}
        {error && (
          <span
            title={error}
            className="text-body-sm text-danger-fg max-w-[120px] truncate"
          >
            {error}
          </span>
        )}
      </div>
    );
  }

  // Standard variant — text buttons (per-course enrollments table)
  return (
    <div className="flex items-center gap-2 justify-end">
      {showApprove && (
        <button
          onClick={() => handle('approved')}
          disabled={busy !== null}
          className="h-8 px-3 rounded bg-accent-600 hover:bg-accent-700 disabled:bg-subtle text-white font-medium text-body-sm"
        >
          {busy === 'approved' ? '…' : 'Approve'}
        </button>
      )}
      {showReject && (
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
