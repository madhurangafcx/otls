import { supabase } from '../../config/supabase';

export type SemesterRow = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  youtube_url: string | null;
  sort_order: number;
  created_at: string;
};

export const semestersRepository = {
  async findById(id: string): Promise<SemesterRow | null> {
    const { data, error } = await supabase
      .from('semesters')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`semesters.findById failed: ${error.message}`);
    return (data as SemesterRow | null) ?? null;
  },

  async findByCourseId(courseId: string): Promise<SemesterRow[]> {
    const { data, error } = await supabase
      .from('semesters')
      .select('*')
      .eq('course_id', courseId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw new Error(`semesters.findByCourseId failed: ${error.message}`);
    return (data as SemesterRow[]) ?? [];
  },

  // Returns the current max sort_order for a course, used to auto-compute
  // sort_order for new semesters (blueprint §2.4 step 4: max(sort_order) + 1).
  async maxSortOrder(courseId: string): Promise<number> {
    const { data, error } = await supabase
      .from('semesters')
      .select('sort_order')
      .eq('course_id', courseId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`semesters.maxSortOrder failed: ${error.message}`);
    return data?.sort_order ?? -1;
  },

  async create(row: {
    course_id: string;
    title: string;
    description?: string;
    youtube_url?: string;
    sort_order: number;
  }): Promise<SemesterRow> {
    const { data, error } = await supabase
      .from('semesters')
      .insert({
        course_id: row.course_id,
        title: row.title,
        description: row.description ?? null,
        youtube_url: row.youtube_url ?? null,
        sort_order: row.sort_order,
      })
      .select()
      .single();
    if (error) throw new Error(`semesters.create failed: ${error.message}`);
    return data as SemesterRow;
  },

  async update(
    id: string,
    patch: {
      title?: string;
      description?: string;
      youtube_url?: string;
      sort_order?: number;
    }
  ): Promise<SemesterRow | null> {
    const { data, error } = await supabase
      .from('semesters')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(`semesters.update failed: ${error.message}`);
    return (data as SemesterRow | null) ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const { error, count } = await supabase
      .from('semesters')
      .delete({ count: 'exact' })
      .eq('id', id);
    if (error) throw new Error(`semesters.delete failed: ${error.message}`);
    return (count ?? 0) > 0;
  },

  // Enrollment-gate check used by the semester GET endpoint and by assignment
  // uploads later. Returns true if the given student has an APPROVED enrollment
  // in the course that owns this semester.
  async studentIsApprovedForSemester(
    studentId: string,
    semesterId: string
  ): Promise<boolean> {
    // Two-step: enrollments and semesters don't share a direct foreign key
    // (both link through courses), so Supabase can't resolve a nested join
    // from enrollments to semesters. Fetch the semester's course_id first,
    // then check for an approved enrollment on that course.
    const { data: sem, error: semErr } = await supabase
      .from('semesters')
      .select('course_id')
      .eq('id', semesterId)
      .maybeSingle();
    if (semErr || !sem) return false;

    const { data: enr, error: enrErr } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', sem.course_id)
      .eq('status', 'approved')
      .limit(1)
      .maybeSingle();
    if (enrErr) return false;
    return !!enr;
  },

  // Telemetry — CEO-review "Pillar 1" success metric. Inserts a daily per-student
  // per-semester view row; unique constraint on (student_id, semester_id,
  // viewed_on) means repeat views the same day are idempotent (we swallow the
  // unique-violation error).
  async logView(studentId: string, semesterId: string): Promise<void> {
    const { error } = await supabase
      .from('semester_views')
      .insert({ student_id: studentId, semester_id: semesterId });
    if (error && error.code !== '23505') {
      // 23505 = unique_violation, expected on same-day repeat view.
      console.warn(`[semesters.logView] ${error.code} ${error.message}`);
    }
  },
};
