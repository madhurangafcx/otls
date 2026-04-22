import Link from 'next/link';
import { api, ApiClientError } from '@/lib/api';

// Public catalog — visible to anyone. Backend filters to status='published'
// automatically for anonymous requests.
export default async function CatalogPage() {
  let result;
  try {
    result = await api.courses.list({ status: 'published' });
  } catch (err) {
    const msg =
      err instanceof ApiClientError
        ? `${err.status} ${err.message}`
        : err instanceof Error
          ? err.message
          : 'Unknown error';
    return (
      <main className="min-h-screen bg-paper text-ink flex items-center justify-center">
        <div className="rounded border border-danger-border bg-danger-bg text-danger-fg p-4 max-w-md">
          Could not load catalog: {msg}
        </div>
      </main>
    );
  }

  const courses = result.data;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10">
          <span className="inline-block text-caption uppercase tracking-[0.09em] text-accent-600 mb-3">
            Catalog
          </span>
          <h1 className="font-display text-h1 font-medium">Courses</h1>
          <p className="text-body-lg text-muted mt-2 max-w-2xl">
            Browse the courses on offer. Request enrollment to access recordings
            and submit assignments.
          </p>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-card border border-line bg-surface p-12 text-center">
            <h2 className="font-display text-h3 mb-2">No courses yet</h2>
            <p className="text-body-sm text-muted">
              The catalog is empty. Check back later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="rounded-card border border-line bg-surface hover:bg-paper transition-colors p-6 block"
              >
                <div className="text-caption uppercase text-muted mb-3">Course</div>
                <h3 className="font-display text-h3 font-medium mb-2">{course.title}</h3>
                {course.description && (
                  <p className="text-body-sm text-muted line-clamp-2 mb-4">
                    {course.description}
                  </p>
                )}
                <div className="h-px bg-line my-4" />
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-pill border border-success-border bg-success-bg text-success-fg text-caption">
                    <span className="w-1.5 h-1.5 rounded-pill bg-success-fg" />
                    Published
                  </span>
                  <span className="text-accent-600 text-body-sm font-medium">View →</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/" className="text-body-sm text-muted hover:text-ink">
            ← Home
          </Link>
        </div>
      </div>
    </main>
  );
}
