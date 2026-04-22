'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ApiClientError, api } from '@/lib/api';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';

type Props = {
  courseId: string;
  announcementId: string;
  pinned: boolean;
  title: string;
};

// Row-level actions on the admin announcements list: pin toggle + delete.
// Edit link is rendered as a plain <Link> so it lives outside this client
// component.
export function RowActions({ courseId, announcementId, pinned, title }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<'pin' | 'delete' | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function getToken(): Promise<string> {
    const supabase = getSupabaseBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error('Not logged in');
    return session.access_token;
  }

  async function togglePin() {
    setErr(null);
    setBusy('pin');
    try {
      const token = await getToken();
      await api.announcements.update(announcementId, { pinned: !pinned }, token);
      router.refresh();
    } catch (e) {
      if (e instanceof ApiClientError) setErr(e.message);
      else setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function softDelete() {
    if (
      !confirm(
        `Delete announcement "${title}"? This is reversible via the audit trail, but not from the UI.`
      )
    )
      return;
    setErr(null);
    setBusy('delete');
    try {
      const token = await getToken();
      await api.announcements.delete(announcementId, token);
      router.refresh();
    } catch (e) {
      if (e instanceof ApiClientError) setErr(e.message);
      else setErr((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={togglePin}
        disabled={busy !== null}
        className={`text-body-sm font-medium hover:underline disabled:opacity-50 ${
          pinned ? 'text-warning-fg' : 'text-accent-600'
        }`}
      >
        {busy === 'pin' ? '…' : pinned ? 'Unpin' : 'Pin'}
      </button>
      <Link
        href={`/admin/courses/${courseId}/announcements/${announcementId}`}
        className="text-body-sm font-medium text-muted hover:text-ink"
      >
        Edit
      </Link>
      <button
        type="button"
        onClick={softDelete}
        disabled={busy !== null}
        className="text-body-sm font-medium text-muted hover:text-danger-fg disabled:opacity-50"
      >
        {busy === 'delete' ? '…' : 'Delete'}
      </button>
      {err && <span className="text-caption text-danger-fg ml-2">{err}</span>}
    </div>
  );
}
