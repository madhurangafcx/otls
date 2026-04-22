# Online Teaching & Learning System — Comprehensive Implementation Blueprint

> **Runtime:** Bun (frontend + backend)
> **Frontend:** Next.js 14+ (App Router) · React 18+ · TypeScript · Tailwind CSS · shadcn/ui
> **Backend:** Bun + TypeScript + Hono (HTTP framework)
> **Data:** Supabase — PostgreSQL (RLS), Auth (Email + Google OAuth), Storage (private bucket)
> **Deployment Target:** Vercel (frontend) + Fly.io / Railway / Render (Bun backend) + Supabase Cloud
> **Tooling:** GSTACK (Claude Code plugin) for scaffolding & code generation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Feature Requirements — Step-by-Step Process](#2-feature-requirements--step-by-step-process)
3. [System Quality Attributes Requirements](#3-system-quality-attributes-requirements)
4. [System Constraints](#4-system-constraints)
5. [Quality Attributes — Detailed Targets](#5-quality-attributes--detailed-targets)
6. [Software Architecture Patterns](#6-software-architecture-patterns)
7. [High-Level System Architecture](#7-high-level-system-architecture)
8. [Frontend Structure (Bun + Next.js)](#8-frontend-structure-bun--nextjs)
9. [Backend Structure (Bun + TypeScript + Hono)](#9-backend-structure-bun--typescript--hono)
10. [API Design](#10-api-design)
11. [Authentication & Authorization Flow](#11-authentication--authorization-flow)
12. [Database Schema](#12-database-schema)
13. [Data Storage & Global Storage](#13-data-storage--global-storage)
14. [Storage Design for Assignments](#14-storage-design-for-assignments)
15. [Enrollment & Approval Workflow](#15-enrollment--approval-workflow)
16. [Course Publishing & Access Control](#16-course-publishing--access-control)
17. [Architecture & Flow Diagrams](#17-architecture--flow-diagrams)
18. [Environment Variables](#18-environment-variables)
19. [Project Setup & Implementation Roadmap](#19-project-setup--implementation-roadmap)
20. [Recommended Libraries](#20-recommended-libraries)

---

## 1. Executive Summary

An online teaching/learning platform with two roles (**Admin**, **Student**) where admins build courses composed of semesters (modules with a title, description, and YouTube URL), control their publish state, and manually approve student enrollments. Students register, browse published courses, request enrollment, access content after approval, submit PDF/DOCX assignments, and have semester completion tracked automatically when they submit an assignment for a given semester.

**Architectural shift vs. the original blueprint:** instead of the Next.js monolith calling Supabase directly from Route Handlers, this blueprint uses a **decoupled architecture** — a **Bun + TypeScript + Hono** HTTP service owns all business logic and talks to Supabase server-side, while the **Bun + Next.js** frontend is a pure client/BFF consumer. This gives cleaner separation of concerns, independently scalable tiers, and a backend that can later serve mobile/other clients without reshuffling code. Supabase RLS remains the last line of defense even though the backend normally uses the service role.

---

## 2. Feature Requirements — Step-by-Step Process

This section walks through every feature as a concrete sequence of steps — API call, DB write, side effects — so implementation can follow the list literally.

### 2.1 Student Registration (Email + Password)

1. User visits `/register`, fills email + password, submits.
2. Frontend calls `POST /api/auth/register` on Bun backend.
3. Backend validates input with Zod, calls `supabase.auth.admin.createUser()` (service role) with `email_confirm: false`.
4. Supabase trigger `on_auth_user_created` fires → inserts row into `profiles` with `role = 'student'`.
5. Backend returns `{ user, session }`; frontend stores session in an HTTP-only cookie.
6. User is redirected to `/courses` (student catalog).

### 2.2 Student Registration / Login (Google OAuth)

1. User clicks **Continue with Google** on `/login` or `/register`.
2. Frontend calls `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: '/auth/callback' })`.
3. Google consent screen → redirect to `/auth/callback?code=...`.
4. `callback/route.ts` exchanges code for session via `supabase.auth.exchangeCodeForSession(code)`.
5. On first login, trigger auto-creates a `profiles` row (`role = 'student'`).
6. Session cookie is set; user redirected based on role (`admin` → `/admin`, `student` → `/courses`).

### 2.3 Admin: Create Course

1. Admin opens `/admin/courses/new`, enters title + description.
2. Frontend `POST /api/courses` with JWT in `Authorization` header.
3. Backend middleware verifies JWT → loads profile → confirms `role === 'admin'`.
4. Backend inserts row into `courses` with `status = 'draft'`, `created_by = admin.id`.
5. Returns new course; frontend navigates to `/admin/courses/[courseId]` for semester setup.

### 2.4 Admin: Add Semester

1. From course edit page, admin clicks **Add Semester**, fills title, description, YouTube URL.
2. Frontend `POST /api/semesters` with `{ course_id, title, description, youtube_url, sort_order }`.
3. Backend validates YouTube URL (regex on `youtube.com/watch?v=` or `youtu.be/`).
4. Inserts into `semesters`; auto-computes `sort_order` as `max(sort_order) + 1` if not provided.
5. Returns semester; frontend appends to the semester list.

### 2.5 Admin: Publish / Unpublish Course

1. Admin clicks **Publish** on course detail page.
2. Frontend `PATCH /api/courses/:id/publish` with `{ status: 'published' }`.
3. Backend verifies admin + verifies course has at least one semester (business rule).
4. Updates `courses.status`; returns updated row.

### 2.6 Student: Browse Published Courses

1. Student lands on `/courses` (public or authenticated).
2. Frontend `GET /api/courses?status=published`.
3. Backend queries Supabase; returns list ordered by `created_at DESC`.
4. Each card links to `/courses/[courseId]`.

### 2.7 Student: Request Enrollment

1. On course detail, student clicks **Enroll**.
2. Frontend `POST /api/enrollments` with `{ course_id }`.
3. Backend:
   - Verifies course exists and `status = 'published'`.
   - Checks for existing enrollment row (any status) → if found, returns 409 `Already requested`.
   - Inserts `enrollments` row with `status = 'pending'`.
4. UI shows **Pending Approval** badge and locks semester content.

### 2.8 Admin: Review Enrollment Requests

1. Admin opens `/admin/courses/[courseId]/enrollments`.
2. Frontend `GET /api/enrollments?course_id=X&status=pending`.
3. Backend returns rows joined with `profiles` (student name, email).
4. Admin clicks **Approve** or **Reject**.
5. Frontend `PATCH /api/enrollments/:id` with `{ status: 'approved' | 'rejected' }`.
6. Backend updates row with `reviewed_by`, `reviewed_at = now()`.

### 2.9 Student: Access Approved Course

1. Student opens `/my-courses` → `GET /api/enrollments/me`.
2. Only rows where `status = 'approved'` surface semester content.
3. Clicking a course → `/courses/[courseId]/semesters/[semesterId]` → `GET /api/semesters/:id` returns title, description, YouTube URL.
4. Backend re-verifies enrollment on every request (defense in depth).

### 2.10 Student: Submit Assignment

1. On semester page, student chooses PDF or DOCX via `<input type="file">`.
2. Frontend `POST /api/assignments/upload` as `multipart/form-data` with `file` + `semester_id`.
3. Backend:
   - Validates MIME type (`application/pdf` or `application/vnd.openxmlformats-officedocument.wordprocessingml.document`).
   - Validates size (≤ 25 MB by default).
   - Confirms student is approved for the semester's course.
   - Uploads to Supabase Storage bucket `assignments` at `{student_id}/{semester_id}/{timestamp}_{filename}`.
   - Inserts `assignments` row.
   - **Upserts** `student_progress` row → `completed = true`, `completed_at = now()`.
4. Returns `{ assignment, progress }`.

### 2.11 Auto-Mark Semester Completion

Triggered as a side effect of 2.10. No separate endpoint required. The `student_progress` upsert uses `ON CONFLICT (student_id, semester_id)` so resubmissions don't create duplicates.

### 2.12 Student: View Course Progress

1. `/my-courses` calls `GET /api/progress?course_id=X`.
2. Backend counts total semesters in course vs. completed progress rows for the student.
3. Returns `{ total, completed, percentage }` — frontend renders progress bar.

### 2.13 Admin: View All Submitted Assignments

1. `/admin/assignments` → `GET /api/assignments` (admin only).
2. Backend returns paginated list joined with student + semester + course names.
3. Each row has a **Download** button → `GET /api/assignments/:id/download` returns a signed URL valid for 60 seconds.

---

## 3. System Quality Attributes Requirements

These are the non-functional requirements the system must satisfy.

| Attribute | Requirement |
|---|---|
| **Performance** | p95 API response ≤ 300 ms; page TTI ≤ 2.5 s on 4G; video load ≤ 1 s (delegated to YouTube). |
| **Scalability** | Handle 10,000 registered students, 500 concurrent active users, 1,000 assignment uploads/day without schema changes. |
| **Availability** | 99.9% monthly uptime (≈ 43 min downtime/month). |
| **Fault Tolerance** | Single Supabase/backend instance failure must not lose user data; retries for transient errors; graceful degradation when YouTube is down. |
| **Security** | OWASP Top 10 mitigations; RLS enforced at DB; JWT validated on every backend request; HTTPS only; assignment bucket is private with signed URLs. |
| **Maintainability** | Feature-based modular layout; ≥ 70% unit test coverage for business logic; strict TypeScript (`strict: true`, no `any`). |
| **Usability** | Keyboard accessible (WCAG 2.1 AA); responsive from 360 px up; clear enrollment status messaging. |
| **Observability** | Structured JSON logs, request IDs, error tracking (Sentry), DB query metrics. |
| **Portability** | Backend runs identically on Bun in any Linux container; no Bun-exclusive APIs that block a future Node.js fallback. |
| **Data Integrity** | FKs + unique constraints + CHECK constraints enforce invariants; transactions for multi-write operations. |

---

## 4. System Constraints

Constraints are the fixed boundaries implementation must respect.

### 4.1 Technical Constraints

- **Runtime:** Bun ≥ 1.1 on both frontend (Next.js dev/build) and backend (Hono server). No Node-only native modules.
- **Language:** TypeScript everywhere, `strict` mode on.
- **Database:** PostgreSQL 15+ via Supabase Cloud. No other database engine.
- **Auth Provider:** Supabase Auth only (Email/Password + Google OAuth). No custom auth server.
- **File Storage:** Supabase Storage only. Max object size 25 MB. Only `.pdf` and `.docx` accepted.
- **Video Hosting:** YouTube (embedded). No self-hosted video, no transcoding pipeline.
- **Framework:** Next.js App Router (not Pages Router); Hono on the backend.
- **No Long-Running Jobs:** No background workers in v1. Any heavy work must fit within a single request or be deferred to a follow-up release.

### 4.2 Business Constraints

- **Admin provisioning is manual** — no self-service admin signup; a superuser updates `profiles.role = 'admin'` in the Supabase console.
- **Enrollment is always moderated** — no auto-approval even for free courses.
- **Single course ⇒ single enrollment** — a student can't re-request once rejected without admin intervention (v1 scope).
- **No payments** in v1.
- **No real-time features** (chat, live classes) in v1.

### 4.3 Operational Constraints

- **Regions:** Initial deployment in a single region (e.g., `us-east-1` or `eu-west-1`); multi-region is v2.
- **Budget:** Must operate on Supabase Free/Pro tier and a small ($5–20/mo) backend host for MVP.
- **Compliance:** If serving EU users, honor GDPR (data export + delete on request). No PII in logs.
- **Browser Support:** Latest 2 versions of Chrome, Firefox, Safari, Edge. No IE.

### 4.4 Regulatory / Policy Constraints

- Passwords hashed by Supabase (bcrypt) — never stored plaintext.
- OAuth tokens never exposed to the browser JS; sessions live in HTTP-only `SameSite=Lax` cookies.
- Assignment files are private — signed URLs only, never public links.

---

## 5. Quality Attributes — Detailed Targets

### 5.1 Performance

**Targets**
- API p50 ≤ 120 ms, p95 ≤ 300 ms, p99 ≤ 800 ms.
- First Contentful Paint (FCP) ≤ 1.2 s.
- Time to Interactive (TTI) ≤ 2.5 s on 4G.
- DB queries: p95 ≤ 50 ms.

**Techniques**
- **Bun's fast cold start** — sub-100 ms process boot vs. Node's ~500 ms.
- **Hono's radix router** — O(1) route lookup, ~3× faster than Express.
- **React Server Components** — zero JS shipped for static parts of pages.
- **Connection pooling** — use Supabase's PgBouncer (transaction mode) for serverless; persistent pool for long-running Bun backend.
- **Indexes** on every FK column and on `courses.status`, `enrollments.status` (already in schema).
- **CDN caching** for `/api/courses?status=published` (short TTL 30–60 s, `stale-while-revalidate`).
- **Image optimization** via Next.js `<Image>` for course thumbnails.
- **HTTP/2** end-to-end; enable Brotli on the backend edge proxy.

### 5.2 Scalability

**Targets**
- Horizontal scale: backend stateless, can run 1 → N replicas behind a load balancer.
- DB: Supabase Pro supports hundreds of concurrent connections; use PgBouncer to multiplex.
- Storage: Supabase Storage is S3-backed → effectively unlimited.

**Techniques**
- **Stateless backend** — no in-memory sessions; JWT is the source of truth, verified per request.
- **Read/write separation-ready** — all reads go through repositories, easy to swap to a read replica later.
- **Pagination** mandatory on every list endpoint (`?limit=20&cursor=...`). Cursor-based, not offset-based.
- **Batch endpoints** where natural (e.g., bulk approve enrollments).
- **Avoid N+1** — use Supabase's embedded selects (`select('*, profiles(full_name)')`) or explicit joins.

### 5.3 Availability

**Target:** 99.9% monthly (≤ 43 minutes downtime/month).

**Techniques**
- **Multi-replica backend** behind a load balancer (Fly.io autoscaling, min 2 replicas).
- **Health checks** — `GET /health` returns 200 only when DB is reachable.
- **Graceful shutdown** — Hono `process.on('SIGTERM')` drains in-flight requests.
- **Supabase SLA** — Pro tier offers 99.9% uptime.
- **Read-only degraded mode** — if the primary DB is unavailable, the frontend surfaces a banner and disables mutations.

### 5.4 Fault Tolerance

**Techniques**
- **Retries with exponential backoff** for transient Supabase errors (5xx, network timeouts). Library: `p-retry` or hand-rolled.
- **Circuit breaker** for outbound calls (e.g., YouTube oEmbed lookup) — library: `opossum`-style in TS.
- **Idempotent writes** — enrollments use the `UNIQUE(student_id, course_id)` constraint; assignment resubmission uses upsert on progress.
- **Structured error responses** — every API error returns `{ code, message, details }` so the client can react specifically.
- **Transactions** for multi-write operations (assignment upload + progress upsert) via a Postgres RPC function.
- **Dead-letter logging** — failed uploads are logged with full context (student_id, semester_id, error) for manual replay.

### 5.5 Security

**Techniques**
- **JWT validation on every request** — backend middleware uses `jose` to verify Supabase-issued JWTs against the JWKS endpoint.
- **RLS as defense-in-depth** — even with service-role key, admin ops go through explicit role checks in code.
- **Input validation** — Zod schemas at every API boundary; reject unknown fields (`.strict()`).
- **SQL injection** impossible — Supabase client parameterizes queries; no raw SQL concatenation.
- **File upload hardening** — validate magic bytes (not just extension/MIME), enforce size limit, scan filename for path traversal.
- **Rate limiting** — Hono rate-limit middleware, 100 req/min per IP, 10/min on auth endpoints.
- **CORS** — whitelist the Next.js origin only; no wildcard.
- **Secrets** — never in git; use Fly.io secrets / Vercel env vars. Service-role key lives only on backend.


### 5.6 Maintainability

- **Feature-based modules** — `modules/courses/`, `modules/enrollments/`, each with `routes.ts`, `service.ts`, `repository.ts`, `schemas.ts`, `*.test.ts`.
- **Dependency injection** — services receive the Supabase client via constructor, making them testable with a mock.
- **Strict TypeScript** — `"strict": true`, `noUncheckedIndexedAccess: true`.
- **Linting** — Biome (Bun-native, fast) or ESLint + Prettier.
- **Tests** — `bun test` for unit + integration; Playwright for E2E.
- **Conventional commits** + automated changelog.

---

## 6. Software Architecture Patterns

A pragmatic mix of patterns — one for each concern.

### 6.1 Overall: Decoupled Client-Server (Headless Frontend)

The Next.js app is a **presentation tier**. The Bun/Hono service is the **application tier**. Supabase is the **data tier**. Each can evolve and scale independently. Future mobile clients reuse the same backend.

### 6.2 Backend: Layered (Hexagonal-lite) Architecture

```
┌─────────────────────────────────────────┐
│         HTTP Layer (Hono routes)         │  ← request parsing, auth middleware
├─────────────────────────────────────────┤
│     Service Layer (business logic)       │  ← orchestrates use cases
├─────────────────────────────────────────┤
│   Repository Layer (data access)         │  ← wraps Supabase client
├─────────────────────────────────────────┤
│       Supabase (Postgres + Storage)      │
└─────────────────────────────────────────┘
```

- **Routes** only parse input and call services — no business logic.
- **Services** own the use case logic; compose repositories.
- **Repositories** are the only code that touches Supabase; swap-out point for testing.

### 6.3 Feature-Based Modularization (within the layered structure)

Instead of `controllers/`, `services/`, `repositories/` at the root, group by feature:

```
backend/src/modules/
  courses/
    courses.routes.ts
    courses.service.ts
    courses.repository.ts
    courses.schemas.ts
    courses.test.ts
```

Keeps related code co-located and makes ownership obvious.

### 6.4 Repository Pattern

Every DB interaction is wrapped. Services never import the Supabase client directly.

```typescript
// modules/courses/courses.repository.ts
export class CoursesRepository {
  constructor(private sb: SupabaseClient) {}

  async findPublished(limit = 20, cursor?: string) {
    let q = this.sb.from('courses').select('*').eq('status', 'published').order('created_at', { ascending: false }).limit(limit)
    if (cursor) q = q.lt('created_at', cursor)
    const { data, error } = await q
    if (error) throw new DatabaseError(error.message)
    return data
  }
}
```

### 6.5 RBAC (Role-Based Access Control)

Two roles: `admin`, `student`. Enforced in three places (defense in depth):

1. **Next.js middleware** — redirects at the route level.
2. **Backend middleware** — `requireRole('admin')` on protected routes.
3. **Postgres RLS** — last line of defense.

### 6.6 CQRS-lite (read/write separation at the service level)

Not full CQRS, but reads and writes are separate methods. Later, reads can point to a replica:

```typescript
class EnrollmentsService {
  // reads
  listForAdmin(courseId: string) { ... }
  listForStudent(studentId: string) { ... }
  // writes
  request(studentId: string, courseId: string) { ... }
  review(enrollmentId: string, adminId: string, decision: 'approved' | 'rejected') { ... }
}
```

### 6.7 Frontend: Container / Presentational + Server Components

- **Server Components** do data fetching and layout.
- **Client Components** (marked `'use client'`) handle interactivity (forms, buttons).
- **Server Actions** are used for simple mutations; complex flows go through the Bun backend.

### 6.8 API Style: REST with resource-oriented URLs

Pragmatic REST — nouns, HTTP verbs, JSON. No GraphQL in v1 (overkill for this domain).

### 6.9 Error Handling: Result Pattern at Service Boundary

Services return `{ ok: true, data } | { ok: false, error: AppError }` rather than throwing for expected errors. Routes translate to HTTP status codes.

---

## 7. High-Level System Architecture

### 7.1 Component Diagram

```
┌───────────────────────────────────────────────────────────────────┐
│                         BROWSER (Client)                           │
│  Next.js 14 (App Router) · React 18 · TypeScript · Tailwind       │
│  - Public pages, student portal, admin dashboard                  │
│  - Supabase JS only for Auth (OAuth redirect handling)            │
│  - All data mutations go through the Bun backend                  │
└──────────────────────────┬────────────────────────────────────────┘
                           │ HTTPS (JSON)
                           │ Bearer JWT in Authorization header
                           ▼
┌───────────────────────────────────────────────────────────────────┐
│                BUN + HONO BACKEND (API Service)                    │
│  - JWT verification middleware (jose + Supabase JWKS)             │
│  - RBAC middleware (requireRole)                                  │
│  - Rate limiting, CORS, request logging                           │
│  - Feature modules: courses, semesters, enrollments, assignments  │
│  - Uses Supabase service-role key for privileged operations       │
└──────────────────────────┬────────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌───────────────────────────────────────────────────────────────────┐
│                          SUPABASE                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐   │
│  │    Auth     │  │  PostgreSQL  │  │       Storage           │   │
│  │ (Email/OAuth│  │  + RLS       │  │  (private: assignments) │   │
│  │  issues JWT)│  │              │  │                         │   │
│  └─────────────┘  └──────────────┘  └────────────────────────┘   │
└───────────────────────────────────────────────────────────────────┘
```

### 7.2 Deployment Topology

```
                       ┌──────────────┐
                       │  Cloudflare  │  (DNS + CDN + WAF, optional)
                       └──────┬───────┘
                              │
           ┌──────────────────┼──────────────────┐
           ▼                                      ▼
    ┌─────────────┐                       ┌───────────────┐
    │   Vercel    │   (frontend)          │    Fly.io     │  (backend)
    │  Next.js    │                       │  Bun + Hono   │
    │  (edge)     │                       │  2+ replicas  │
    └──────┬──────┘                       └───────┬───────┘
           │                                      │
           └──────────────────┬───────────────────┘
                              ▼
                       ┌──────────────┐
                       │   Supabase   │
                       │   (Pro tier) │
                       └──────────────┘
```

### 7.3 Data Flow Summary

```
Student signs up       → Supabase Auth → trigger creates profile (role=student)
Student logs in        → Supabase Auth → JWT in HTTP-only cookie
Student → Next.js      → Bun backend   → Supabase (RLS-respecting queries)
Admin approves enroll  → Bun backend   → Supabase (service-role writes)
Student uploads file   → Bun backend   → Supabase Storage + DB transaction
                                       → progress upserted
```

---

## 8. Frontend Structure (Bun + Next.js)

### 8.1 Directory Layout

```
frontend/
├── package.json                 # Bun manages deps (bun install / bun run dev)
├── bunfig.toml                  # Bun config
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── biome.json                   # Linter/formatter (Bun-friendly)
├── .env.local
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                     # Landing
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── callback/route.ts
│   │   │
│   │   ├── (student)/
│   │   │   ├── layout.tsx
│   │   │   ├── courses/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [courseId]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── semesters/[semesterId]/page.tsx
│   │   │   ├── my-courses/page.tsx
│   │   │   └── assignments/[semesterId]/page.tsx
│   │   │
│   │   └── (admin)/
│   │       ├── layout.tsx
│   │       ├── dashboard/page.tsx
│   │       ├── courses/
│   │       │   ├── page.tsx
│   │       │   ├── new/page.tsx
│   │       │   └── [courseId]/
│   │       │       ├── page.tsx
│   │       │       ├── semesters/new/page.tsx
│   │       │       └── enrollments/page.tsx
│   │       └── assignments/page.tsx
│   │
│   ├── components/
│   │   ├── ui/                          # shadcn/ui primitives
│   │   ├── course-card.tsx
│   │   ├── semester-list.tsx
│   │   ├── enrollment-table.tsx
│   │   ├── assignment-upload.tsx
│   │   ├── progress-bar.tsx
│   │   └── video-player.tsx
│   │
│   ├── lib/
│   │   ├── api-client.ts                # Typed wrapper around fetch → Bun backend
│   │   ├── supabase-browser.ts          # For OAuth flow only
│   │   ├── auth.ts                      # getSession, requireAuth, requireAdmin
│   │   └── constants.ts
│   │
│   ├── hooks/
│   │   ├── use-courses.ts
│   │   ├── use-enrollments.ts
│   │   └── use-progress.ts
│   │
│   ├── types/
│   │   └── api.ts                       # Shared types — mirror backend DTOs
│   │
│   └── middleware.ts                    # Auth + role-based route protection
```

### 8.2 Why Bun Here

- `bun install` is 10–25× faster than `npm install` — matters for CI and local onboarding.
- `bun run dev` starts Next.js dev server faster than `node`.
- `bun test` for simple unit tests in `lib/` and `hooks/`.
- Production build still uses Next.js compiler; Bun is the package manager + task runner.

### 8.3 Typed API Client

```typescript
// src/lib/api-client.ts
import type { Course, Enrollment, Assignment } from '@/types/api'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL!

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    credentials: 'include',
  })
  if (!res.ok) throw new ApiError(res.status, await res.json())
  return res.json()
}

export const api = {
  courses: {
    listPublished: () => request<Course[]>('/api/courses?status=published'),
    get: (id: string) => request<Course>(`/api/courses/${id}`),
    create: (body: Partial<Course>) => request<Course>('/api/courses', { method: 'POST', body: JSON.stringify(body) }),
    publish: (id: string) => request<Course>(`/api/courses/${id}/publish`, { method: 'PATCH' }),
  },
  enrollments: {
    request: (courseId: string) => request<Enrollment>('/api/enrollments', { method: 'POST', body: JSON.stringify({ course_id: courseId }) }),
    mine: () => request<Enrollment[]>('/api/enrollments/me'),
    review: (id: string, status: 'approved' | 'rejected') =>
      request<Enrollment>(`/api/enrollments/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  },
  assignments: {
    upload: (formData: FormData) =>
      fetch(`${BASE_URL}/api/assignments/upload`, { method: 'POST', body: formData, credentials: 'include' }).then(r => r.json()),
  },
}
```

### 8.4 Middleware (Route Protection)

```typescript
// src/middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const supabase = createServerClient(/* cookies */)
  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = req.nextUrl

  if (isPublic(pathname)) return NextResponse.next()
  if (!session) return NextResponse.redirect(new URL('/login', req.url))

  if (pathname.startsWith('/admin')) {
    const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
    if (data?.role !== 'admin') return NextResponse.redirect(new URL('/courses', req.url))
  }

  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
```

---

## 9. Backend Structure (Bun + TypeScript + Hono)

### 9.1 Why Hono on Bun

- **Bun-first ergonomics** — Hono ships a first-class Bun adapter (`hono/bun`) with zero friction.
- **Tiny & fast** — radix router, ~12 KB gzipped runtime, benchmark leader among JS frameworks.
- **Middleware ecosystem** — JWT, CORS, rate-limit, logger, compress all built-in.
- **Type-safe routes** — works beautifully with Zod + `@hono/zod-validator`.

> Alternative considered: **Elysia**. Great ergonomics but Bun-exclusive. Hono runs on Bun, Node, Deno, Cloudflare Workers — portability wins.

### 9.2 Directory Layout

```
backend/
├── package.json
├── bunfig.toml
├── tsconfig.json
├── biome.json
├── Dockerfile                          # FROM oven/bun:1
├── fly.toml                            # Fly.io deployment config
├── .env
│
├── src/
│   ├── index.ts                        # Server entry
│   ├── app.ts                          # Hono app composition (routes + middleware)
│   │
│   ├── config/
│   │   ├── env.ts                      # Validated env via Zod
│   │   └── supabase.ts                 # Supabase client factory (service role)
│   │
│   ├── middleware/
│   │   ├── auth.ts                     # Verifies Supabase JWT
│   │   ├── rbac.ts                     # requireRole('admin')
│   │   ├── error-handler.ts            # Central error → HTTP mapper
│   │   ├── rate-limit.ts
│   │   └── logger.ts                   # Structured JSON logs
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.schemas.ts
│   │   │
│   │   ├── courses/
│   │   │   ├── courses.routes.ts
│   │   │   ├── courses.service.ts
│   │   │   ├── courses.repository.ts
│   │   │   ├── courses.schemas.ts
│   │   │   └── courses.test.ts
│   │   │
│   │   ├── semesters/ ...
│   │   ├── enrollments/ ...
│   │   ├── assignments/ ...
│   │   └── progress/ ...
│   │
│   ├── shared/
│   │   ├── errors.ts                   # AppError, NotFoundError, ForbiddenError
│   │   ├── result.ts                   # Result<T, E>
│   │   ├── pagination.ts
│   │   └── types.ts
│   │
│   └── db/
│       ├── migrations/                 # SQL files
│       └── seed.ts
│
└── tests/
    ├── integration/
    └── fixtures/
```

### 9.3 Server Entry (Bun Native)

```typescript
// src/index.ts
import { app } from './app'
import { env } from './config/env'

const server = Bun.serve({
  port: env.PORT,
  fetch: app.fetch,
  // Bun handles graceful shutdown via AbortSignal; we hook SIGTERM for logs
})

console.log(`🚀 Backend listening on :${server.port}`)

process.on('SIGTERM', () => {
  console.log('SIGTERM received, stopping server')
  server.stop()
})
```

### 9.4 App Composition

```typescript
// src/app.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { errorHandler } from './middleware/error-handler'
import { authMiddleware } from './middleware/auth'
import { rateLimit } from './middleware/rate-limit'
import { coursesRoutes } from './modules/courses/courses.routes'
import { enrollmentsRoutes } from './modules/enrollments/enrollments.routes'
// ...other module imports

export const app = new Hono()

app.use('*', logger())
app.use('*', secureHeaders())
app.use('*', cors({ origin: process.env.FRONTEND_URL!, credentials: true }))
app.use('*', rateLimit({ max: 100, windowMs: 60_000 }))

app.get('/health', c => c.json({ ok: true }))

// All /api routes require auth
app.use('/api/*', authMiddleware)

app.route('/api/courses', coursesRoutes)
app.route('/api/enrollments', enrollmentsRoutes)
// ...

app.onError(errorHandler)
```

### 9.5 Auth Middleware

```typescript
// src/middleware/auth.ts
import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { MiddlewareHandler } from 'hono'
import { env } from '../config/env'

const JWKS = createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`))

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const auth = c.req.header('Authorization')
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)

  try {
    const { payload } = await jwtVerify(auth.slice(7), JWKS, {
      issuer: `${env.SUPABASE_URL}/auth/v1`,
      audience: 'authenticated',
    })
    c.set('userId', payload.sub as string)
    c.set('userRole', (payload.user_metadata as any)?.role ?? 'student')
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
}
```

### 9.6 Service + Repository Example

```typescript
// src/modules/enrollments/enrollments.service.ts
export class EnrollmentsService {
  constructor(
    private repo: EnrollmentsRepository,
    private coursesRepo: CoursesRepository,
  ) {}

  async request(studentId: string, courseId: string) {
    const course = await this.coursesRepo.findById(courseId)
    if (!course) throw new NotFoundError('Course not found')
    if (course.status !== 'published') throw new BadRequestError('Course not available')

    const existing = await this.repo.findByStudentAndCourse(studentId, courseId)
    if (existing) throw new ConflictError('Already requested enrollment')

    return this.repo.create({ student_id: studentId, course_id: courseId, status: 'pending' })
  }

  async review(enrollmentId: string, adminId: string, decision: 'approved' | 'rejected') {
    return this.repo.update(enrollmentId, {
      status: decision,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
    })
  }
}
```

---

## 10. API Design

### 10.1 Conventions

- **Base URL:** `https://api.example.com`
- **Format:** JSON only (`Content-Type: application/json`) except file uploads (`multipart/form-data`).
- **Auth:** `Authorization: Bearer <supabase_jwt>` on every `/api/*` route.
- **Versioning:** URL-less for v1 (`/api/...`). Future versions will be `/api/v2/...`.
- **Pagination:** Cursor-based — `?limit=20&cursor=<iso_timestamp>`. Responses include `next_cursor`.
- **Errors:** Uniform shape — `{ "error": { "code": "NOT_FOUND", "message": "...", "details": {} } }`.
- **Timestamps:** ISO 8601 UTC.
- **IDs:** UUID v4.

### 10.2 Standard Response Envelopes

```jsonc
// Success (single resource)
{ "data": { "id": "...", "title": "..." } }

// Success (collection)
{ "data": [ ... ], "pagination": { "next_cursor": "2025-01-14T..." } }

// Error
{ "error": { "code": "FORBIDDEN", "message": "Admin role required" } }
```

### 10.3 HTTP Status Code Usage

| Code | Meaning |
|---|---|
| `200` | OK — successful GET/PATCH. |
| `201` | Created — successful POST that creates a resource. |
| `204` | No Content — successful DELETE. |
| `400` | Bad Request — validation failure. |
| `401` | Unauthorized — missing/invalid JWT. |
| `403` | Forbidden — authenticated but role/ownership denies. |
| `404` | Not Found. |
| `409` | Conflict — e.g., duplicate enrollment. |
| `422` | Unprocessable Entity — semantically invalid (e.g., publish a course with no semesters). |
| `429` | Too Many Requests — rate limit hit. |
| `500` | Server Error. |
| `503` | Service Unavailable — DB unreachable. |

### 10.4 Endpoint Catalog

#### Auth

| Method | Path | Role | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Email/password signup |
| `POST` | `/api/auth/login` | Public | Email/password login |
| `POST` | `/api/auth/logout` | Any | Invalidate session |
| `GET` | `/api/auth/me` | Any | Current user + role |

#### Courses

| Method | Path | Role | Purpose |
|---|---|---|---|
| `GET` | `/api/courses` | Any | List courses. Students see `published` only; admins see all. Supports `?status=`, `?limit=`, `?cursor=`. |
| `GET` | `/api/courses/:id` | Any | Get one course (published visible to all, drafts to admin). |
| `POST` | `/api/courses` | Admin | Create course. |
| `PATCH` | `/api/courses/:id` | Admin | Update title/description. |
| `PATCH` | `/api/courses/:id/publish` | Admin | Toggle status. Rejects if zero semesters. |
| `DELETE` | `/api/courses/:id` | Admin | Delete (cascades to semesters, enrollments). |

**`POST /api/courses` — request/response**
```jsonc
// Request
{ "title": "Intro to React", "description": "Learn hooks, state, and effects." }
// 201 Response
{ "data": {
    "id": "c1...", "title": "Intro to React", "description": "...",
    "status": "draft", "created_by": "u1...", "created_at": "2026-04-22T10:00:00Z"
} }
```

#### Semesters

| Method | Path | Role | Purpose |
|---|---|---|---|
| `GET` | `/api/courses/:courseId/semesters` | Approved student / Admin | List semesters of a course. |
| `GET` | `/api/semesters/:id` | Approved student / Admin | Get one semester (includes YouTube URL). |
| `POST` | `/api/semesters` | Admin | Create semester. Body: `{ course_id, title, description, youtube_url, sort_order? }`. |
| `PATCH` | `/api/semesters/:id` | Admin | Update. |
| `DELETE` | `/api/semesters/:id` | Admin | Delete. |

#### Enrollments

| Method | Path | Role | Purpose |
|---|---|---|---|
| `POST` | `/api/enrollments` | Student | Request enrollment. Body: `{ course_id }`. |
| `GET` | `/api/enrollments/me` | Student | My enrollments (all statuses). |
| `GET` | `/api/enrollments` | Admin | List all; filter `?course_id=`, `?status=`. |
| `PATCH` | `/api/enrollments/:id` | Admin | Approve/reject. Body: `{ status: 'approved' | 'rejected' }`. |

**`PATCH /api/enrollments/:id` — request/response**
```jsonc
// Request
{ "status": "approved" }
// 200 Response
{ "data": {
    "id": "e1...", "student_id": "s1...", "course_id": "c1...",
    "status": "approved",
    "reviewed_by": "a1...", "reviewed_at": "2026-04-22T10:05:00Z"
} }
```

#### Assignments

| Method | Path | Role | Purpose |
|---|---|---|---|
| `POST` | `/api/assignments/upload` | Approved student | Upload PDF/DOCX. Multipart: `file`, `semester_id`. Creates assignment row + upserts progress. |
| `GET` | `/api/assignments/me` | Student | My submissions. Filter `?semester_id=`. |
| `GET` | `/api/assignments` | Admin | All submissions; filter `?course_id=`, `?semester_id=`, `?student_id=`. |
| `GET` | `/api/assignments/:id/download` | Admin / Owner student | Returns 60-second signed URL. |

**`POST /api/assignments/upload` — request/response**
```
Content-Type: multipart/form-data
file: <binary>
semester_id: s1...

// 201 Response
{ "data": {
    "assignment": { "id": "a1...", "file_path": "s1.../...", "file_name": "hw.pdf", "file_type": "pdf", "submitted_at": "..." },
    "progress":  { "semester_id": "s1...", "completed": true, "completed_at": "..." }
} }
```

#### Progress

| Method | Path | Role | Purpose |
|---|---|---|---|
| `GET` | `/api/progress?course_id=X` | Student | `{ total, completed, percentage }` for one course. |
| `GET` | `/api/progress/overview` | Student | All enrolled courses with their percentages. |

### 10.5 Rate Limits

| Scope | Limit |
|---|---|
| Unauthenticated | 20 req/min per IP |
| Authenticated (default) | 100 req/min per user |
| `/api/auth/*` | 10 req/min per IP |
| `/api/assignments/upload` | 10 req/min per user |

### 10.6 OpenAPI Contract

Generate `openapi.yaml` from Zod schemas using `@hono/zod-openapi`. Serve docs at `/docs` via Scalar or Swagger-UI. This doubles as the source of truth for frontend types (`openapi-typescript`).

---

## 11. Authentication & Authorization Flow

### 11.1 Providers

| Method | Provider | Invocation |
|---|---|---|
| Email + Password | Supabase Auth | `supabase.auth.signUp({ email, password })` (from backend for custom flows) |
| Google OAuth | Supabase Auth | `supabase.auth.signInWithOAuth({ provider: 'google' })` (from browser) |

### 11.2 Session Mechanics

- Supabase issues a **JWT access token** (short-lived, ~1 h) + **refresh token** (long-lived).
- Tokens are stored in **HTTP-only, Secure, SameSite=Lax cookies** by `@supabase/ssr`.
- Bun backend validates the JWT on every request against Supabase's JWKS — no session store needed.

### 11.3 Sequence — Email Signup

```
Browser                Next.js              Bun Backend          Supabase Auth         Postgres
   │                      │                      │                    │                   │
   │ submit email+pwd    │                      │                    │                   │
   │────────────────────► POST /api/auth/register │                    │                   │
   │                      │───────────────────── ► admin.createUser   │                   │
   │                      │                      │──────────────────► │                   │
   │                      │                      │                    │ insert auth.users │
   │                      │                      │                    │──────────────────►│
   │                      │                      │                    │                   │ trigger:
   │                      │                      │                    │                   │ insert profiles
   │                      │                      │  ◄───── user ──────│                   │ (role=student)
   │                      │                      │  generate session  │                   │
   │                      │ ◄─── { user, sess } ─│                    │                   │
   │ ◄── cookie + redirect│                      │                    │                   │
```

### 11.4 Sequence — Google OAuth

```
Browser                  Supabase Auth          Google             Next.js (/callback)     Backend
   │                         │                     │                      │                   │
   │ signInWithOAuth         │                     │                      │                   │
   │────────────────────────►│                     │                      │                   │
   │  302 → consent          │                     │                      │                   │
   │────────────────────────────────────────────── ►                      │                   │
   │  302 → /callback?code=X │                     │                      │                   │
   │──────────────────────────────────────────────────────────────────────►                   │
   │                         │                     │                      │ exchangeCodeFor…  │
   │                         │ ◄───────────────────────────────────────── │                   │
   │                         │ ──── session ──────────────────────────── ►│                   │
   │ ◄── set cookie + redirect to /courses (student) or /admin (admin)                        │
```

### 11.5 Profile Auto-Creation Trigger

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'student'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 11.6 Three-Layer Authorization

| Layer | Check | Example |
|---|---|---|
| **1. Next.js middleware** | Route gate | `/admin/*` requires role=`admin` in JWT claim |
| **2. Bun backend middleware** | Per-endpoint RBAC | `requireRole('admin')` on mutating routes |
| **3. Postgres RLS** | Row-level enforcement | `semesters` only SELECTable if `enrollments.status = 'approved'` |

### 11.7 Promoting a User to Admin

No self-service. A superuser runs:
```sql
UPDATE public.profiles SET role = 'admin' WHERE email = 'founder@example.com';
```

---

## 12. Database Schema

### 12.1 Entity Relationship Diagram

```
  ┌──────────────────┐
  │     profiles     │
  │──────────────────│
  │ id (PK → auth)   │
  │ email, full_name │
  │ role             │
  └────┬──────┬──────┘
       │      │
       │ 1    │ 1
       │      │
       │      └──────────────── M ┌────────────────┐
       │                           │  enrollments    │
       │                           │────────────────│
       │                           │ id             │
       │                           │ student_id FK  │
       │                           │ course_id FK   │◄─────┐
       │                           │ status         │      │
       │                           │ reviewed_by    │      │
       │                           └────────────────┘      │
       │                                                   │ M
       │ 1                                                 │
       │                                           ┌───────┴────────┐
       │                                           │    courses     │
       │                                           │────────────────│
       │                                           │ id (PK)        │
       │                                           │ title          │
       │                                           │ status         │
       │                                           │ created_by FK  │
       │                                           └───────┬────────┘
       │                                                   │ 1
       │                                                   │
       │                                                   │ M
       │                                           ┌───────┴────────┐
       │                                           │   semesters    │
       │                                           │────────────────│
       │                                           │ id             │
       │                                           │ course_id FK   │
       │                                           │ title, yt_url  │
       │                                           │ sort_order     │
       │                                           └───────┬────────┘
       │                                                   │ 1
       │                           ┌──────────────┐        │
       └──────────────────── M ──►│  assignments  │◄── M ──┘
       │                           │───────────────│
       │                           │ id            │
       │                           │ student_id    │
       │                           │ semester_id   │
       │                           │ file_path     │
       │                           │ file_type     │
       │                           └───────────────┘
       │
       │                          ┌──────────────────┐
       └──────────────── M ──────►│ student_progress │◄── M ── semesters
                                   │──────────────────│
                                   │ student_id       │
                                   │ semester_id      │
                                   │ completed        │
                                   │ completed_at     │
                                   └──────────────────┘
```

### 12.2 `profiles`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, FK → `auth.users(id)` ON DELETE CASCADE |
| `email` | `text` | NOT NULL |
| `full_name` | `text` | |
| `avatar_url` | `text` | |
| `role` | `text` | NOT NULL, CHECK IN ('admin','student'), DEFAULT 'student' |
| `created_at` | `timestamptz` | DEFAULT now() |

### 12.3 `courses`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() |
| `title` | `text` | NOT NULL |
| `description` | `text` | |
| `status` | `text` | NOT NULL, CHECK IN ('draft','published'), DEFAULT 'draft' |
| `created_by` | `uuid` | FK → `profiles(id)` |
| `created_at` | `timestamptz` | DEFAULT now() |
| `updated_at` | `timestamptz` | DEFAULT now() |

### 12.4 `semesters`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() |
| `course_id` | `uuid` | FK → `courses(id)` ON DELETE CASCADE |
| `title` | `text` | NOT NULL |
| `description` | `text` | |
| `youtube_url` | `text` | |
| `sort_order` | `integer` | NOT NULL, DEFAULT 0 |
| `created_at` | `timestamptz` | DEFAULT now() |

### 12.5 `enrollments`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `student_id` | `uuid` | FK → `profiles(id)` CASCADE |
| `course_id` | `uuid` | FK → `courses(id)` CASCADE |
| `status` | `text` | CHECK IN ('pending','approved','rejected'), DEFAULT 'pending' |
| `reviewed_by` | `uuid` | FK → `profiles(id)`, nullable |
| `reviewed_at` | `timestamptz` | nullable |
| `created_at` | `timestamptz` | DEFAULT now() |
| **UNIQUE** | `(student_id, course_id)` |

### 12.6 `assignments`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `student_id` | `uuid` | FK → `profiles(id)` CASCADE |
| `semester_id` | `uuid` | FK → `semesters(id)` CASCADE |
| `file_path` | `text` | NOT NULL |
| `file_name` | `text` | NOT NULL |
| `file_type` | `text` | CHECK IN ('pdf','docx') |
| `submitted_at` | `timestamptz` | DEFAULT now() |

### 12.7 `student_progress`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK |
| `student_id` | `uuid` | FK → `profiles(id)` CASCADE |
| `semester_id` | `uuid` | FK → `semesters(id)` CASCADE |
| `completed` | `boolean` | DEFAULT false |
| `completed_at` | `timestamptz` | nullable |
| **UNIQUE** | `(student_id, semester_id)` |

### 12.8 Full SQL Migration

```sql
-- ============================================
-- TABLES
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('admin','student')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.semesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  youtube_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, course_id)
);

CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('pdf','docx')),
  submitted_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  semester_id UUID NOT NULL REFERENCES public.semesters(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE (student_id, semester_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_semesters_course     ON public.semesters(course_id);
CREATE INDEX idx_enrollments_student  ON public.enrollments(student_id);
CREATE INDEX idx_enrollments_course   ON public.enrollments(course_id);
CREATE INDEX idx_enrollments_status   ON public.enrollments(status);
CREATE INDEX idx_assignments_student  ON public.assignments(student_id);
CREATE INDEX idx_assignments_semester ON public.assignments(semester_id);
CREATE INDEX idx_progress_student     ON public.student_progress(student_id);
CREATE INDEX idx_courses_status       ON public.courses(status);

-- ============================================
-- TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
          'student');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- RLS — see original blueprint §5 for full policy set
-- ============================================
ALTER TABLE public.profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- (Policies listed in original blueprint — included verbatim in the repo migration file)
```

---

## 13. Data Storage & Global Storage

This section is broken into three scopes: **persistent server-side storage**, **edge/distributed caches**, and **browser-side/global client state**.

### 13.1 Persistent Server-Side Storage — Supabase Postgres

| What lives here | Why |
|---|---|
| All domain entities (profiles, courses, semesters, enrollments, assignments, progress) | ACID, strong consistency, relational integrity via FKs. |
| Configuration that changes rarely (feature flags) | One source of truth; no config drift between instances. |
| Indexes on hot read paths | Sub-50 ms p95 queries. |

**Connection strategy**
- Long-running Bun backend holds a **persistent pool** (10–20 connections).
- If we later deploy to serverless, switch to Supabase's **PgBouncer transaction mode** connection string.

### 13.2 Blob/File Storage — Supabase Storage

| Bucket | Visibility | Contents |
|---|---|---|
| `assignments` | Private | Student PDF/DOCX uploads |
| `avatars` (future) | Public | Profile photos |
| `course-thumbnails` (future) | Public (CDN-friendly) | Course cover images |

All access to private files goes through **signed URLs** generated by the backend, TTL 60 s.

### 13.3 Edge & Distributed Caches

| Layer | Tech | What to cache | TTL |
|---|---|---|---|
| **CDN / HTTP cache** | Cloudflare / Vercel Edge Network | `GET /api/courses?status=published` | 30–60 s + `stale-while-revalidate` |
| **In-process memory** | Hono LRU (built-in or `lru-cache`) | JWKS keys, role lookups per user (10 s) | 10 s |
| **Distributed cache (future)** | Upstash Redis | Shared rate-limit counters, idempotency keys | varies |

Redis is **not required for v1** — Hono's in-memory rate limiter is sufficient until traffic justifies a distributed counter.

### 13.4 Browser / Client-Side Storage

| Tech | What lives here | Why |
|---|---|---|
| **HTTP-only cookies** | Supabase auth tokens (access + refresh) | Not accessible to JS → XSS-safe. |
| **React Query cache** (`@tanstack/react-query`) | Server data mirror (courses list, enrollments, progress) | Stale-while-revalidate, automatic refetch, optimistic updates. |
| **Zustand store** (global client state) | UI state: current theme, toasts, mobile nav open/closed | Lightweight; only for cross-component state that isn't server data. |
| **`localStorage`** | User preferences (theme, language) | Persistent across sessions. |
| **`sessionStorage`** | In-flight form drafts | Cleared on tab close. |

> **Global state rule of thumb:** if the source of truth lives on the server, use **React Query**, not a Redux/Zustand copy. Zustand is only for pure client UI state.

### 13.5 Observability Storage

| What | Where |
|---|---|
| Application logs | stdout → Fly.io logs + (optional) Axiom |
| Errors & traces | Sentry |
| Metrics | Fly.io built-in + (optional) Grafana Cloud |

### 13.6 Backup & Retention

- **DB backups:** Supabase Pro provides daily automated backups with 7-day retention. Enable Point-in-Time Recovery.
- **Storage backups:** Supabase replicates object storage; for extra safety, a nightly `rclone` job to S3 cold storage.

---

## 14. Storage Design for Assignments

### 14.1 Bucket Configuration

| Key | Value |
|---|---|
| Name | `assignments` |
| Public | **No** |
| Allowed MIME types | `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| Max file size | 25 MB |

### 14.2 Path Convention

```
{student_id}/{semester_id}/{unix_timestamp_ms}_{sanitized_filename}
```

Example:
```
3a4c...b7/8e9f...12/1713787200000_homework-1.pdf
```

Rationale: student ID first so RLS policy `(storage.foldername(name))[1] = auth.uid()` works; semester ID second for admin grouping; timestamp guarantees uniqueness on resubmission.

### 14.3 Storage RLS Policies

```sql
CREATE POLICY "Students upload own assignments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'assignments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Students read own assignments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'assignments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins read all assignments"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'assignments'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

### 14.4 Upload Flow (Bun + Hono)

```typescript
// src/modules/assignments/assignments.routes.ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { uploadSchema } from './assignments.schemas'

export const assignmentsRoutes = new Hono()

assignmentsRoutes.post('/upload', async (c) => {
  const studentId = c.get('userId')
  const form = await c.req.formData()
  const file = form.get('file') as File
  const semesterId = form.get('semester_id') as string

  // 1. Validate
  const ALLOWED = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]
  if (!ALLOWED.includes(file.type)) return c.json({ error: 'Unsupported file type' }, 400)
  if (file.size > 25 * 1024 * 1024) return c.json({ error: 'File too large' }, 400)

  // 2. Confirm approved enrollment
  const ok = await assignmentsService.isApprovedForSemester(studentId, semesterId)
  if (!ok) return c.json({ error: 'Not enrolled' }, 403)

  // 3. Upload
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_')
  const path = `${studentId}/${semesterId}/${Date.now()}_${safeName}`
  const arrayBuffer = await file.arrayBuffer()
  const { error: upErr } = await supabase.storage.from('assignments')
    .upload(path, arrayBuffer, { contentType: file.type })
  if (upErr) return c.json({ error: 'Upload failed' }, 500)

  // 4. Insert assignment record
  const ext = file.name.split('.').pop()!.toLowerCase()
  const { data: assignment, error: assignErr } = await supabase
    .from('assignments')
    .insert({
      student_id: studentId,
      semester_id: semesterId,
      file_path: path,
      file_name: file.name,
      file_type: ext === 'pdf' ? 'pdf' : 'docx',
    })
    .select()
    .single()
  if (assignErr) return c.json({ error: 'DB write failed' }, 500)

  // 5. Upsert progress (auto-mark semester completed)
  const { data: progress } = await supabase
    .from('student_progress')
    .upsert(
      {
        student_id: studentId,
        semester_id: semesterId,
        completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,semester_id' }
    )
    .select()
    .single()

  return c.json({ data: { assignment, progress } }, 201)
})
```

### 14.5 Signed Download URLs

```typescript
// src/modules/assignments/assignments.service.ts
async getDownloadUrl(assignmentId: string, requesterId: string, requesterRole: 'admin' | 'student') {
  const a = await this.repo.findById(assignmentId)
  if (!a) throw new NotFoundError()
  if (requesterRole !== 'admin' && a.student_id !== requesterId) throw new ForbiddenError()

  const { data, error } = await supabase.storage
    .from('assignments')
    .createSignedUrl(a.file_path, 60)   // 60-second TTL
  if (error) throw new InternalError('Could not sign URL')
  return data.signedUrl
}
```

---

## 15. Enrollment & Approval Workflow

### 15.1 State Machine

```
                       Student: POST /api/enrollments
                                     │
                                     ▼
                            ┌────────────────┐
                            │    PENDING     │
                            └───────┬────────┘
                                    │
                         Admin: PATCH /api/enrollments/:id
                                    │
                     ┌──────────────┴──────────────┐
                     ▼                             ▼
              ┌────────────┐                ┌────────────┐
              │  APPROVED   │                │  REJECTED   │
              └────────────┘                └────────────┘
                     │
                     ▼
           • Semester content unlocked
           • Assignment uploads enabled
           • Progress tracking begins
```

### 15.2 Transitions Allowed

| From | To | Actor | Side Effect |
|---|---|---|---|
| _(none)_ | `pending` | Student | `enrollments` row inserted, unique constraint prevents dup |
| `pending` | `approved` | Admin | `reviewed_by`, `reviewed_at` set |
| `pending` | `rejected` | Admin | Same as above |
| `rejected` | `pending` | Admin-only | Manual re-open; student can't self-retry in v1 |
| `approved` | `rejected` | Admin-only | Revokes access (rare) |

### 15.3 Enforcement Points

1. **Backend service** validates transitions (`EnrollmentsService.review`).
2. **RLS on `semesters`/`assignments`** checks `enrollments.status = 'approved'` for every SELECT/INSERT.
3. **Next.js UI** short-circuits by reading `enrollments.status` from `/api/enrollments/me`.

### 15.4 Student UI States

| Status | UI |
|---|---|
| No record | **Enroll Now** button |
| `pending` | Yellow "Pending Approval" badge, content greyed |
| `approved` | Full access, **Continue Course** CTA |
| `rejected` | Red banner "Enrollment Rejected — contact admin" |

---

## 16. Course Publishing & Access Control

### 16.1 Publishing Rules

- Course starts as `status = 'draft'` on creation.
- To publish:
  - Must have `≥ 1` semester (enforced server-side, returns `422` otherwise).
  - All semesters must have a valid `youtube_url` (enforced).
- Unpublishing is always allowed; it hides the course from the public catalog but existing enrollments keep their access.

### 16.2 Access Control Matrix

| Resource | Anonymous | Student (not enrolled) | Student (pending) | Student (approved) | Admin |
|---|:-:|:-:|:-:|:-:|:-:|
| Landing page | R | R | R | R | R |
| Published course list | R | R | R | R | R |
| Draft course list | — | — | — | — | R |
| Course detail (published) | R | R | R | R | R |
| Course detail (draft) | — | — | — | — | R |
| Semester list + videos | — | — | — | R | R |
| Enroll button | — | Y | — | — | — |
| Submit assignment | — | — | — | Y | — |
| View own assignments | — | — | — | R | — |
| View all assignments | — | — | — | — | R |
| Approve/reject enrollments | — | — | — | — | R/W |
| CRUD courses / semesters | — | — | — | — | R/W |

### 16.3 Progress Computation

```typescript
// modules/progress/progress.service.ts
async getForCourse(studentId: string, courseId: string) {
  const { count: total } = await sb.from('semesters')
    .select('*', { count: 'exact', head: true }).eq('course_id', courseId)
  const { count: done } = await sb.from('student_progress')
    .select('*, semesters!inner(course_id)', { count: 'exact', head: true })
    .eq('student_id', studentId).eq('completed', true).eq('semesters.course_id', courseId)

  return {
    total: total ?? 0,
    completed: done ?? 0,
    percentage: total ? Math.round((done! / total) * 100) : 0,
  }
}
```

---

## 17. Architecture & Flow Diagrams

### 17.1 Student Journey (End-to-End)

```
 ┌────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌──────────┐
 │Register│───►│ Browse  │───►│ Enroll  │───►│ Pending │───►│ Approved │
 │  /     │    │ Courses │    │ Request │    │  State  │    │  Access  │
 │ Login  │    │         │    │         │    │         │    │          │
 └────────┘    └─────────┘    └─────────┘    └─────────┘    └────┬─────┘
                                                                  │
                                                                  ▼
                                                    ┌──────────────────────┐
                                                    │ Watch video (YT)     │
                                                    │ Submit assignment    │
                                                    │ Progress auto-updated│
                                                    └──────────┬───────────┘
                                                               │
                                                               ▼
                                                       ┌───────────────┐
                                                       │ Course 100% ✔  │
                                                       └───────────────┘
```

### 17.2 Admin Journey

```
 ┌───────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐
 │  Create   │─►│ Add Semesters│─►│  Publish    │─►│ Review       │
 │  Course   │  │ (title/desc/ │  │  Course     │  │ Enrollments  │
 │           │  │  YouTube)    │  │             │  │ (approve/    │
 │           │  │              │  │             │  │  reject)     │
 └───────────┘  └──────────────┘  └─────────────┘  └──────┬───────┘
                                                          │
                                                          ▼
                                                   ┌──────────────┐
                                                   │Review Submit-│
                                                   │ted Assign-   │
                                                   │ments, Grade  │
                                                   └──────────────┘
```

### 17.3 Assignment Submission — Full Request/Response

```
 Browser         Next.js      Bun Backend         Supabase Storage    Postgres
    │               │              │                     │                │
    │ choose file   │              │                     │                │
    │──────────────►│              │                     │                │
    │ submit form   │              │                     │                │
    │──────POST /api/assignments/upload (multipart)─────►│                │
    │               │              │ verify JWT          │                │
    │               │              │ verify enrollment   │                │
    │               │              │ validate MIME/size  │                │
    │               │              │                     │                │
    │               │              │── upload(buffer) ──►│                │
    │               │              │◄───── path ─────────│                │
    │               │              │                     │                │
    │               │              │── INSERT assignments ───────────────►│
    │               │              │── UPSERT student_progress ──────────►│
    │               │              │◄──────── rows ───────────────────────│
    │               │              │                     │                │
    │               │◄─201 { data }│                     │                │
    │◄──────────────│              │                     │                │
    │ show success  │              │                     │                │
```

### 17.4 Cross-Cutting Concerns

```
                        Every request
                              │
                              ▼
         ┌────────────────────────────────────────┐
         │ 1. CORS                                 │
         │ 2. Request ID (UUID per request)        │
         │ 3. Structured logger (pino-style)       │
         │ 4. Rate limit                           │
         │ 5. JWT verify (JWKS)                    │
         │ 6. Role check (for role-scoped routes)  │
         │ 7. Zod body/query validation            │
         │ 8. Service call                         │
         │ 9. Uniform response formatter           │
         │ 10. Error handler (maps to HTTP codes)  │
         └────────────────────────────────────────┘
```

---

## 18. Environment Variables

### 18.1 Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
NEXT_PUBLIC_API_URL=https://api.example.com
```

### 18.2 Backend (`backend/.env`)

```env
NODE_ENV=production
PORT=8080

SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

FRONTEND_URL=https://app.example.com

# Security
JWT_ISSUER=https://xxx.supabase.co/auth/v1
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000

# Observability (optional)
SENTRY_DSN=
LOG_LEVEL=info
```

### 18.3 Env Validation (Zod)

```typescript
// backend/src/config/env.ts
import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(8080),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  FRONTEND_URL: z.string().url(),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
})

export const env = schema.parse(Bun.env)
```

---

## 19. Project Setup & Implementation Roadmap

### 19.1 Repository Structure (Monorepo or Polyrepo)

**Recommended:** Turborepo monorepo with two apps.

```
edulearn/
├── apps/
│   ├── frontend/            # Bun + Next.js
│   └── backend/             # Bun + Hono
├── packages/
│   └── shared-types/        # DTOs shared via `import` between apps
├── supabase/
│   └── migrations/          # SQL files (versioned)
├── turbo.json
├── package.json
└── bun.lockb
```

### 19.2 Initial Setup Commands

```bash
# 1. Create monorepo
mkdir edulearn && cd edulearn
bun init -y
bun add -D turbo

# 2. Frontend
cd apps && bunx create-next-app@latest frontend --typescript --tailwind --app --src-dir --no-eslint
cd frontend && bun add @supabase/ssr @supabase/supabase-js @tanstack/react-query zustand react-hook-form zod sonner react-dropzone
bunx shadcn@latest init

# 3. Backend
cd ../ && mkdir backend && cd backend
bun init -y
bun add hono @hono/zod-validator zod jose @supabase/supabase-js
bun add -D @types/bun typescript

# 4. Supabase (local dev)
cd ../.. && bunx supabase init
bunx supabase start                    # spins up local stack
bunx supabase db push                  # applies migrations
```

### 19.3 Implementation Phases

**Phase 1 — Foundation (Week 1)**
- [ ] Monorepo scaffolded
- [ ] Supabase project created (cloud) + local dev stack working
- [ ] DB migration file committed (§12.8) and applied
- [ ] RLS policies applied
- [ ] Storage bucket `assignments` created (private)
- [ ] Bun backend: health check + JWT middleware + error handler
- [ ] Frontend: Tailwind + shadcn/ui + base layouts

**Phase 2 — Auth (Week 1–2)**
- [ ] `/register`, `/login` pages (email + Google)
- [ ] `/auth/callback` route
- [ ] Next.js middleware for route protection
- [ ] Backend: `/api/auth/me` endpoint
- [ ] Manually promote first admin via SQL

**Phase 3 — Course & Semester Management (Week 2)**
- [ ] Admin: course CRUD UI + backend routes
- [ ] Admin: semester CRUD UI + backend routes
- [ ] Admin: publish/unpublish toggle

**Phase 4 — Student Enrollment (Week 3)**
- [ ] Public course catalog (`/courses`)
- [ ] Course detail page with enroll button
- [ ] Backend: `POST /api/enrollments`
- [ ] Admin: enrollment review UI
- [ ] Backend: `PATCH /api/enrollments/:id`
- [ ] "My Courses" page for students

**Phase 5 — Content Access (Week 3–4)**
- [ ] Semester viewer with YouTube embed
- [ ] RLS verification (try to access as non-enrolled user → 403)

**Phase 6 — Assignments + Progress (Week 4)**
- [ ] Backend: `/api/assignments/upload`
- [ ] Frontend: upload component with drag-drop
- [ ] Progress calculation + progress bar
- [ ] Admin: view all assignments with signed download URLs

**Phase 7 — Polish & Non-Functional (Week 5)**
- [ ] Rate limiting
- [ ] Structured logging + Sentry
- [ ] Unit tests for services (≥ 70% coverage)
- [ ] Playwright E2E for 3 critical paths: register→enroll→approve, upload assignment, admin publish
- [ ] OpenAPI spec + docs page

**Phase 8 — Deploy (Week 5–6)**
- [ ] Frontend → Vercel
- [ ] Backend → Fly.io (`fly launch` + `fly deploy`)
- [ ] Supabase prod project, keys wired
- [ ] Smoke test in prod
- [ ] Set up monitoring dashboards

### 19.4 GSTACK Claude Code Plugin Usage

Use GSTACK to scaffold each feature module consistently:

1. `gstack generate module courses` — creates `modules/courses/{routes,service,repository,schemas,test}.ts` with boilerplate.
2. `gstack generate page (student)/courses` — Next.js page scaffold with typed API client import.
3. `gstack generate migration update_courses_schema` — creates a timestamped SQL file under `supabase/migrations/`.
4. `gstack test` — runs `bun test` across both apps.

Define per-feature templates in `.gstack/templates/` matching the layered structure in §9.

### 19.5 Testing Strategy

| Layer | Tooling | Coverage Target |
|---|---|---|
| Unit (services, utils) | `bun test` + `vitest`-compatible API | ≥ 70% |
| Integration (routes → repo → test DB) | `bun test` + Supabase local | Critical paths only |
| E2E (browser) | Playwright | 3–5 happy paths |
| Type safety | `tsc --noEmit` in CI | 100% (no errors) |

### 19.6 CI/CD Pipeline (GitHub Actions sketch)

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun run typecheck
      - run: bun test
      - run: bun run build
```

Deploy jobs are triggered on tags (`v*`) — frontend to Vercel via their GitHub integration, backend to Fly.io via `fly deploy` with an API token secret.

---

## 20. Recommended Libraries

| Purpose | Library | Notes |
|---|---|---|
| **Backend framework** | `hono` | Bun-friendly, fast, tiny |
| **Validation** | `zod` | Shared between FE/BE |
| **JWT verification** | `jose` | Pure-JS, works on Bun |
| **Supabase client** | `@supabase/supabase-js`, `@supabase/ssr` | SSR helper for Next.js |
| **OpenAPI** | `@hono/zod-openapi` + `@scalar/hono-api-reference` | Auto-docs |
| **Logging** | `pino` or `hono/logger` | JSON logs |
| **Rate limit** | `hono-rate-limiter` | In-memory v1 |
| **Errors** | `hono/http-exception` + custom `AppError` | Uniform shape |
| **Frontend state** | `@tanstack/react-query`, `zustand` | Server vs client state |
| **Forms** | `react-hook-form` + `@hookform/resolvers` + `zod` | Typed, performant |
| **UI** | `tailwindcss`, `shadcn/ui`, `lucide-react` | Design system |
| **Upload UI** | `react-dropzone` | Drag-and-drop |
| **Toasts** | `sonner` | Lightweight |
| **YouTube embed** | `<iframe>` or `react-youtube` | Plain iframe is enough |
| **Testing** | `bun test`, `@playwright/test` | Fast + reliable |
| **Lint/format** | `biome` | Single tool, Rust-fast |
| **Monorepo** | `turbo` | Caching, parallel tasks |
| **Observability** | `@sentry/bun` (or `@sentry/node`) | Error tracking |

---

## Getting Started Checklist

```
[ ] Install Bun 1.1+ (curl -fsSL https://bun.sh/install | bash)
[ ] Install Supabase CLI (brew install supabase/tap/supabase)
[ ] Create Supabase cloud project
[ ] Enable Email + Google auth providers in Supabase dashboard
[ ] Run SQL migration from §12.8 (supabase db push)
[ ] Create Storage bucket "assignments" (private) + apply policies from §14.3
[ ] Scaffold monorepo with commands in §19.2
[ ] Copy .env templates from §18, fill in keys
[ ] Run `bun run dev` in both apps — verify health checks
[ ] Promote first admin: UPDATE profiles SET role='admin' WHERE email='...'
[ ] Walk through Phase 2–8 of the roadmap
[ ] Deploy and smoke test
```

---

**Document version:** 1.0 · **Last updated:** 2026-04-22 · **Stack:** Bun · Next.js · Hono · Supabase