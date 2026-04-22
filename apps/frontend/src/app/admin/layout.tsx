import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { api, ApiClientError } from '@/lib/api';

// Admin layout — sidebar chrome + role gate.
// Matches the AdminSidebar pattern from docs/design/edulearn-ui/project/parts.jsx
// (240px sidebar, paper bg, Main + Account sections, ochre-50 active state).
//
// Backend requireRole('admin') is the authoritative gate — this layout just
// makes sure non-admins don't see the admin UI at all.

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login?next=/admin');
  }

  let role: string | null = null;
  try {
    const { data } = await api.auth.me(session.access_token);
    role = data.role;
  } catch (err) {
    if (err instanceof ApiClientError) {
      redirect('/login');
    }
    throw err;
  }

  if (role !== 'admin') {
    // Non-admin logged in → send to student home, not login
    redirect('/my-courses');
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex">
      {/* Sidebar — 240px per DESIGN.md AdminSidebar spec */}
      <aside className="w-60 border-r border-line bg-paper px-2.5 py-3.5 flex flex-col gap-0.5 shrink-0">
        <div className="px-3 pb-2">
          <Link href="/" className="font-display text-[20px] font-semibold">
            Edulearn<span className="text-accent-600">.</span>
          </Link>
          <div className="inline-block mt-1 ml-2 px-2 py-0.5 text-caption uppercase bg-paper border border-line rounded-pill text-muted">
            Admin
          </div>
        </div>

        <div className="text-caption uppercase tracking-[0.08em] text-subtle px-3 pt-3.5 pb-1.5">
          Main
        </div>
        <SideItem href="/admin" label="Dashboard" />
        <SideItem href="/admin/courses" label="Courses" />

        <div className="text-caption uppercase tracking-[0.08em] text-subtle px-3 pt-3.5 pb-1.5">
          Account
        </div>
        <SideItem href="/" label="View site" />
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

function SideItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 rounded text-[13.5px] font-medium text-muted hover:bg-black/[0.03] hover:text-ink transition-colors"
    >
      {label}
    </Link>
  );
}
