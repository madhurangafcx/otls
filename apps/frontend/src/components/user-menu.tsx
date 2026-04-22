'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Avatar } from './avatar';
import { Icons } from './icons';

// Avatar with a hover/click dropdown: Settings (admin only) + Log out.
// Covers both the student TopNav and the AdminTopNav. Closes on outside
// click and Escape. No JS library — ~60 lines of hand-rolled popover.

type Props = {
  name: string | null;
  email: string;
  role: 'admin' | 'student';
  size?: number;
};

export function UserMenu({ name, email, role, size = 32 }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    } finally {
      // Hard-refresh so Server Components re-read the cleared session
      router.push('/');
      router.refresh();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center rounded-pill hover:ring-2 hover:ring-accent-600/20 transition-shadow focus:outline-none focus:ring-2 focus:ring-accent-600/40"
      >
        <Avatar name={name} email={email} size={size} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 min-w-[220px] rounded-card border border-line bg-surface shadow-lg overflow-hidden z-50"
        >
          <div className="px-4 py-3 border-b border-line">
            <div className="font-medium text-body-sm truncate">{name ?? email}</div>
            <div className="text-caption text-muted truncate">{email}</div>
            <div className="inline-block mt-1 px-2 py-0.5 rounded-pill border border-line bg-paper text-caption uppercase text-muted">
              {role}
            </div>
          </div>
          <div className="py-1">
            {role === 'admin' && (
              <Link
                href="/admin/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-body-sm text-ink hover:bg-paper"
              >
                <Icons.Settings size={16} className="text-muted" />
                Settings
              </Link>
            )}
            <Link
              href="/my-courses"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-body-sm text-ink hover:bg-paper"
            >
              <Icons.BookOpen size={16} className="text-muted" />
              My Courses
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-body-sm text-danger-fg hover:bg-danger-bg disabled:opacity-60"
            >
              <Icons.LogOut size={16} />
              {signingOut ? 'Signing out…' : 'Log out'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
