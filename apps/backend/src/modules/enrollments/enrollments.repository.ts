import { supabase } from '../../config/supabase';

export type EnrollmentRow = {
  id: string;
  student_id: string;
  course_id: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  last_announcement_read_at: string | null;
  created_at: string;
};

export type EnrollmentWithCourse = EnrollmentRow & {
  course: {
    id: string;
    title: string;
    description: string | null;
    status: 'draft' | 'published';
  } | null;
};

export type EnrollmentWithStudent = EnrollmentRow & {
  student: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
};

export type EnrollmentWithStudentAndCourse = EnrollmentWithStudent & {
  course: {
    id: string;
    title: string;
  } | null;
};

export const enrollmentsRepository = {
  async findById(id: string): Promise<EnrollmentRow | null> {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`enrollments.findById failed: ${error.message}`);
    return (data as EnrollmentRow | null) ?? null;
  },

  async findByStudentAndCourse(
    studentId: string,
    courseId: string
  ): Promise<EnrollmentRow | null> {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .maybeSingle();
    if (error)
      throw new Error(`enrollments.findByStudentAndCourse failed: ${error.message}`);
    return (data as EnrollmentRow | null) ?? null;
  },

  async findByStudent(studentId: string): Promise<EnrollmentWithCourse[]> {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*, course:courses(id, title, description, status)')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`enrollments.findByStudent failed: ${error.message}`);
    return (data as EnrollmentWithCourse[]) ?? [];
  },

  async findByCourse(
    courseId: string,
    statusFilter?: 'pending' | 'approved' | 'rejected'
  ): Promise<EnrollmentWithStudent[]> {
    let q = supabase
      .from('enrollments')
      .select('*, student:profiles!enrollments_student_id_fkey(id, email, full_name)')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });
    if (statusFilter) q = q.eq('status', statusFilter);

    const { data, error } = await q;
    if (error) throw new Error(`enrollments.findByCourse failed: ${error.message}`);
    return (data as EnrollmentWithStudent[]) ?? [];
  },

  // Cross-course admin listing. Used by the dashboard's "recent pending"
  // section. Supabase !inner forces the join to require a matching course
  // row so `course.title` is always present in the payload.
  async findAllForAdmin(
    statusFilter?: 'pending' | 'approved' | 'rejected',
    limit = 20
  ): Promise<EnrollmentWithStudentAndCourse[]> {
    let q = supabase
      .from('enrollments')
      .select(
        '*, student:profiles!enrollments_student_id_fkey(id, email, full_name), course:courses!inner(id, title)'
      )
      .order('created_at', { ascending: false })
      .limit(limit);
    if (statusFilter) q = q.eq('status', statusFilter);

    const { data, error } = await q;
    if (error) throw new Error(`enrollments.findAllForAdmin failed: ${error.message}`);
    return (data as EnrollmentWithStudentAndCourse[]) ?? [];
  },

  async create(row: { student_id: string; course_id: string }): Promise<EnrollmentRow> {
    const { data, error } = await supabase
      .from('enrollments')
      .insert({
        student_id: row.student_id,
        course_id: row.course_id,
        status: 'pending',
      })
      .select()
      .single();
    if (error) {
      // 23505 = unique_violation on (student_id, course_id)
      if (error.code === '23505') {
        throw new Error('ALREADY_REQUESTED');
      }
      throw new Error(`enrollments.create failed: ${error.message}`);
    }
    return data as EnrollmentRow;
  },

  async review(
    id: string,
    adminId: string,
    status: 'approved' | 'rejected'
  ): Promise<EnrollmentRow | null> {
    const { data, error } = await supabase
      .from('enrollments')
      .update({
        status,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(`enrollments.review failed: ${error.message}`);
    return (data as EnrollmentRow | null) ?? null;
  },
};
