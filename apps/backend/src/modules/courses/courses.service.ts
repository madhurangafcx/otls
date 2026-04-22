import { type Paginated, toPaginated } from '../../lib/pagination';
import { type CourseRow, coursesRepository } from './courses.repository';
import type {
  CreateCourseInput,
  ListCoursesQuery,
  UpdateCourseInput,
} from './courses.schemas';

export class CoursesServiceError extends Error {
  constructor(
    public code:
      | 'NOT_FOUND'
      | 'VALIDATION_FAILED'
      | 'PUBLISH_REQUIRES_SEMESTERS'
      | 'PUBLISH_REQUIRES_YOUTUBE_URLS',
    message: string
  ) {
    super(message);
    this.name = 'CoursesServiceError';
  }
}

export const coursesService = {
  async get(id: string): Promise<CourseRow> {
    const row = await coursesRepository.findById(id);
    if (!row) throw new CoursesServiceError('NOT_FOUND', `Course ${id} not found`);
    return row;
  },

  // Students see published only. Admins can filter or see all.
  async list(query: ListCoursesQuery, isAdmin: boolean): Promise<Paginated<CourseRow>> {
    const rows = await coursesRepository.list({
      limit: query.limit,
      cursor: query.cursor,
      statusFilter: query.status,
      adminView: isAdmin,
    });
    return toPaginated(rows, query.limit);
  },

  async create(input: CreateCourseInput, userId: string): Promise<CourseRow> {
    return coursesRepository.create({
      title: input.title,
      description: input.description,
      created_by: userId,
    });
  },

  async update(id: string, patch: UpdateCourseInput): Promise<CourseRow> {
    const updated = await coursesRepository.update(id, patch);
    if (!updated) throw new CoursesServiceError('NOT_FOUND', `Course ${id} not found`);
    return updated;
  },

  // Publish/unpublish. Publishing has business-rule validation (blueprint §16.1):
  // at least one semester, and all semesters must have a valid youtube_url.
  async setStatus(id: string, status: 'draft' | 'published'): Promise<CourseRow> {
    // Verify the course exists first so we return 404 before validation checks.
    const current = await coursesRepository.findById(id);
    if (!current) throw new CoursesServiceError('NOT_FOUND', `Course ${id} not found`);

    if (status === 'published') {
      const semesterCount = await coursesRepository.countSemesters(id);
      if (semesterCount === 0) {
        throw new CoursesServiceError(
          'PUBLISH_REQUIRES_SEMESTERS',
          'Cannot publish a course with zero semesters'
        );
      }
      const missing = await coursesRepository.countSemestersMissingYoutube(id);
      if (missing > 0) {
        throw new CoursesServiceError(
          'PUBLISH_REQUIRES_YOUTUBE_URLS',
          `Cannot publish: ${missing} semester${missing === 1 ? '' : 's'} missing a YouTube URL`
        );
      }
    }

    const updated = await coursesRepository.setStatus(id, status);
    if (!updated) throw new CoursesServiceError('NOT_FOUND', `Course ${id} not found`);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const ok = await coursesRepository.delete(id);
    if (!ok) throw new CoursesServiceError('NOT_FOUND', `Course ${id} not found`);
  },
};
