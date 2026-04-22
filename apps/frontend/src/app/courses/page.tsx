import { api, ApiClientError } from '@/lib/api';
import { TopNav } from '@/components/top-nav';
import { CatalogClient } from './catalog-client';

// Public catalog — visible to anyone. Backend filters to status='published'
// automatically for anonymous requests. Server fetches the first page, a client
// component below handles search, sort, and "Load more" pagination.
export default async function CatalogPage() {
  let result;
  try {
    result = await api.courses.list({ status: 'published', limit: 24 });
  } catch (err) {
    const msg =
      err instanceof ApiClientError
        ? `${err.status} ${err.message}`
        : err instanceof Error
          ? err.message
          : 'Unknown error';
    return (
      <main className="min-h-screen bg-paper text-ink">
        <TopNav active="catalog" />
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="rounded border border-danger-border bg-danger-bg text-danger-fg p-4">
            Could not load catalog: {msg}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <TopNav active="catalog" />
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="font-display text-h1 font-medium">Courses</h1>
          <p className="text-body-lg text-muted mt-2 max-w-2xl">
            Browse the courses on offer. Request enrollment to access recordings
            and submit assignments.
          </p>
        </div>

        <CatalogClient
          initialCourses={result.data}
          initialNextCursor={result.pagination.next_cursor}
        />
      </div>
    </main>
  );
}
