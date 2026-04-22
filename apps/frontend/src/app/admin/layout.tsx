import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { api, ApiClientError } from '@/lib/api';
import { AdminTopNav } from '@/components/top-nav';
import { Icons } from '@/components/icons';
import { SidebarSignOut } from './sidebar-signout';

// Admin layout — AdminTopNav above a 240px sidebar + content column.
// Matches the AdminShell pattern from docs/design/edulearn-ui/project/parts.jsx
// (TopNav variant="admin" on top, AdminSidebar on the left, content right).
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

  let profile: { full_name: string | null; email: string; role: string } | null = null;
  try {
    const { data } = await api.auth.me(session.access_token);
    profile = data;
  } catch (err) {
    if (err instanceof ApiClientError) {
      redirect('/login');
    }
    throw err;
  }

  if (!profile || profile.role !== 'admin') {
    // Non-admin logged in → send to student home, not login
    redirect('/my-courses');
  }

  // Pending-enrollment count drives the sidebar badge. Best-effort — if the
  // stats call fails the badge just hides rather than breaking the layout.
  let pendingCount = 0;
  try {
    const { data: stats } = await api.admin.stats(session.access_token);
    pendingCount = stats.pending_enrollments;
  } catch {
    pendingCount = 0;
  }

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <AdminTopNav profile={profile} />
      <div className="flex-1 flex min-h-0">
        {/* Sidebar — 240px per DESIGN.md AdminSidebar spec */}
        <aside className="w-60 border-r border-line bg-paper px-2.5 py-3.5 flex flex-col gap-0.5 shrink-0">
          <div className="text-caption uppercase tracking-[0.08em] text-subtle px-3 pt-2 pb-1.5">
            Main
          </div>
          <SideItem
            href="/admin"
            label="Dashboard"
            icon={<Icons.LayoutDashboard size={17} />}
          />
          <SideItem
            href="/admin/courses"
            label="Courses"
            icon={<Icons.BookOpen size={17} />}
          />
          <SideItem
            href="/admin/enrollments"
            label="Enrollments"
            icon={<Icons.UserCheck size={17} />}
            badge={pendingCount > 0 ? pendingCount : undefined}
          />
          <SideItem
            href="/admin/assignments"
            label="Assignments"
            icon={<Icons.ClipboardList size={17} />}
          />
          <SideItem
            href="/admin/students"
            label="Students"
            icon={<Icons.Users size={17} />}
          />

          <div className="text-caption uppercase tracking-[0.08em] text-subtle px-3 pt-3.5 pb-1.5">
            Account
          </div>
          <SideItem
            href="/admin/settings"
            label="Settings"
            icon={<Icons.Settings size={17} />}
          />
          <SideItem
            href="/"
            label="View site"
            icon={<Icons.Eye size={17} />}
          />
          <SidebarSignOut />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

function SideItem({
  href,
  label,
  icon,
  badge,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 px-3 py-2 rounded text-[13.5px] font-medium text-muted hover:bg-black/[0.03] hover:text-ink transition-colors"
    >
      {icon && <span className="text-muted">{icon}</span>}
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-pill bg-warning-bg border border-warning-border text-warning-fg text-caption tabular-nums">
          {badge}
        </span>
      )}
    </Link>
  );
}
