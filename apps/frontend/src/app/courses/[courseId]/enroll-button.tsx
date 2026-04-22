'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiClientError, api } from '@/lib/api';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

export function EnrollButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error('Not logged in');

      await api.enrollments.request(courseId, session.access_token);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) setError(err.message);
      else setError(err instanceof Error ? err.message : 'Failed to request enrollment');
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={submitting}
        className="h-10 px-5 rounded bg-accent-600 hover:bg-accent-700 disabled:bg-subtle text-white font-medium text-body-sm"
      >
        {submitting ? 'Requesting…' : 'Request enrollment'}
      </button>
      {error && (
        <div className="mt-3 rounded border border-danger-border bg-danger-bg text-danger-fg text-body-sm p-3">
          {error}
        </div>
      )}
    </div>
  );
}
