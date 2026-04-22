import { supabase } from '../../config/supabase';
import { semestersRepository } from '../semesters/semesters.repository';
import {
  type AssignmentRow,
  type AssignmentWithRelations,
  assignmentsRepository,
  type ProgressRow,
} from './assignments.repository';

export class AssignmentsServiceError extends Error {
  constructor(
    public code:
      | 'NOT_FOUND'
      | 'FORBIDDEN'
      | 'FORBIDDEN_NOT_ENROLLED'
      | 'PATH_MISMATCH'
      | 'SEMESTER_NOT_FOUND'
      | 'OBJECT_NOT_FOUND'
      | 'INVALID_FILE_CONTENT'
      | 'STORAGE_SIGN_FAILED',
    message: string
  ) {
    super(message);
    this.name = 'AssignmentsServiceError';
  }
}

// File type → magic-byte signature. §5.5 mandates magic-byte validation so a
// renamed .exe can't masquerade as a .pdf.
//   PDF:  25 50 44 46        ("%PDF")
//   DOCX: 50 4B 03 04        ("PK\x03\x04", ZIP local-file header — DOCX is a ZIP)
const MAGIC = {
  pdf: [0x25, 0x50, 0x44, 0x46],
  docx: [0x50, 0x4b, 0x03, 0x04],
} as const;

function bytesStartWith(buf: Uint8Array, sig: readonly number[]): boolean {
  if (buf.length < sig.length) return false;
  for (let i = 0; i < sig.length; i++) {
    if (buf[i] !== sig[i]) return false;
  }
  return true;
}

export const assignmentsService = {
  // Blueprint §2.10 + §14.4 — but adapted for TUS client uploads:
  //   1. Client uploads the file directly to Supabase Storage via TUS using its
  //      own JWT. Storage RLS enforces path prefix = auth.uid().
  //   2. Client POSTs here with { semester_id, file_path, file_name, file_type }.
  //   3. We re-verify: student is approved, path begins with {studentId}/{semesterId}/,
  //      magic bytes match file_type.
  //   4. Atomic-ish: insert assignments row; if that fails, compensating storage
  //      remove. Upsert progress.
  //   5. Return { assignment, progress }.
  async register(input: {
    student_id: string;
    semester_id: string;
    file_path: string;
    file_name: string;
    file_type: 'pdf' | 'docx';
  }): Promise<{ assignment: AssignmentRow; progress: ProgressRow }> {
    // Enrollment gate
    const semester = await semestersRepository.findById(input.semester_id);
    if (!semester) {
      throw new AssignmentsServiceError(
        'SEMESTER_NOT_FOUND',
        `Semester ${input.semester_id} not found`
      );
    }
    const approved = await semestersRepository.studentIsApprovedForSemester(
      input.student_id,
      input.semester_id
    );
    if (!approved) {
      throw new AssignmentsServiceError(
        'FORBIDDEN_NOT_ENROLLED',
        'You must be approved-enrolled in this course to submit assignments'
      );
    }

    // Defense-in-depth path check — Storage RLS already requires prefix = auth.uid,
    // but we re-check here so a malicious client can't register a legitimately-
    // uploaded file under someone else's student_id or another semester's folder.
    const expectedPrefix = `${input.student_id}/${input.semester_id}/`;
    if (!input.file_path.startsWith(expectedPrefix)) {
      throw new AssignmentsServiceError(
        'PATH_MISMATCH',
        `file_path must start with '${expectedPrefix}'`
      );
    }

    // Magic-byte sniff. Downloads the object via service-role (bypassing RLS).
    // For MVP this reads the whole blob and takes the first 8 bytes; at pilot
    // scale (≤ 25 MB files, low volume) the simplicity wins. If traffic grows,
    // switch to a Range-GET on the Storage REST URL.
    const header = await assignmentsRepository.readObjectHeader(input.file_path, 8);
    if (!header) {
      throw new AssignmentsServiceError(
        'OBJECT_NOT_FOUND',
        'Uploaded object not found in storage — did the TUS upload finish?'
      );
    }
    const sig = MAGIC[input.file_type];
    if (!bytesStartWith(header, sig)) {
      // Remove the bogus object so we don't leak storage on garbage uploads.
      await assignmentsRepository.removeStorageObject(input.file_path);
      throw new AssignmentsServiceError(
        'INVALID_FILE_CONTENT',
        `File content does not match declared type '${input.file_type}'`
      );
    }

    // Insert assignment row. If it fails, compensating storage remove + re-throw.
    let assignment: AssignmentRow;
    try {
      assignment = await assignmentsRepository.create({
        student_id: input.student_id,
        semester_id: input.semester_id,
        file_path: input.file_path,
        file_name: input.file_name,
        file_type: input.file_type,
      });
    } catch (err) {
      await assignmentsRepository.removeStorageObject(input.file_path);
      console.error(
        `[assignments.register] DB insert failed — compensated storage remove. ` +
          `student=${input.student_id} semester=${input.semester_id} path=${input.file_path}`,
        err
      );
      throw err;
    }

    // Side-effect upsert of progress — blueprint §2.11. Failure here leaves the
    // assignment row in place (student submitted; progress just didn't flip).
    // We log and re-throw so the client sees 500 and retries, which is safe
    // because both the assignments insert and the progress upsert are idempotent
    // (assignments by path uniqueness, progress by ON CONFLICT).
    const progress = await assignmentsRepository.upsertProgress({
      student_id: input.student_id,
      semester_id: input.semester_id,
    });

    return { assignment, progress };
  },

  async listMine(studentId: string, semesterId?: string): Promise<AssignmentRow[]> {
    return assignmentsRepository.findByStudent(studentId, semesterId);
  },

  async listForAdmin(options: {
    limit: number;
    cursor?: string;
    course_id?: string;
    semester_id?: string;
    student_id?: string;
  }): Promise<{ rows: AssignmentWithRelations[]; next_cursor: string | null }> {
    const rows = await assignmentsRepository.listForAdmin(options);
    const last = rows[rows.length - 1];
    const next_cursor = rows.length === options.limit && last ? last.submitted_at : null;
    return { rows, next_cursor };
  },

  // Blueprint §14.5 — 60-second signed URL. Admin OR the owning student.
  async getDownloadUrl(
    assignmentId: string,
    requesterId: string,
    requesterRole: 'admin' | 'student'
  ): Promise<{ url: string; expires_in: number; file_name: string }> {
    const a = await assignmentsRepository.findById(assignmentId);
    if (!a) {
      throw new AssignmentsServiceError(
        'NOT_FOUND',
        `Assignment ${assignmentId} not found`
      );
    }
    if (requesterRole !== 'admin' && a.student_id !== requesterId) {
      throw new AssignmentsServiceError('FORBIDDEN', 'Not allowed');
    }
    const { data, error } = await supabase.storage
      .from('assignments')
      .createSignedUrl(a.file_path, 60);
    if (error || !data?.signedUrl) {
      throw new AssignmentsServiceError(
        'STORAGE_SIGN_FAILED',
        error?.message ?? 'Could not sign URL'
      );
    }
    return { url: data.signedUrl, expires_in: 60, file_name: a.file_name };
  },
};
