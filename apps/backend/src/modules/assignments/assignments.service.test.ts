// First service-layer test file for the repo. Mocks the two repository
// modules the service depends on (assignmentsRepository + semestersRepository)
// via bun:test's mock.module so no real Supabase calls fire.
//
// Covers the register() happy path + every explicit error branch:
//   - SEMESTER_NOT_FOUND
//   - FORBIDDEN_NOT_ENROLLED
//   - PATH_MISMATCH
//   - OBJECT_NOT_FOUND
//   - INVALID_FILE_CONTENT (and verifies the compensating storage remove)
//   - happy path: assignment row created + progress upserted + both returned

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

// ── Mock setup ──────────────────────────────────────────────────────────
// Fresh mocks per test via beforeEach so one test's stubs don't leak into
// another. Each repo method is a mock.fn we can set .mockResolvedValue on.

type AssignmentsRepoMock = {
  readObjectHeader: ReturnType<typeof mock>;
  removeStorageObject: ReturnType<typeof mock>;
  create: ReturnType<typeof mock>;
  upsertProgress: ReturnType<typeof mock>;
  findById: ReturnType<typeof mock>;
  findByStudent: ReturnType<typeof mock>;
  listForAdmin: ReturnType<typeof mock>;
};

type SemestersRepoMock = {
  findById: ReturnType<typeof mock>;
  studentIsApprovedForSemester: ReturnType<typeof mock>;
};

let assignmentsRepo: AssignmentsRepoMock;
let semestersRepo: SemestersRepoMock;

beforeEach(() => {
  assignmentsRepo = {
    readObjectHeader: mock(() => Promise.resolve(null)),
    removeStorageObject: mock(() => Promise.resolve()),
    create: mock(() => Promise.resolve({})),
    upsertProgress: mock(() => Promise.resolve({})),
    findById: mock(() => Promise.resolve(null)),
    findByStudent: mock(() => Promise.resolve([])),
    listForAdmin: mock(() => Promise.resolve([])),
  };
  semestersRepo = {
    findById: mock(() => Promise.resolve(null)),
    studentIsApprovedForSemester: mock(() => Promise.resolve(false)),
  };

  mock.module('./assignments.repository', () => ({
    assignmentsRepository: assignmentsRepo,
  }));
  mock.module('../semesters/semesters.repository', () => ({
    semestersRepository: semestersRepo,
  }));
});

afterEach(() => {
  mock.restore();
});

// Realistic byte signatures. PDF: "%PDF", DOCX: "PK\x03\x04"
const PDF_MAGIC = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
const DOCX_MAGIC = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00]);
const JUNK_MAGIC = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x00, 0x00, 0x00, 0x00]);

const STUDENT = '11111111-1111-1111-1111-111111111111';
const SEMESTER = '22222222-2222-2222-2222-222222222222';
const COURSE = '33333333-3333-3333-3333-333333333333';
const GOOD_PATH = `${STUDENT}/${SEMESTER}/1700000000000_my.pdf`;

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    student_id: STUDENT,
    semester_id: SEMESTER,
    file_path: GOOD_PATH,
    file_name: 'my.pdf',
    file_type: 'pdf' as const,
    ...overrides,
  };
}

function fakeSemester() {
  return {
    id: SEMESTER,
    course_id: COURSE,
    title: 'Hooks',
    description: null,
    youtube_url: null,
    sort_order: 0,
    created_at: new Date().toISOString(),
  };
}

// Import AFTER the mocks are registered the first time. Bun hoists mock.module
// registrations on file load; beforeEach re-registers for per-test isolation.
const { assignmentsService, AssignmentsServiceError } = await import(
  './assignments.service'
);

// ── Tests ────────────────────────────────────────────────────────────────

describe('assignmentsService.register', () => {
  test('throws SEMESTER_NOT_FOUND when the semester does not exist', async () => {
    semestersRepo.findById.mockResolvedValue(null);

    await expect(assignmentsService.register(validInput())).rejects.toMatchObject({
      name: 'AssignmentsServiceError',
      code: 'SEMESTER_NOT_FOUND',
    });
    // Nothing should hit storage or the DB when the semester is missing.
    expect(assignmentsRepo.readObjectHeader).not.toHaveBeenCalled();
    expect(assignmentsRepo.create).not.toHaveBeenCalled();
  });

  test('throws FORBIDDEN_NOT_ENROLLED when student has no approved enrollment', async () => {
    semestersRepo.findById.mockResolvedValue(fakeSemester());
    semestersRepo.studentIsApprovedForSemester.mockResolvedValue(false);

    await expect(assignmentsService.register(validInput())).rejects.toMatchObject({
      code: 'FORBIDDEN_NOT_ENROLLED',
    });
    expect(assignmentsRepo.readObjectHeader).not.toHaveBeenCalled();
  });

  test('throws PATH_MISMATCH when file_path prefix does not match student/semester', async () => {
    semestersRepo.findById.mockResolvedValue(fakeSemester());
    semestersRepo.studentIsApprovedForSemester.mockResolvedValue(true);

    await expect(
      assignmentsService.register(validInput({ file_path: 'someone-else/1700_my.pdf' }))
    ).rejects.toMatchObject({ code: 'PATH_MISMATCH' });
    expect(assignmentsRepo.readObjectHeader).not.toHaveBeenCalled();
  });

  test('throws OBJECT_NOT_FOUND when storage has no object at the path', async () => {
    semestersRepo.findById.mockResolvedValue(fakeSemester());
    semestersRepo.studentIsApprovedForSemester.mockResolvedValue(true);
    assignmentsRepo.readObjectHeader.mockResolvedValue(null); // TUS didn't finish

    await expect(assignmentsService.register(validInput())).rejects.toMatchObject({
      code: 'OBJECT_NOT_FOUND',
    });
    expect(assignmentsRepo.create).not.toHaveBeenCalled();
  });

  test('throws INVALID_FILE_CONTENT + removes bogus object when magic bytes mismatch', async () => {
    semestersRepo.findById.mockResolvedValue(fakeSemester());
    semestersRepo.studentIsApprovedForSemester.mockResolvedValue(true);
    // Client declared PDF but bytes are random junk.
    assignmentsRepo.readObjectHeader.mockResolvedValue(JUNK_MAGIC);

    await expect(
      assignmentsService.register(validInput({ file_type: 'pdf' }))
    ).rejects.toMatchObject({ code: 'INVALID_FILE_CONTENT' });
    // Compensating storage remove MUST fire so we don't leak garbage objects.
    expect(assignmentsRepo.removeStorageObject).toHaveBeenCalledWith(GOOD_PATH);
    expect(assignmentsRepo.create).not.toHaveBeenCalled();
  });

  test('happy path: pdf registers, progress upserts, both returned', async () => {
    semestersRepo.findById.mockResolvedValue(fakeSemester());
    semestersRepo.studentIsApprovedForSemester.mockResolvedValue(true);
    assignmentsRepo.readObjectHeader.mockResolvedValue(PDF_MAGIC);
    const insertedAssignment = {
      id: 'a1',
      student_id: STUDENT,
      semester_id: SEMESTER,
      file_path: GOOD_PATH,
      file_name: 'my.pdf',
      file_type: 'pdf' as const,
      submitted_at: new Date().toISOString(),
    };
    const insertedProgress = {
      id: 'p1',
      student_id: STUDENT,
      semester_id: SEMESTER,
      completed: true,
      completed_at: new Date().toISOString(),
    };
    assignmentsRepo.create.mockResolvedValue(insertedAssignment);
    assignmentsRepo.upsertProgress.mockResolvedValue(insertedProgress);

    const result = await assignmentsService.register(validInput());

    expect(result).toEqual({
      assignment: insertedAssignment,
      progress: insertedProgress,
    });
    expect(assignmentsRepo.create).toHaveBeenCalledTimes(1);
    expect(assignmentsRepo.upsertProgress).toHaveBeenCalledWith({
      student_id: STUDENT,
      semester_id: SEMESTER,
    });
    // Successful path should NOT call the compensating remove.
    expect(assignmentsRepo.removeStorageObject).not.toHaveBeenCalled();
  });

  test('happy path: docx also accepted (magic bytes = PK\\x03\\x04)', async () => {
    semestersRepo.findById.mockResolvedValue(fakeSemester());
    semestersRepo.studentIsApprovedForSemester.mockResolvedValue(true);
    assignmentsRepo.readObjectHeader.mockResolvedValue(DOCX_MAGIC);
    assignmentsRepo.create.mockResolvedValue({
      id: 'a2',
      student_id: STUDENT,
      semester_id: SEMESTER,
      file_path: GOOD_PATH,
      file_name: 'essay.docx',
      file_type: 'docx' as const,
      submitted_at: new Date().toISOString(),
    });
    assignmentsRepo.upsertProgress.mockResolvedValue({
      id: 'p2',
      student_id: STUDENT,
      semester_id: SEMESTER,
      completed: true,
      completed_at: new Date().toISOString(),
    });

    await expect(
      assignmentsService.register(
        validInput({ file_type: 'docx', file_name: 'essay.docx' })
      )
    ).resolves.toBeDefined();
    expect(assignmentsRepo.create).toHaveBeenCalledTimes(1);
  });

  test('DB insert failure triggers compensating storage remove + re-throws', async () => {
    semestersRepo.findById.mockResolvedValue(fakeSemester());
    semestersRepo.studentIsApprovedForSemester.mockResolvedValue(true);
    assignmentsRepo.readObjectHeader.mockResolvedValue(PDF_MAGIC);
    assignmentsRepo.create.mockRejectedValue(new Error('unique violation'));

    await expect(assignmentsService.register(validInput())).rejects.toThrow(
      'unique violation'
    );
    expect(assignmentsRepo.removeStorageObject).toHaveBeenCalledWith(GOOD_PATH);
    // Progress upsert never runs if the assignment insert failed.
    expect(assignmentsRepo.upsertProgress).not.toHaveBeenCalled();
  });
});

// Satisfy TypeScript about the imported error class (not used as a value but
// needs to exist for the package to compile).
test('AssignmentsServiceError is exported', () => {
  expect(AssignmentsServiceError).toBeDefined();
});
