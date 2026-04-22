// Typed fetch client for the Bun backend.
// Uses absolute URLs (NEXT_PUBLIC_API_URL) rather than relative /api/* so it
// works from both the server (RSC fetch) and the client. In dev, both host
// localhost origins; in prod the backend runs at a different host.

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

type ApiErrorBody = { error: { code: string; message: string; request_id?: string } };

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public requestId?: string
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
  accessToken?: string
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  if (!res.ok) {
    let body: ApiErrorBody;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      body = { error: { code: 'UNKNOWN', message: res.statusText } };
    }
    throw new ApiClientError(
      res.status,
      body.error?.code ?? 'UNKNOWN',
      body.error?.message ?? res.statusText,
      body.error?.request_id
    );
  }

  return (await res.json()) as T;
}

export type SessionPayload = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
};

export type ProfilePayload = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'student';
  created_at: string;
};

export type CoursePayload = {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Populated on GET /api/courses and GET /api/courses/:id. Not returned by
  // mutation endpoints (create/update/publish) since callers there don't need them.
  semester_count?: number;
  // Total enrollments (any status). Approximates "students on the course" for
  // admin UI; rejected rows are rare at pilot scale.
  enrollment_count?: number;
};

export type SemesterPayload = {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  youtube_url: string | null;
  sort_order: number;
  created_at: string;
};

export type EnrollmentStatus = 'pending' | 'approved' | 'rejected';

export type EnrollmentPayload = {
  id: string;
  student_id: string;
  course_id: string;
  status: EnrollmentStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  last_announcement_read_at: string | null;
  created_at: string;
};

export type EnrollmentWithCourse = EnrollmentPayload & {
  course: {
    id: string;
    title: string;
    description: string | null;
    status: 'draft' | 'published';
  } | null;
};

export type EnrollmentWithStudent = EnrollmentPayload & {
  student: { id: string; email: string; full_name: string | null } | null;
};

export type EnrollmentWithStudentAndCourse = EnrollmentWithStudent & {
  course: { id: string; title: string } | null;
};

export type AdminStats = {
  students: number;
  courses_total: number;
  courses_draft: number;
  pending_enrollments: number;
  submissions_today: number;
};

export type Paginated<T> = {
  data: T[];
  pagination: { next_cursor: string | null };
};

export type AssignmentPayload = {
  id: string;
  student_id: string;
  semester_id: string;
  file_path: string;
  file_name: string;
  file_type: 'pdf' | 'docx';
  submitted_at: string;
};

export type AssignmentWithRelations = AssignmentPayload & {
  student: { id: string; email: string; full_name: string | null } | null;
  semester: {
    id: string;
    title: string;
    course_id: string;
    course: { id: string; title: string } | null;
  } | null;
};

export type ProgressPayload = {
  id: string;
  student_id: string;
  semester_id: string;
  completed: boolean;
  completed_at: string | null;
};

export type ProgressSummary = {
  course_id: string;
  total: number;
  completed: number;
  percentage: number;
};

export type SignedDownload = {
  url: string;
  expires_in: number;
  file_name: string;
};

export type AnnouncementPayload = {
  id: string;
  course_id: string;
  author_id: string | null;
  title: string;
  body: string;
  pinned: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AnnouncementOverviewRow = {
  course_id: string;
  course_title: string;
  unread_count: number;
  recent: AnnouncementPayload[];
};

export const api = {
  auth: {
    register: (body: { email: string; password: string; full_name?: string }) =>
      request<{
        data: {
          user: { id: string; email: string };
          session: SessionPayload | null;
        };
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    login: (body: { email: string; password: string }) =>
      request<{
        data: {
          user: { id: string; email: string };
          session: SessionPayload;
        };
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    me: (accessToken: string) =>
      request<{ data: ProfilePayload }>('/api/auth/me', undefined, accessToken),

    logout: (accessToken: string) =>
      request<{ data: { ok: boolean } }>(
        '/api/auth/logout',
        { method: 'POST' },
        accessToken
      ),
  },

  courses: {
    list: (opts?: { status?: 'draft' | 'published'; cursor?: string; limit?: number }, accessToken?: string) => {
      const qs = new URLSearchParams();
      if (opts?.status) qs.set('status', opts.status);
      if (opts?.cursor) qs.set('cursor', opts.cursor);
      if (opts?.limit) qs.set('limit', String(opts.limit));
      const path = `/api/courses${qs.toString() ? `?${qs.toString()}` : ''}`;
      return request<Paginated<CoursePayload>>(path, undefined, accessToken);
    },

    get: (id: string, accessToken?: string) =>
      request<{ data: CoursePayload }>(`/api/courses/${id}`, undefined, accessToken),

    create: (body: { title: string; description?: string }, accessToken: string) =>
      request<{ data: CoursePayload }>('/api/courses', {
        method: 'POST',
        body: JSON.stringify(body),
      }, accessToken),

    update: (id: string, body: { title?: string; description?: string }, accessToken: string) =>
      request<{ data: CoursePayload }>(`/api/courses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }, accessToken),

    setStatus: (id: string, status: 'draft' | 'published', accessToken: string) =>
      request<{ data: CoursePayload }>(`/api/courses/${id}/publish`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }, accessToken),

    delete: (id: string, accessToken: string) =>
      request<null>(`/api/courses/${id}`, { method: 'DELETE' }, accessToken),

    listSemesters: (courseId: string, accessToken: string) =>
      request<{ data: SemesterPayload[] }>(
        `/api/courses/${courseId}/semesters`,
        undefined,
        accessToken
      ),
  },

  enrollments: {
    request: (courseId: string, accessToken: string) =>
      request<{ data: EnrollmentPayload }>(
        '/api/enrollments',
        { method: 'POST', body: JSON.stringify({ course_id: courseId }) },
        accessToken
      ),

    mine: (accessToken: string) =>
      request<{ data: EnrollmentWithCourse[] }>(
        '/api/enrollments/me',
        undefined,
        accessToken
      ),

    listForCourse: (
      courseId: string,
      statusFilter: EnrollmentStatus | undefined,
      accessToken: string
    ) => {
      const qs = new URLSearchParams({ course_id: courseId });
      if (statusFilter) qs.set('status', statusFilter);
      return request<{ data: EnrollmentWithStudent[] }>(
        `/api/enrollments?${qs.toString()}`,
        undefined,
        accessToken
      );
    },

    review: (
      enrollmentId: string,
      decision: 'approved' | 'rejected',
      accessToken: string
    ) =>
      request<{ data: EnrollmentPayload }>(
        `/api/enrollments/${enrollmentId}`,
        { method: 'PATCH', body: JSON.stringify({ status: decision }) },
        accessToken
      ),

    // Cross-course admin listing (dashboard "recent pending" etc.). Omit
    // course_id to get enrollments across the whole site, with course info
    // populated. Used by /admin dashboard's recent-requests section.
    listForAdmin: (
      opts: {
        status?: EnrollmentStatus;
        limit?: number;
      } | undefined,
      accessToken: string
    ) => {
      const qs = new URLSearchParams();
      if (opts?.status) qs.set('status', opts.status);
      if (opts?.limit) qs.set('limit', String(opts.limit));
      const path = `/api/enrollments${qs.toString() ? `?${qs.toString()}` : ''}`;
      return request<{ data: EnrollmentWithStudentAndCourse[] }>(
        path,
        undefined,
        accessToken
      );
    },
  },

  assignments: {
    // Called after the TUS upload completes. Backend verifies enrollment,
    // sniffs magic bytes, inserts the row + upserts progress.
    register: (
      body: {
        semester_id: string;
        file_path: string;
        file_name: string;
        file_type: 'pdf' | 'docx';
      },
      accessToken: string
    ) =>
      request<{
        data: { assignment: AssignmentPayload; progress: ProgressPayload };
      }>(
        '/api/assignments',
        { method: 'POST', body: JSON.stringify(body) },
        accessToken
      ),

    mine: (opts: { semester_id?: string } | undefined, accessToken: string) => {
      const qs = new URLSearchParams();
      if (opts?.semester_id) qs.set('semester_id', opts.semester_id);
      const path = `/api/assignments/me${qs.toString() ? `?${qs.toString()}` : ''}`;
      return request<{ data: AssignmentPayload[] }>(path, undefined, accessToken);
    },

    listForAdmin: (
      opts: {
        course_id?: string;
        semester_id?: string;
        student_id?: string;
        cursor?: string;
        limit?: number;
      } | undefined,
      accessToken: string
    ) => {
      const qs = new URLSearchParams();
      if (opts?.course_id) qs.set('course_id', opts.course_id);
      if (opts?.semester_id) qs.set('semester_id', opts.semester_id);
      if (opts?.student_id) qs.set('student_id', opts.student_id);
      if (opts?.cursor) qs.set('cursor', opts.cursor);
      if (opts?.limit) qs.set('limit', String(opts.limit));
      const path = `/api/assignments${qs.toString() ? `?${qs.toString()}` : ''}`;
      return request<Paginated<AssignmentWithRelations>>(path, undefined, accessToken);
    },

    download: (id: string, accessToken: string) =>
      request<{ data: SignedDownload }>(
        `/api/assignments/${id}/download`,
        undefined,
        accessToken
      ),
  },

  announcements: {
    create: (
      body: { course_id: string; title: string; body: string; pinned?: boolean },
      accessToken: string
    ) =>
      request<{ data: AnnouncementPayload }>(
        '/api/announcements',
        { method: 'POST', body: JSON.stringify(body) },
        accessToken
      ),

    listByCourse: (
      courseId: string,
      opts: { limit?: number; cursor?: string } | undefined,
      accessToken: string
    ) => {
      const qs = new URLSearchParams();
      if (opts?.limit) qs.set('limit', String(opts.limit));
      if (opts?.cursor) qs.set('cursor', opts.cursor);
      const tail = qs.toString() ? `?${qs.toString()}` : '';
      return request<Paginated<AnnouncementPayload>>(
        `/api/courses/${courseId}/announcements${tail}`,
        undefined,
        accessToken
      );
    },

    get: (id: string, accessToken: string) =>
      request<{ data: AnnouncementPayload }>(
        `/api/announcements/${id}`,
        undefined,
        accessToken
      ),

    update: (
      id: string,
      patch: { title?: string; body?: string; pinned?: boolean },
      accessToken: string
    ) =>
      request<{ data: AnnouncementPayload }>(
        `/api/announcements/${id}`,
        { method: 'PATCH', body: JSON.stringify(patch) },
        accessToken
      ),

    delete: (id: string, accessToken: string) =>
      request<null>(
        `/api/announcements/${id}`,
        { method: 'DELETE' },
        accessToken
      ),

    overview: (accessToken: string) =>
      request<{ data: AnnouncementOverviewRow[] }>(
        '/api/announcements/overview',
        undefined,
        accessToken
      ),
  },

  progress: {
    forCourse: (courseId: string, accessToken: string) =>
      request<{ data: ProgressSummary }>(
        `/api/progress?course_id=${encodeURIComponent(courseId)}`,
        undefined,
        accessToken
      ),

    overview: (accessToken: string) =>
      request<{ data: ProgressSummary[] }>(
        '/api/progress/overview',
        undefined,
        accessToken
      ),
  },

  semesters: {
    get: (id: string, accessToken: string) =>
      request<{ data: SemesterPayload }>(`/api/semesters/${id}`, undefined, accessToken),

    create: (body: {
      course_id: string;
      title: string;
      description?: string;
      youtube_url?: string;
      sort_order?: number;
    }, accessToken: string) =>
      request<{ data: SemesterPayload }>('/api/semesters', {
        method: 'POST',
        body: JSON.stringify(body),
      }, accessToken),

    update: (id: string, body: {
      title?: string;
      description?: string;
      youtube_url?: string;
      sort_order?: number;
    }, accessToken: string) =>
      request<{ data: SemesterPayload }>(`/api/semesters/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }, accessToken),

    delete: (id: string, accessToken: string) =>
      request<null>(`/api/semesters/${id}`, { method: 'DELETE' }, accessToken),
  },

  admin: {
    stats: (accessToken: string) =>
      request<{ data: AdminStats }>('/api/admin/stats', undefined, accessToken),
  },
};
