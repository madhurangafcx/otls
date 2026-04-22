'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Icons } from '@/components/icons';

// Client-side sign out button for the admin sidebar Account section.
// Mirrors the UserMenu sign-out path: clears Supabase cookies, then hard-
// refreshes so Server Components re-read the cleared session.
export function SidebarSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    } finally {
      router.push('/');
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex items-center gap-2.5 px-3 py-2 rounded text-[13.5px] font-medium text-muted hover:bg-black/[0.03] hover:text-danger-fg disabled:opacity-60 transition-colors text-left"
    >
      <Icons.LogOut size={16} />
      {busy ? 'Signing out…' : 'Log out'}
    </button>
  );
}
