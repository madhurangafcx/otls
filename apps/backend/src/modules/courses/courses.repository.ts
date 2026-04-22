import { supabase } from '../../config/supabase';

// Repository — the ONLY place that touches the Supabase client for courses.
// Services import this module; they never import supabase directly. Per
// blueprint §6.4 repository pattern + testability.

export type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Aggregated via nested-count selects on the read paths (findById, list).
  // - semester_count: total semesters for the course
  // - enrollment_count: total enrollments (any status). Rejected rows are rare
  //   in pilot so this approximates "students on the course" for admin UI.
  // Mutations return rows without these fields.
  semester_count?: number;
  enrollment_count?: number;
};

// Supabase's nested-count select returns `semesters: [{ count: N }]`. Flatten
// to scalars so repository consumers never see the array shape.
type CourseRowWithCounts = Omit<CourseRow, 'semester_count' | 'enrollment_count'> & {
  semesters?: { count: number }[] | null;
  enrollments?: { count: number }[] | null;
};

function flattenCounts(row: CourseRowWithCounts): CourseRow {
  const { semesters, enrollments, ...rest } = row;
  return {
    ...rest,
    semester_count: semesters?.[0]?.count ?? 0,
    enrollment_count: enrollments?.[0]?.count ?? 0,
  };
}

type ListOptions = {
  limit: number;
  cursor?: string;
  statusFilter?: 'draft' | 'published';
  // If true, return all statuses. If false, caller must set statusFilter.
  // Used for the admin-sees-all vs student-sees-published distinction at
  // the service layer.
  adminView: boolean;
};

export const coursesRepository = {
  async findById(id: string): Promise<CourseRow | null> {
    const { data, error } = await supabase
      .from('courses')
      .select('*, semesters(count), enrollments(count)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`courses.findById failed: ${error.message}`);
    return data ? flattenCounts(data as CourseRowWithCounts) : null;
  },

  async list(options: ListOptions): Promise<CourseRow[]> {
    let q = supabase
      .from('courses')
      .select('*, semesters(count), enrollments(count)')
      .order('created_at', { ascending: false })
      .limit(options.limit);

    if (options.cursor) q = q.lt('created_at', options.cursor);
    if (!options.adminView || options.statusFilter) {
      // Students see only published unless admin explicitly asks for all.
      const effectiveStatus = options.statusFilter ?? 'published';
      q = q.eq('status', effectiveStatus);
    }

    const { data, error } = await q;
    if (error) throw new Error(`courses.list failed: ${error.message}`);
    return (data ?? []).map((r) => flattenCounts(r as CourseRowWithCounts));
  },

  async create(row: {
    title: string;
    description?: string;
    created_by: string;
  }): Promise<CourseRow> {
    const { data, error } = await supabase
      .from('courses')
      .insert({
        title: row.title,
        description: row.description ?? null,
        created_by: row.created_by,
        status: 'draft',
      })
      .select()
      .single();
    if (error) throw new Error(`courses.create failed: ${error.message}`);
    return data as CourseRow;
  },

  async update(
    id: string,
    patch: { title?: string; description?: string }
  ): Promise<CourseRow | null> {
    const { data, error } = await supabase
      .from('courses')
      .update(patch)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(`courses.update failed: ${error.message}`);
    return (data as CourseRow | null) ?? null;
  },

  async setStatus(id: string, status: 'draft' | 'published'): Promise<CourseRow | null> {
    const { data, error } = await supabase
      .from('courses')
      .update({ status })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(`courses.setStatus failed: ${error.message}`);
    return (data as CourseRow | null) ?? null;
  },

  async delete(id: string): Promise<boolean> {
    const { error, count } = await supabase
      .from('courses')
      .delete({ count: 'exact' })
      .eq('id', id);
    if (error) throw new Error(`courses.delete failed: ${error.message}`);
    return (count ?? 0) > 0;
  },

  // Used by publish() validation: can't publish if zero semesters.
  async countSemesters(courseId: string): Promise<number> {
    const { count, error } = await supabase
      .from('semesters')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId);
    if (error) throw new Error(`courses.countSemesters failed: ${error.message}`);
    return count ?? 0;
  },

  // Used by publish() validation: all semesters must have valid youtube_url.
  // Returns number of semesters WITHOUT a youtube_url (0 means all good).
  async countSemestersMissingYoutube(courseId: string): Promise<number> {
    const { count, error } = await supabase
      .from('semesters')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .or('youtube_url.is.null,youtube_url.eq.');
    if (error) {
      throw new Error(`courses.countSemestersMissingYoutube failed: ${error.message}`);
    }
    return count ?? 0;
  },
};
