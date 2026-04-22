import Link from 'next/link';
import { CourseCard } from '@/components/course-card';
import { Footer } from '@/components/footer';
import { Icons } from '@/components/icons';
import { TopNav } from '@/components/top-nav';
import { ApiClientError, api } from '@/lib/api';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// Landing page — Editorial Academic hero + featured-courses grid.
// Matches docs/design/edulearn-ui/project/screens-public.jsx → Landing.

async function loadSession() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  try {
    const { data } = await api.auth.me(session.access_token);
    return { session, profile: data };
  } catch (err) {
    if (err instanceof ApiClientError) return null;
    throw err;
  }
}

async function loadFeaturedCourses() {
  try {
    const res = await api.courses.list({ status: 'published', limit: 3 });
    return res.data;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [sessionState, featured] = await Promise.all([
    loadSession(),
    loadFeaturedCourses(),
  ]);

  const primaryHref = sessionState
    ? sessionState.profile.role === 'admin'
      ? '/admin'
      : '/my-courses'
    : '/register';
  const primaryLabel = sessionState ? 'Go to dashboard' : 'Create account';

  return (
    <main className="min-h-screen bg-paper text-ink">
      <TopNav />

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16">
        <div className="h-0.5 w-16 bg-accent-600 mb-6 rounded-pill" />
        <div className="text-caption uppercase tracking-[0.09em] text-accent-600 mb-5">
          Learn anything · self-paced
        </div>
        <h1 className="font-display text-display-md md:text-display-lg font-medium max-w-3xl mb-8">
          Structured learning for curious minds.
        </h1>
        <p className="text-body-lg text-muted max-w-2xl mb-10">
          Video recordings, assignments, and announcements in one place. Join a course,
          work at your own pace, and submit when you&apos;re ready.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 h-11 px-5 rounded bg-accent-600 hover:bg-accent-700 text-white font-medium text-body transition-colors"
          >
            Browse courses
            <Icons.ArrowRight size={16} />
          </Link>
          <Link
            href={primaryHref}
            className="inline-flex items-center h-11 px-5 rounded border border-line hover:bg-surface text-ink font-medium text-body transition-colors"
          >
            {primaryLabel}
          </Link>
        </div>
      </section>

      {/* Featured courses */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="flex items-baseline justify-between mb-8">
          <h2 className="font-display text-h2 font-medium">Featured courses</h2>
          <Link
            href="/courses"
            className="text-body-sm text-accent-600 hover:underline inline-flex items-center gap-1"
          >
            See all
            <Icons.ArrowRight size={14} />
          </Link>
        </div>
        {featured.length === 0 ? (
          <div className="rounded-card border border-line bg-surface p-10 text-center">
            <p className="text-body-sm text-muted">
              No courses published yet. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featured.map((course) => (
              <CourseCard
                key={course.id}
                title={course.title}
                description={course.description}
                status={course.status}
                semesterCount={course.semester_count}
                href={`/courses/${course.id}`}
              />
            ))}
          </div>
        )}
      </section>

      <Footer />
    </main>
  );
}
