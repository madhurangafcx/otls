import { getSupabaseServerClient } from '@/lib/supabase-server';
import { api } from '@/lib/api';
import { Avatar } from '@/components/avatar';

export default async function AdminSettingsPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: profile } = await api.auth.me(session.access_token);

  return (
    <div className="max-w-3xl px-8 py-10">
      <div className="mb-8">
        <h1 className="font-display text-h1-sm font-medium">Settings</h1>
        <p className="text-body-sm text-muted mt-1">
          Your admin account.
        </p>
      </div>

      <div className="rounded-card border border-line bg-surface p-6 mb-6">
        <h2 className="font-display text-h3 font-medium mb-5">Profile</h2>
        <div className="flex items-center gap-4 mb-6">
          <Avatar name={profile.full_name} email={profile.email} size={56} />
          <div>
            <div className="font-medium text-body">
              {profile.full_name ?? profile.email}
            </div>
            <div className="text-body-sm text-muted">{profile.email}</div>
            <div className="inline-block mt-1 px-2 py-0.5 rounded-pill border border-line bg-paper text-caption uppercase text-muted">
              {profile.role}
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body-sm">
          <dt className="text-muted">Account created</dt>
          <dd className="tabular-nums">
            {new Date(profile.created_at).toLocaleDateString(undefined, {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </dd>
          <dt className="text-muted">User ID</dt>
          <dd className="font-mono text-caption">{profile.id}</dd>
        </dl>
      </div>

      <div className="rounded-card border border-line bg-paper p-6">
        <h2 className="font-display text-h3 font-medium mb-2">Coming soon</h2>
        <ul className="text-body-sm text-muted space-y-1.5 list-disc pl-5">
          <li>Change password</li>
          <li>Update name + avatar</li>
          <li>Email notifications (pending enrollments, submissions)</li>
          <li>Team admin invitations</li>
        </ul>
        <p className="text-body-sm text-muted mt-4">
          For now, account changes require a direct Supabase update. Ping the
          maintainer if you need something.
        </p>
      </div>
    </div>
  );
}
