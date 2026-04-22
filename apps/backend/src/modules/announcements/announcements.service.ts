import { coursesRepository } from '../courses/courses.repository';
import {
  type AnnouncementRow,
  announcementsRepository,
  type OverviewRow,
} from './announcements.repository';

export class AnnouncementsServiceError extends Error {
  constructor(
    public code:
      | 'NOT_FOUND'
      | 'COURSE_NOT_FOUND'
      | 'FORBIDDEN_NOT_ENROLLED'
      | 'PIN_CONFLICT',
    message: string
  ) {
    super(message);
    this.name = 'AnnouncementsServiceError';
  }
}

export const announcementsService = {
  async get(id: string): Promise<AnnouncementRow> {
    const row = await announcementsRepository.findById(id);
    if (!row) {
      throw new AnnouncementsServiceError('NOT_FOUND', `Announcement ${id} not found`);
    }
    return row;
  },

  // Design-doc pagination semantics:
  //   Page 1 (no cursor): pinned first (if any), then non-pinned desc
  //   Pages 2+ (cursor):  non-pinned only, pinned never duplicated
  // next_cursor is the last non-pinned row's created_at, or null if < limit.
  async listByCourse(
    courseId: string,
    limit: number,
    cursor: string | undefined
  ): Promise<{ rows: AnnouncementRow[]; next_cursor: string | null }> {
    const course = await coursesRepository.findById(courseId);
    if (!course) {
      throw new AnnouncementsServiceError(
        'COURSE_NOT_FOUND',
        `Course ${courseId} not found`
      );
    }

    let rows: AnnouncementRow[];
    if (cursor) {
      rows = await announcementsRepository.listNonPinnedPage(courseId, limit, cursor);
    } else {
      rows = await announcementsRepository.listPinnedAndRecent(courseId, limit);
    }

    // next_cursor from the last NON-pinned row only. The pinned row never
    // participates in cursor math — it always stays at the top of page 1.
    const nonPinned = rows.filter((r) => !r.pinned);
    const last = nonPinned[nonPinned.length - 1];
    const next_cursor = nonPinned.length >= limit && last ? last.created_at : null;
    return { rows, next_cursor };
  },

  async create(
    adminId: string,
    input: { course_id: string; title: string; body: string; pinned: boolean }
  ): Promise<AnnouncementRow> {
    const course = await coursesRepository.findById(input.course_id);
    if (!course) {
      throw new AnnouncementsServiceError(
        'COURSE_NOT_FOUND',
        `Course ${input.course_id} not found`
      );
    }

    // If caller asks to pin on create, unpin all existing pinned ones first so
    // the partial unique index doesn't reject the insert. Best-effort sequencing
    // — the two writes aren't inside one Postgres transaction (supabase-js has
    // no transaction API), so a concurrent second-pin can still race. We catch
    // the unique-violation and surface 409.
    if (input.pinned) {
      await announcementsRepository.unpinAllForCourse(input.course_id);
    }

    try {
      return await announcementsRepository.create({
        course_id: input.course_id,
        author_id: adminId,
        title: input.title,
        body: input.body,
        pinned: input.pinned,
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'PIN_CONFLICT') {
        throw new AnnouncementsServiceError(
          'PIN_CONFLICT',
          'Another announcement became pinned first — refresh and retry'
        );
      }
      throw err;
    }
  },

  async update(
    id: string,
    patch: { title?: string; body?: string; pinned?: boolean }
  ): Promise<AnnouncementRow> {
    const current = await announcementsRepository.findById(id);
    if (!current) {
      throw new AnnouncementsServiceError('NOT_FOUND', `Announcement ${id} not found`);
    }

    // Pinning this one means unpinning any other currently-pinned announcement
    // in the same course first. See create() for the concurrency note.
    if (patch.pinned === true && !current.pinned) {
      await announcementsRepository.unpinAllForCourse(current.course_id);
    }

    try {
      const updated = await announcementsRepository.update(id, patch);
      if (!updated) {
        throw new AnnouncementsServiceError('NOT_FOUND', `Announcement ${id} not found`);
      }
      return updated;
    } catch (err) {
      if (err instanceof Error && err.message === 'PIN_CONFLICT') {
        throw new AnnouncementsServiceError(
          'PIN_CONFLICT',
          'Another announcement became pinned first — refresh and retry'
        );
      }
      throw err;
    }
  },

  async softDelete(id: string): Promise<void> {
    const ok = await announcementsRepository.softDelete(id);
    if (!ok) {
      throw new AnnouncementsServiceError('NOT_FOUND', `Announcement ${id} not found`);
    }
  },

  async markReadForStudent(studentId: string, courseId: string): Promise<void> {
    await announcementsRepository.markReadForStudent(studentId, courseId);
  },

  async overviewForStudent(studentId: string): Promise<OverviewRow[]> {
    return announcementsRepository.overviewForStudent(studentId);
  },
};
