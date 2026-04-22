// TopNav — three variants from the Edulearn design system.
// Design reference: docs/design/edulearn-ui/project/parts.jsx → TopNav
//
//   public  — Brand | spacer | Log in | Create account          (unauthed)
//   student — Brand | Courses · My Courses | Search · Avatar     (authed)
//   admin   — Brand 18px · [Admin] | spacer | ⌘K · Avatar        (inside /admin/*)
//
// The default export is a smart server component: it resolves session server-side
// and picks public vs student automatically. Callers inside /admin/* should use
// the explicit <AdminTopNav /> since the admin layout already knows the role.

import Link from 'next/link';
import { ApiClientError, api } from '@/lib/api';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { Brand } from './brand';
import { Icons } from './icons';
import { UserMenu } from './user-menu';

type StudentNavKey = 'catalog' | 'my' | null;

export async function TopNav({ active = null }: { active?: StudentNavKey }) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return <PublicTopNav />;

  try {
    const { data: profile } = await api.auth.me(session.access_token);
    return <StudentTopNav profile={profile} active={active} />;
  } catch (err) {
    if (err instanceof ApiClientError) return <PublicTopNav />;
    throw err;
  }
}

export function PublicTopNav() {
  return (
    <header className="h-[62px] border-b border-line bg-paper">
      <div className="max-w-6xl mx-auto h-full px-6 flex items-center">
        <Link href="/">
          <Brand />
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="h-9 px-3.5 rounded text-body-sm font-medium text-ink hover:bg-black/[0.04] flex items-center"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="h-9 px-4 rounded bg-accent-600 hover:bg-accent-700 text-white font-medium text-body-sm flex items-center"
          >
            Create account
          </Link>
        </div>
      </div>
    </header>
  );
}

export function StudentTopNav({
  profile,
  active = null,
}: {
  profile: { full_name: string | null; email: string; role: 'admin' | 'student' };
  active?: StudentNavKey;
}) {
  return (
    <header className="h-[62px] border-b border-line bg-paper">
      <div className="max-w-6xl mx-auto h-full px-6 flex items-center">
        <Link href="/">
          <Brand />
        </Link>
        <nav className="ml-8 flex items-center gap-6 text-body-sm">
          <Link
            href="/courses"
            className={
              active === 'catalog'
                ? 'text-ink font-medium'
                : 'text-muted hover:text-ink transition-colors'
            }
          >
            Courses
          </Link>
          <Link
            href="/my-courses"
            className={
              active === 'my'
                ? 'text-ink font-medium'
                : 'text-muted hover:text-ink transition-colors'
            }
          >
            My Courses
          </Link>
          {profile.role === 'admin' && (
            <Link href="/admin" className="text-muted hover:text-ink transition-colors">
              Admin
            </Link>
          )}
        </nav>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <Icons.Search size={18} className="text-muted" />
          <UserMenu name={profile.full_name} email={profile.email} role={profile.role} />
        </div>
      </div>
    </header>
  );
}

export function AdminTopNav({
  profile,
}: {
  profile: { full_name: string | null; email: string };
}) {
  return (
    <header className="h-14 border-b border-line bg-paper">
      <div className="h-full px-5 flex items-center">
        <Link href="/" className="flex items-center gap-2">
          <Brand size={18} />
        </Link>
        <span className="ml-1.5 px-2 py-0.5 text-caption uppercase bg-paper border border-line rounded-pill text-muted">
          Admin
        </span>
        <div className="flex-1" />
        <span className="hidden sm:inline-flex h-6 px-1.5 items-center rounded border border-line bg-surface text-caption font-mono text-muted">
          ⌘K
        </span>
        <div className="ml-3">
          {/* biome-ignore lint/a11y/useValidAriaRole: `role` here is a component prop, not an HTML ARIA role */}
          <UserMenu
            name={profile.full_name}
            email={profile.email}
            role="admin"
            size={30}
          />
        </div>
      </div>
    </header>
  );
}
