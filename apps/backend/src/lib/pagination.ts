// Cursor pagination helpers — blueprint §5.2 mandates cursor-based, not offset.
// The cursor is an ISO 8601 timestamp (of the `created_at` of the last row in
// the previous page). To get page N+1, the caller passes `cursor=<last created_at>`
// and the repository filters `created_at < cursor` ORDER BY created_at DESC.

import { z } from 'zod';

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().datetime({ offset: true }).optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export type Paginated<T> = {
  data: T[];
  pagination: {
    next_cursor: string | null;
  };
};

// Given a result set from Supabase ordered by created_at DESC with `limit`,
// produce the next_cursor by looking at the last row's created_at. If fewer
// rows than the requested limit came back, there is no next page.
export function toPaginated<T extends { created_at: string }>(
  rows: T[],
  limit: number
): Paginated<T> {
  const next_cursor = rows.length === limit ? (rows[rows.length - 1]?.created_at ?? null) : null;
  return { data: rows, pagination: { next_cursor } };
}
