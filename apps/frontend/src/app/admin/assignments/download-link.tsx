'use client';

import { useState } from 'react';
import { ApiClientError, api } from '@/lib/api';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type Props = {
  assignmentId: string;
};

// Signed URLs expire in 60 seconds, so we can't render them into the page HTML
// (the list might be viewed for minutes before a click). Instead, fetch on
// click and open in a new tab while the URL is fresh.
export function DownloadLink({ assignmentId }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setErr('Session expired');
        return;
      }
      const { data } = await api.assignments.download(assignmentId, session.access_token);
      // Open in a new tab. Browsers treat programmatic window.open as a user
      // gesture because this click handler was triggered by a real click.
      window.open(data.url, '_blank', 'noopener');
    } catch (e) {
      if (e instanceof ApiClientError) setErr(e.message);
      else setErr('Could not get download link');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="text-accent-600 text-body-sm font-medium hover:underline disabled:opacity-50"
      >
        {busy ? 'Getting link…' : 'Download'}
      </button>
      {err && <span className="text-caption text-danger-fg">{err}</span>}
    </div>
  );
}
