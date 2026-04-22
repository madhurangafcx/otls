import { coursesRepository } from '../courses/courses.repository';
import { semestersRepository, type SemesterRow } from './semesters.repository';
import type { CreateSemesterInput, UpdateSemesterInput } from './semesters.schemas';

export class SemestersServiceError extends Error {
  constructor(
    public code:
      | 'NOT_FOUND'
      | 'COURSE_NOT_FOUND'
      | 'FORBIDDEN_NOT_ENROLLED',
    message: string
  ) {
    super(message);
    this.name = 'SemestersServiceError';
  }
}

export const semestersService = {
  async get(id: string): Promise<SemesterRow> {
    const row = await semestersRepository.findById(id);
    if (!row) throw new SemestersServiceError('NOT_FOUND', `Semester ${id} not found`);
    return row;
  },

  async listByCourse(courseId: string): Promise<SemesterRow[]> {
    // Make sure the course exists so callers see 404 vs 200 empty list.
    const course = await coursesRepository.findById(courseId);
    if (!course)
      throw new SemestersServiceError('COURSE_NOT_FOUND', `Course ${courseId} not found`);
    return semestersRepository.findByCourseId(courseId);
  },

  async create(input: CreateSemesterInput): Promise<SemesterRow> {
    const course = await coursesRepository.findById(input.course_id);
    if (!course)
      throw new SemestersServiceError(
        'COURSE_NOT_FOUND',
        `Course ${input.course_id} not found`
      );

    // Blueprint §2.4 step 4: auto-compute sort_order as max + 1 if not given.
    const sort_order =
      input.sort_order ??
      (await semestersRepository.maxSortOrder(input.course_id)) + 1;

    return semestersRepository.create({
      course_id: input.course_id,
      title: input.title,
      description: input.description,
      youtube_url: input.youtube_url,
      sort_order,
    });
  },

  async update(id: string, patch: UpdateSemesterInput): Promise<SemesterRow> {
    const updated = await semestersRepository.update(id, patch);
    if (!updated) throw new SemestersServiceError('NOT_FOUND', `Semester ${id} not found`);
    return updated;
  },

  async delete(id: string): Promise<void> {
    const ok = await semestersRepository.delete(id);
    if (!ok) throw new SemestersServiceError('NOT_FOUND', `Semester ${id} not found`);
  },

  // Called from the GET /api/semesters/:id route. Enforces enrollment and
  // records a semester_views row for Pillar 1 (recording usage) telemetry.
  //
  // Admin callers skip the enrollment check and don't log a view — telemetry
  // counts student consumption only.
  async getAsStudent(
    id: string,
    studentId: string
  ): Promise<SemesterRow> {
    const row = await semestersRepository.findById(id);
    if (!row) throw new SemestersServiceError('NOT_FOUND', `Semester ${id} not found`);

    const approved = await semestersRepository.studentIsApprovedForSemester(
      studentId,
      id
    );
    if (!approved) {
      throw new SemestersServiceError(
        'FORBIDDEN_NOT_ENROLLED',
        'You must be approved-enrolled in this course to view the semester'
      );
    }

    // Fire-and-forget — never block the user-visible response on telemetry.
    void semestersRepository.logView(studentId, id);

    return row;
  },
};
