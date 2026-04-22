import { supabase } from '../../config/supabase';

export type ProgressSummary = {
  course_id: string;
  total: number;
  completed: number;
  percentage: number; // 0..100, rounded
};

function pct(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

export const progressRepository = {
  // Count of semesters that belong to the course.
  async countSemestersInCourse(courseId: string): Promise<number> {
    const { count, error } = await supabase
      .from('semesters')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);
    if (error) throw new Error(`progress.countSemestersInCourse: ${error.message}`);
    return count ?? 0;
  },

  // Count of completed progress rows for this student scoped to one course.
  // Filters through semesters!inner to limit by course_id.
  async countCompletedForStudentInCourse(
    studentId: string,
    courseId: string
  ): Promise<number> {
    const { count, error } = await supabase
      .from('student_progress')
      .select('*, semester:semesters!inner(course_id)', {
        count: 'exact',
        head: true,
      })
      .eq('student_id', studentId)
      .eq('completed', true)
      .eq('semester.course_id', courseId);
    if (error)
      throw new Error(`progress.countCompletedForStudentInCourse: ${error.message}`);
    return count ?? 0;
  },

  async summaryForCourse(studentId: string, courseId: string): Promise<ProgressSummary> {
    const [total, completed] = await Promise.all([
      this.countSemestersInCourse(courseId),
      this.countCompletedForStudentInCourse(studentId, courseId),
    ]);
    return { course_id: courseId, total, completed, percentage: pct(completed, total) };
  },

  // All approved enrollments for this student → one summary per course.
  // Kept as N+1 on purpose (N = approved courses, small) for readability.
  // If student count grows we can swap to a single SQL aggregation.
  async overviewForStudent(studentId: string): Promise<ProgressSummary[]> {
    const { data, error } = await supabase
      .from('enrollments')
      .select('course_id')
      .eq('student_id', studentId)
      .eq('status', 'approved');
    if (error) throw new Error(`progress.overviewForStudent: ${error.message}`);
    const courseIds = (data as Array<{ course_id: string }>).map((r) => r.course_id);
    const summaries = await Promise.all(
      courseIds.map((cid) => this.summaryForCourse(studentId, cid))
    );
    return summaries;
  },
};
