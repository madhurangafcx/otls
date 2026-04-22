import { coursesRepository } from '../courses/courses.repository';
import {
  enrollmentsRepository,
  type EnrollmentRow,
  type EnrollmentWithCourse,
  type EnrollmentWithStudent,
} from './enrollments.repository';

export class EnrollmentsServiceError extends Error {
  constructor(
    public code:
      | 'COURSE_NOT_FOUND'
      | 'COURSE_NOT_PUBLISHED'
      | 'ALREADY_REQUESTED'
      | 'NOT_FOUND'
      | 'INVALID_TRANSITION',
    message: string
  ) {
    super(message);
    this.name = 'EnrollmentsServiceError';
  }
}

export const enrollmentsService = {
  // Blueprint §2.7: student requests enrollment for a course
  async request(studentId: string, courseId: string): Promise<EnrollmentRow> {
    const course = await coursesRepository.findById(courseId);
    if (!course) {
      throw new EnrollmentsServiceError('COURSE_NOT_FOUND', `Course ${courseId} not found`);
    }
    if (course.status !== 'published') {
      throw new EnrollmentsServiceError(
        'COURSE_NOT_PUBLISHED',
        'Course is not open for enrollment'
      );
    }

    try {
      return await enrollmentsRepository.create({
        student_id: studentId,
        course_id: courseId,
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'ALREADY_REQUESTED') {
        throw new EnrollmentsServiceError(
          'ALREADY_REQUESTED',
          'You already have an enrollment request for this course'
        );
      }
      throw err;
    }
  },

  // Blueprint §2.9: list my enrollments (all statuses) — used by /my-courses
  async listForStudent(studentId: string): Promise<EnrollmentWithCourse[]> {
    return enrollmentsRepository.findByStudent(studentId);
  },

  // Blueprint §2.8: admin list enrollments, optionally filtered by course + status
  async listForCourse(
    courseId: string,
    statusFilter?: 'pending' | 'approved' | 'rejected'
  ): Promise<EnrollmentWithStudent[]> {
    return enrollmentsRepository.findByCourse(courseId, statusFilter);
  },

  // Blueprint §15.2 state transitions: pending→approved, pending→rejected,
  // rejected→pending (admin-only re-open, rare), approved→rejected (revoke, rare).
  // Admin-driven; validated here to prevent weird client-side state jumps.
  async review(
    enrollmentId: string,
    adminId: string,
    decision: 'approved' | 'rejected'
  ): Promise<EnrollmentRow> {
    const current = await enrollmentsRepository.findById(enrollmentId);
    if (!current) {
      throw new EnrollmentsServiceError('NOT_FOUND', `Enrollment ${enrollmentId} not found`);
    }

    // Allowed transitions: anything → approved OR anything → rejected from admin context
    // (blueprint §15.2 permits admin re-open of rejected and revoke of approved).
    // No-op if already at target state — treat as success idempotently.
    if (current.status === decision) {
      return current;
    }

    const updated = await enrollmentsRepository.review(enrollmentId, adminId, decision);
    if (!updated) {
      throw new EnrollmentsServiceError('NOT_FOUND', `Enrollment ${enrollmentId} not found`);
    }
    return updated;
  },

  async findForCourse(
    studentId: string,
    courseId: string
  ): Promise<EnrollmentRow | null> {
    return enrollmentsRepository.findByStudentAndCourse(studentId, courseId);
  },
};
