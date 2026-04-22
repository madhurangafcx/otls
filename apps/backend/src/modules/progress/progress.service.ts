import { type ProgressSummary, progressRepository } from './progress.repository';

export const progressService = {
  // Blueprint §2.12: single course progress — {total, completed, percentage}
  async forCourse(studentId: string, courseId: string): Promise<ProgressSummary> {
    return progressRepository.summaryForCourse(studentId, courseId);
  },

  // Overview across all approved enrollments. Used by /my-courses to render
  // progress badges per card.
  async overview(studentId: string): Promise<ProgressSummary[]> {
    return progressRepository.overviewForStudent(studentId);
  },
};
