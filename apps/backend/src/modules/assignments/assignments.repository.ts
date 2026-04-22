import { supabase } from '../../config/supabase';

export type AssignmentRow = {
  id: string;
  student_id: string;
  semester_id: string;
  file_path: string;
  file_name: string;
  file_type: 'pdf' | 'docx';
  submitted_at: string;
};

export type AssignmentWithRelations = AssignmentRow & {
  student: { id: string; email: string; full_name: string | null } | null;
  semester: {
    id: string;
    title: string;
    course_id: string;
    course: { id: string; title: string } | null;
  } | null;
};

export type ProgressRow = {
  id: string;
  student_id: string;
  semester_id: string;
  completed: boolean;
  completed_at: string | null;
};

type ListOptions = {
  limit: number;
  cursor?: string;
  course_id?: string;
  semester_id?: string;
  student_id?: string;
};

export const assignmentsRepository = {
  async findById(id: string): Promise<AssignmentRow | null> {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(`assignments.findById failed: ${error.message}`);
    return (data as AssignmentRow | null) ?? null;
  },

  async findByIdWithRelations(id: string): Promise<AssignmentWithRelations | null> {
    const { data, error } = await supabase
      .from('assignments')
      .select(
        '*, student:profiles!assignments_student_id_fkey(id, email, full_name), semester:semesters(id, title, course_id, course:courses(id, title))'
      )
      .eq('id', id)
      .maybeSingle();
    if (error)
      throw new Error(`assignments.findByIdWithRelations failed: ${error.message}`);
    return (data as AssignmentWithRelations | null) ?? null;
  },

  // Student's own submissions. Optional semester_id filter.
  async findByStudent(studentId: string, semesterId?: string): Promise<AssignmentRow[]> {
    let q = supabase
      .from('assignments')
      .select('*')
      .eq('student_id', studentId)
      .order('submitted_at', { ascending: false });
    if (semesterId) q = q.eq('semester_id', semesterId);
    const { data, error } = await q;
    if (error) throw new Error(`assignments.findByStudent failed: ${error.message}`);
    return (data as AssignmentRow[]) ?? [];
  },

  // Admin list with cursor pagination on submitted_at. Optional filters:
  //   course_id  — joins via semester
  //   semester_id — direct filter
  //   student_id — direct filter
  async listForAdmin(options: ListOptions): Promise<AssignmentWithRelations[]> {
    let q = supabase
      .from('assignments')
      .select(
        '*, student:profiles!assignments_student_id_fkey(id, email, full_name), semester:semesters!inner(id, title, course_id, course:courses(id, title))'
      )
      .order('submitted_at', { ascending: false })
      .limit(options.limit);

    if (options.cursor) q = q.lt('submitted_at', options.cursor);
    if (options.semester_id) q = q.eq('semester_id', options.semester_id);
    if (options.student_id) q = q.eq('student_id', options.student_id);
    if (options.course_id) q = q.eq('semester.course_id', options.course_id);

    const { data, error } = await q;
    if (error) throw new Error(`assignments.listForAdmin failed: ${error.message}`);
    return (data as AssignmentWithRelations[]) ?? [];
  },

  async create(row: {
    student_id: string;
    semester_id: string;
    file_path: string;
    file_name: string;
    file_type: 'pdf' | 'docx';
  }): Promise<AssignmentRow> {
    const { data, error } = await supabase
      .from('assignments')
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(`assignments.create failed: ${error.message}`);
    return data as AssignmentRow;
  },

  // Blueprint §2.10 step 3: auto-upsert student_progress in the same request.
  // ON CONFLICT (student_id, semester_id) means resubmission is idempotent —
  // same row updated, no duplicate progress entries.
  async upsertProgress(row: {
    student_id: string;
    semester_id: string;
  }): Promise<ProgressRow> {
    const { data, error } = await supabase
      .from('student_progress')
      .upsert(
        {
          student_id: row.student_id,
          semester_id: row.semester_id,
          completed: true,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,semester_id' }
      )
      .select()
      .single();
    if (error) throw new Error(`progress.upsert failed: ${error.message}`);
    return data as ProgressRow;
  },

  // Compensating transaction — called when the assignments insert fails after
  // the Storage upload succeeded. Best-effort: swallow errors and log, because
  // the dead-letter log is the authoritative record for manual replay.
  async removeStorageObject(path: string): Promise<void> {
    const { error } = await supabase.storage.from('assignments').remove([path]);
    if (error) {
      console.error(
        `[assignments.compensating-remove] path=${path} error=${error.message}`
      );
    }
  },

  // Magic-byte sniff: download the first 8 bytes of the storage object via the
  // service-role client and return them. Blueprint §5.5 security: validate
  // magic bytes, not just extension/MIME.
  async readObjectHeader(path: string, bytes = 8): Promise<Uint8Array | null> {
    const { data, error } = await supabase.storage.from('assignments').download(path, {
      // Supabase Storage uses HTTP Range under the hood if transform is absent;
      // for MVP the object is small (≤25 MB), so a full download is fine too,
      // but we only read the first N bytes from the Blob.
    });
    if (error || !data) {
      console.warn(
        `[assignments.readObjectHeader] path=${path} ${error?.message ?? 'no data'}`
      );
      return null;
    }
    const full = new Uint8Array(await data.arrayBuffer());
    return full.subarray(0, bytes);
  },
};
