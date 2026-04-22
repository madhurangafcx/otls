# Design Gaps: Edulearn mockups vs shipped frontend

A screen-by-screen audit comparing `docs/design/edulearn-ui/project/screens-*.jsx`
against the current frontend at `apps/frontend/src/app/*` and the backend endpoints
at `apps/backend/src/modules/*/*.routes.ts`.

Use this as a fix list. Each section shows:
- What the **design** intended (component, layout, interactions)
- What's **live** today
- Which **backend endpoints** power this surface so you know what data is available
- Specific **gaps** to close, in priority order

Last generated after Phase 6 ship. Announcements UI has no design mockup (scope
was added after the Edulearn bundle was handed off), so those pages are flagged
"no design reference" rather than compared.

---

## 0. Structural gaps (affect every page)

These are the highest-impact gaps because they're felt on every screen.

### 0.1 TopNav is missing across the entire student/public experience

Design has three TopNav variants in `parts.jsx`:

- **Public** (`variant="public"`): Brand + "Log in" + "Create account"
  — for `/`, `/courses`, `/courses/[id]` before login
- **Student** (`variant="student"`): Brand + "Courses" / "My Courses" nav links + Search icon + Avatar
  — for `/courses`, `/my-courses`, `/courses/[id]`, `/courses/[id]/semesters/[id]`
- **Admin** (`variant="admin"`): Brand + "Admin" badge + ⌘K + Avatar
  — sits above the AdminSidebar on every `/admin/*` page

**Live today:** no global nav anywhere. Student pages have a bare `<Link href="/">← Home</Link>` at the bottom. Admin pages have the sidebar but no top bar.

**Fix:** create `components/top-nav.tsx` (client component, reads session server-side via a parent server component or via the browser client). Three variants via a `variant` prop. Render in `app/layout.tsx` conditionally, OR inside a `(public)` route group and `(student)` route group. The `/admin/*` routes get the admin variant via the existing `admin/layout.tsx`.

**Why this matters:** "What site is this? What page am I on?" — the trunk test. Without TopNav, every student page fails it. The avatar and nav links also replace the current bottom `← Home` hack with proper wayfinding.

### 0.2 Footer is missing

Design has a Footer in `parts.jsx` used on the Landing page: copyright + About / Privacy / Terms / Contact links.

**Fix:** create `components/footer.tsx`, render on landing at minimum. Add static pages for About/Privacy/Terms/Contact later (empty-for-now placeholder pages are fine).

### 0.3 Icon set is missing

Design uses `Icons.*` throughout (`Icons.ArrowRight`, `Icons.Check`, `Icons.Search`, `Icons.UserPlus`, `Icons.FileText`, `Icons.Upload`, `Icons.Play`, `Icons.Download`, `Icons.ChevronLeft`, `Icons.ChevronRight`, `Icons.Lock`, `Icons.Google`, `Icons.LayoutDashboard`, `Icons.BookOpen`, `Icons.UserCheck`, `Icons.ClipboardList`, `Icons.Users`, `Icons.Settings`, `Icons.LogOut`, `Icons.Grip`, `Icons.Plus`, `Icons.Dot`, `Icons.TrendingUp`, `Icons.CircleCheck`, `Icons.X`, `Icons.Layers`, `Icons.PlayCircle`, `Icons.More`, `Icons.ChevronDown`).

**Live today:** unicode arrows (`→`, `←`), text ("Approved"), no icons. Some bullet dots (`•`) via `rounded-pill` + `bg-success-fg` spans.

**Fix:** adopt `lucide-react` (matches the Icons.X naming — most icons map 1:1) or similar. Centralize in `components/icons.ts` with the same names the design uses. `bun add lucide-react`.

### 0.4 Shared UI primitives from `parts.jsx` not ported

Design provides 10 reusable parts. Live code reimplements them inline in each page with slight variations:

| parts.jsx | Current status in live code |
|---|---|
| `Brand` | Inlined in 4 places with different sizes, all roughly consistent |
| `TopNav` | **Missing entirely** (see 0.1) |
| `PageHeader` | Inlined in most pages with slight variations |
| `CourseCard` | Reimplemented 3 times (catalog, my-courses, admin-dashboard courses list) — none show semester count |
| `EnrollmentBadge` | Reimplemented inline 4+ times with identical hand-rolled classes |
| `ProgressBar` | Inlined on /my-courses card + semester viewer header |
| `Footer` | **Missing entirely** |
| `AdminSidebar` | Close — in `admin/layout.tsx`, missing enrollment count badge + Students section |
| `StatCard` | Inlined in admin dashboard, missing delta/trend indicator |
| `EmptyState` | Inlined per-page with copy variations |
| `Toast` | Not implemented |

**Fix:** port each to `components/` so they're the single source of truth. Highest leverage: `CourseCard`, `EnrollmentBadge`, `StatCard` — used most often with most drift.

---

## 1. `/` — Landing

**Design:** `screens-public.jsx` → `Landing`
**Live:** `apps/frontend/src/app/page.tsx`
**Backend:** `GET /api/courses?status=published` (public, no auth)

### Design intent
- Public TopNav (log-in/create CTAs)
- Rule-accent divider + "Learn anything · self-paced" eyebrow
- Massive `t-display` title: *"Structured learning for curious minds."*
- Descriptive paragraph + two big CTAs ("Browse courses", "Create account")
- **Featured courses** section: 3-column grid of `CourseCard` components (semesters count visible)
- Footer

### Live reality
- Bare header with eyebrow + smaller h1
- Session-aware card (welcome back OR login/create CTAs)
- **"Stack health"** dev affordance (backend/DB status) — dev-only, shouldn't ship
- No featured courses, no footer, no public nav
- `max-w-3xl` container (design uses 1200px)

### Gaps (priority order)
1. **Missing TopNav** — covered in 0.1
2. **Missing Featured Courses grid** — fetch top 3 published courses on server, render `<CourseCard>` 3-column grid
3. **"Stack health" panel must go** — wrap in `process.env.NODE_ENV === 'development'` OR delete entirely
4. **Hero typography** — use `font-display` + a display-sized class (add to `tailwind.config` if missing), generous line-height. Design's `t-display` suggests 60-72px on desktop.
5. **Container width** — bump to `max-w-6xl` or 1200px to match design grid
6. **Missing Footer** — covered in 0.2
7. **Missing `rule-accent` divider** — 2px accent-600 horizontal rule with subtle fade, above the eyebrow

---

## 2. `/courses` — Public catalog

**Design:** `screens-public.jsx` → `Catalog`
**Live:** `apps/frontend/src/app/courses/page.tsx`
**Backend:** `GET /api/courses?status=published&limit=&cursor=` (public — cursor pagination shipped)

### Design intent
- Student TopNav
- PageHeader: title "Courses" + description
- Filter row: Search input (with search icon), Sort dropdown
- 3-column `CourseCard` grid (with semester count visible: "6 semesters")
- Pagination: "Load more" button + "Showing 6 of 18" count

### Live reality
- No TopNav
- Custom header ("Catalog" eyebrow + title + description)
- **No search**, **no sort**
- 2-column `md:grid-cols-2` grid (not 3-col)
- CourseCard shows title + description + Published badge but **no semester count**
- **No pagination UI** even though backend supports cursor-based pagination

### Gaps
1. **Student TopNav** — 0.1
2. **Search input** — client-side filter over loaded page OR backend `?q=` param (backend doesn't have search yet — filter client-side for v0.1)
3. **Sort dropdown** — options: Newest / Title A-Z. Backend list already orders by `created_at DESC`
4. **3-col grid** — `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
5. **Semester count on each card** — backend needs to return it. Either add to `GET /api/courses` response (JOIN COUNT on semesters per course — watch N+1) OR call `GET /api/courses/:id/semesters` per card on hover. Preferred: add `semester_count: number` to `CoursePayload` via a single aggregation query in `coursesRepository.list`.
6. **Pagination "Load more"** — wire to the existing `pagination.next_cursor` the backend already returns. Button posts back with `?cursor=<iso>`. OR switch to infinite scroll if you prefer.
7. **"Showing X of Y" count** — requires a total-count endpoint. Fastest: add `{count: 'exact', head: true}` to `coursesRepository.list` and return it alongside pagination.

---

## 3. `/courses/[courseId]` — Course detail

**Design:** `screens-public.jsx` → `CourseDetail` (three states: not-enrolled / pending / approved)
**Live:** `apps/frontend/src/app/courses/[courseId]/page.tsx`
**Backend:** `GET /api/courses/:id`, `GET /api/enrollments/me`, `GET /api/courses/:courseId/semesters`, `GET /api/courses/:courseId/announcements`, `POST /api/enrollments`

### Design intent
- Student TopNav
- "← Back to courses" breadcrumb
- Eyebrow: "6 semesters · intermediate"
- `t-display-sm` title + lead paragraph
- **2-column layout:**
  - Left (1fr): "About this course" heading + `.prose` content (3 paragraphs)
  - Right (340px): Sticky sidebar card — enrollment state (CTA button OR pending badge OR continue button) + separator + meta list (Layers icon "6 semesters, ~18 hours", PlayCircle "Video lessons", FileText "PDF/DOCX assignments", UserCheck "Instructor feedback")
- Below: Semesters list. Each row: number (01, 02, ...) + title + description. Locked row if not approved (shows Lock icon + "Enroll to view"). Completed row shows green badge.

### Live reality
- Breadcrumb exists (good)
- Single column stacked layout
- Title + description only, no `.prose` body (backend `courses.description` is a single text field, not structured content)
- Enrollment card — 4 states (anon/no-record/pending/approved) — matches design
- **Approved students see announcement feed above semesters** (new, design predates announcements)
- Semester list exists for approved students, locked state DOES NOT exist for non-approved (they see nothing)
- No 2-column layout — card is above, semester list below

### Gaps
1. **Student TopNav** — 0.1
2. **2-column layout** — main content left, sticky enrollment card right. Redesign needed.
3. **Eyebrow metadata** — "6 semesters · intermediate" — requires a `difficulty` field on the course model (not in DB). EITHER add to migration OR drop the intermediate/beginner part and just show semester count.
4. **`.prose` body content** — currently a single `description` field limits this. Consider:
   - **Short term:** display `description` as prose with `font-serif` + `leading-relaxed` styling. One paragraph only.
   - **Long term:** add `body_markdown` column to `courses`, render with a Markdown renderer.
5. **Sticky enrollment card** — reposition existing `<EnrollmentCard>` into a `lg:sticky lg:top-24` right column
6. **Meta list in card** — icon + text rows ("6 semesters, ~18 hours", "Video lessons", etc.). Needs icons (0.3) and an `estimated_hours` field (or drop duration text).
7. **Locked semester list for non-approved students** — design shows the list with lock icons + "Enroll to view" so users see what they'll get. Currently semesters are invisible pre-approval. Render the list from `course.id` without fetching `listSemesters` (which 403s), OR make `listSemesters` return a stripped shape (title only) for non-approved callers.
8. **Design number in 2-char format** (01, 02) — live uses the same `padStart(2, '0')` but design also has `font-display` styling on it.
9. **Completed green badge per semester** — design shows "✓ Completed" per completed semester. Live doesn't indicate per-semester completion. Data exists in `/api/progress` — wire it through.

---

## 4. `/courses/[courseId]/semesters/[semesterId]` — Semester viewer

**Design:** `screens-student.jsx` → `SemesterViewer`
**Live:** `apps/frontend/src/app/courses/[courseId]/semesters/[semesterId]/page.tsx`
**Backend:** `GET /api/semesters/:id`, `GET /api/courses/:id`, `GET /api/assignments/me?semester_id=`, `GET /api/progress?course_id=`, `POST /api/assignments` (register after TUS)

### Design intent
- Student TopNav
- "← Intro to React" back link
- "Semester 02" eyebrow (accent color)
- H1 title
- **2-column layout:**
  - Left (1fr): Video placeholder → "About this semester" heading + `.prose` → separator → "Assignment" heading + dropzone → "Previously submitted" card with file row → Prev / Next navigation buttons at bottom
  - Right (260px, sticky): "Course" eyebrow + card with ALL semester rows (numbered, title, current one highlighted with accent-50 bg and accent-600 left border, done ones have green check icon) + ProgressBar at bottom with "2 of 6 complete"
- **Dropzone has 6 states** (`DropzoneStates`): idle, dragging over, uploading (with progress + file size), success (green), error, empty-with-toast

### Live reality
- Breadcrumb at top (Courses › Course › Semester)
- Title + "X/Y semesters · NN%" on same line
- Description (plain)
- YouTube iframe in aspect-ratio container
- Upload dropzone (`upload-dropzone.tsx`) with 4 states: idle, uploading (progress bar), registering, done, error — missing "dragging over"
- Submissions list below
- No prev/next navigation
- **No sidebar with other semesters**

### Gaps
1. **Student TopNav** — 0.1
2. **Missing sidebar with all semesters** — high value because it's the primary way students navigate within a course. Build via `GET /api/courses/:courseId/semesters` on the server, mark current one, pull completion state from `/api/progress`.
3. **Prev / Next semester navigation** — compute next/prev from the sorted semesters list, render two buttons at the bottom. Important for linear flow.
4. **Eyebrow + bigger title** — design uses "Semester 02" eyebrow + t-h1 title. Live mixes the progress text into the title row.
5. **"About this semester" prose section** — `semester.description` should render as `.prose`-styled content, currently just plain text below the title.
6. **Dropzone "dragging over" state** — add `onDragEnter`/`onDragLeave`/`onDrop` handlers that shift the dropzone to the accent-colored variant. Shown in design as `dropzone.drag` with `Icons.Upload` in accent color + "Release to upload".
7. **Dropzone uploading visual** — design shows file row (icon + filename + X cancel button) + progress bar + "62% · 1.2 MB of 1.9 MB" text. Live shows a simple centered progress bar. Port the design's richer treatment.
8. **Dropzone success visual** — design uses green success surface (`success-bg` + `success-border`) with CircleCheck icon + "Uploaded · Semester marked complete · submit another" link. Live shows only a text line.
9. **Dropzone error visual** — design shows red X + reason ("essay.pdf is 34 MB · max 25 MB") + "try again" link. Live has text error + Try again button, close enough but could polish.
10. **Previously submitted card** — design uses a subtle `.card` with FileText icon + filename + "Submitted 3 days ago · 1.2 MB" + Download icon button. Live shows a list item per submission but no download action. Backend supports `GET /api/assignments/:id/download` (student owns their own) — wire it up.
11. **Toast component** — design has a toast for submission success ("Assignment submitted — semester marked complete"). Live uses `router.refresh()` with no explicit feedback beyond the dropzone state change.

---

## 5. `/my-courses` — Student dashboard

**Design:** `screens-student.jsx` → `MyCourses`
**Live:** `apps/frontend/src/app/my-courses/page.tsx`
**Backend:** `GET /api/enrollments/me`, `GET /api/progress/overview`, `GET /api/announcements/overview`

### Design intent
- Student TopNav
- PageHeader: "My Courses"
- **Three tabs** with counts: "In Progress (3)", "Completed (1)", "Pending (2)"
- Per tab:
  - **In Progress:** cards with title + progress bar + "4 of 6 semesters completed · last viewed 2 days ago"
  - **Completed:** cards with title + "Finished · Mar 18, 2026" + green Completed badge
  - **Pending:** cards with title + "Requested 2 days ago · awaiting instructor review" + pending badge

### Live reality
- No TopNav
- PageHeader exists
- **No tabs** — stacked sections: Active / Pending / Rejected
- Active cards have progress bar (matches design) + unread announcement badge (new, beyond design) + status badge
- Right rail with 5 most recent announcements (new, beyond design)
- No "Completed" concept (can't filter at 100% because we don't compute that server-side)
- No "last viewed" metadata

### Gaps
1. **Student TopNav** — 0.1
2. **Tabs vs stacked sections** — structural call. Design uses tabs (cleaner for many courses). Live uses sections (easier to see all states at once). If switching to tabs: client component with `useState`, render each tab's cards. Keep the announcements rail outside the tab.
3. **"Completed" tab** — requires a way to know a course is 100% complete. The `/api/progress/overview` returns `percentage` per course; "Completed" is `percentage === 100`. Straightforward to compute client-side. But design implies a date ("Finished · Mar 18") — that needs a `completed_at` field on enrollments OR a computed max of `student_progress.completed_at` for that course.
4. **"Last viewed" metadata** — requires tracking. We already log `semester_views` (telemetry table). Query `MAX(viewed_at)` per course per student for this. Add an endpoint `/api/progress/overview` already joins through semesters — extend it to include `last_viewed_at`.
5. **"Rejected" handling** — design doesn't have a Rejected tab (rejected students just don't show up). Live has a whole section for them. Keep the live behavior; it's better UX for small tuition-center pilot where students want to know they were rejected.

---

## 6. `/login` — Auth: sign in

**Design:** `screens-auth.jsx` → `Login`
**Live:** `apps/frontend/src/app/(auth)/login/page.tsx`
**Backend:** `POST /api/auth/login`, Google OAuth via Supabase

### Design intent
- AuthShell: Brand top-left corner + centered form container
- "Welcome back" heading + "Sign in to continue learning" subcopy
- Card (420px wide):
  - **Google button FIRST** (full width, with Google icon)
  - "or sign in with email" horizontal rule divider
  - Email field
  - Password field (with "Forgot?" link on same row as label)
  - Sign in button
- "New here? Create an account →" link below card

### Live reality
- Edulearn eyebrow + heading centered at top
- Card (max-w-md):
  - **Email form FIRST**
  - Email input
  - Password input (no "Forgot?" link)
  - Log in button
  - "or" divider
  - **Google button LAST** (no icon, plain "Continue with Google" text)
- "Create an account" link below

### Gaps
1. **Button order reversed** — Google FIRST per design. OAuth is the primary path for pilot users.
2. **Google icon missing** — add G/Google logo to the button (via `Icons.Google` once icons are set up — 0.3)
3. **"Forgot?" link missing** — Supabase supports password reset out of the box (`supabase.auth.resetPasswordForEmail()`). Add link + a `/reset-password` page. Flag to TODO if deferring — many pilots defer this.
4. **Brand position** — design has Brand top-left of the page (outside the card), live has it as an eyebrow above the heading. Move to top-left corner.
5. **AuthShell layout** — design has Brand top-left + centered 420px form below, with generous padding. Port this shape.

---

## 7. `/register` — Auth: sign up

**Design:** `screens-auth.jsx` → `Register`
**Live:** `apps/frontend/src/app/(auth)/register/page.tsx`
**Backend:** `POST /api/auth/register`, Google OAuth via Supabase

### Design intent
- AuthShell + Brand top-left
- "Create your account" heading + "Start with one course. Add more whenever." subcopy
- Card:
  - **Google button FIRST** (with icon)
  - Divider
  - Full name field
  - Email field
  - Password field with 3-segment strength meter + "8+ characters, include a number." helper
  - Create account button
- "Already have an account? Sign in →" link

### Live reality
- Heading + subcopy centered at top
- Card:
  - Full name field (optional)
  - Email field
  - Password field with **3-segment strength meter** (matches design) + "Weak/OK/Strong" label
  - Create account button
- **NO Google signup button anywhere**
- "Log in" link below

### Gaps
1. **MISSING Google signup button entirely** — design has it as the primary path. Add it at the top of the card. Same handler pattern as `/login`'s `handleGoogleLogin`.
2. **Helper text under password** — design shows "8+ characters, include a number." always visible. Live only shows strength label after typing.
3. **Brand position** — same as login (0.6.4)
4. **AuthShell** — same shared layout component needed

---

## 8. `/admin` — Admin dashboard

**Design:** `screens-admin.jsx` → `AdminDashboard`
**Live:** `apps/frontend/src/app/admin/page.tsx`
**Backend:** `GET /api/courses`, `GET /api/enrollments?course_id=`, `GET /api/assignments`

### Design intent
- AdminShell = TopNav admin + AdminSidebar + content
- PageHeader: "Dashboard" + "Activity across every course in the last 30 days"
- **4 StatCards** with delta + trend arrow:
  - Students (142, "+12 this week" ↑)
  - Courses (8, "1 in draft")
  - Pending enrollments (5, "Review now")
  - Submissions (34, "+8 today" ↑)
- **"Recent enrollment requests"** section: avatars + name + course + timing + inline Approve/Reject buttons (3 rows)
- **"Recent assignments"** table: Student / Course / Semester / File / Submitted / Download

### Live reality
- Admin header (h1 + description)
- **4 StatCards** but different metrics:
  - Total courses
  - Published
  - Drafts
  - Students — value is "—" with hint "Phase 4" (stale — phase 4 is done)
- No delta/trend arrow on any card
- "Courses" section with top 5 recent courses + status badge (useful but not in design)
- **No recent enrollment requests section**
- **No recent assignments section**

### Gaps
1. **Stat metrics wrong** — replace with design's four: Students / Courses / Pending / Submissions. Backend queries:
   - Students: `SELECT count(*) FROM profiles WHERE role='student'`
   - Courses: `GET /api/courses?limit=50` count (current approach), optionally split drafts
   - Pending enrollments: `SELECT count(*) FROM enrollments WHERE status='pending'`
   - Submissions today: `SELECT count(*) FROM assignments WHERE submitted_at > current_date`
   None of these endpoints exist today — need a new `/api/admin/stats` endpoint returning all four at once, OR aggregate client-side from existing list endpoints (slow, but works).
2. **Delta + trend arrow** — design shows "+12 this week" with TrendingUp icon. Requires a time-window delta computation. Add to the `/api/admin/stats` response: each metric returns `{value, delta, direction}`.
3. **"Phase 4" hint is stale** — delete that line.
4. **Recent enrollment requests section** — new endpoint `GET /api/enrollments?status=pending&limit=5` (currently the route requires `course_id`; relax to optional so admin dashboard can pull cross-course pending). Render with avatars + inline Approve/Reject actions using existing `PATCH /api/enrollments/:id`.
5. **Recent assignments section** — use existing `GET /api/assignments?limit=5` (admin list already paginated).
6. **AdminSidebar** needs updating (0.5 item) — add Enrollments top-level entry with pending-count badge, add Students top-level entry.

---

## 9. `/admin/courses` — Admin courses list

**Design:** `screens-admin.jsx` → `AdminCourses`
**Live:** `apps/frontend/src/app/admin/courses/page.tsx`
**Backend:** `GET /api/courses?limit=&cursor=` (admin sees all)

### Design intent
- PageHeader with "+ New course" action
- Filter row: Search input + "Status: All" dropdown + "Showing 6 of 8" count
- Table:
  - Title (bold h4)
  - Semesters (count)
  - Enrollments (count)
  - Status (EnrollmentBadge)
  - Updated
  - Actions (⋯ dropdown)

### Live reality
- Header + "New course" button (matches)
- No search, no status filter, no count
- Table:
  - Title + description (2-line)
  - Status badge
  - Updated (date only)
  - Edit → link

### Gaps
1. **Search input** — client-side filter over loaded page OR backend `?q=`
2. **Status filter** — backend `GET /api/courses` already accepts `?status=draft|published`. Wire a dropdown.
3. **"Showing X of Y" count** — same as 2.7
4. **Semesters count column** — add `semester_count` to course payload (same as 2.5)
5. **Enrollments count column** — `SELECT count(*) FROM enrollments WHERE course_id=$1 AND status='approved'`. Add to course payload as `enrollment_count`.
6. **⋯ dropdown menu** — currently a plain "Edit →" link. Expand to a dropdown with Edit / Duplicate / Archive / Delete. Requires a Popover/Dropdown primitive (use Radix UI, headless UI, or hand-rolled).

---

## 10. `/admin/courses/[courseId]` — Edit course

**Design:** `screens-admin.jsx` → `AdminCourseEdit`
**Live:** `apps/frontend/src/app/admin/courses/[courseId]/page.tsx` + `editor-client.tsx`
**Backend:** `GET /api/courses/:id`, `PATCH /api/courses/:id`, `PATCH /api/courses/:id/publish`, `DELETE /api/courses/:id`, `GET /api/courses/:id/semesters`, `DELETE /api/semesters/:id`

### Design intent
- Back link + "Edit course" eyebrow
- H1 title (with edit-ring styling suggesting inline editing) + status badge inline
- **2-column layout:**
  - Left (1fr) Details card: Title / Description / **Status radio buttons** (Draft / Published) / Save + Delete buttons
  - Right (400px) Semesters card: "+ Add" button + **draggable list with grip handles** and ⋯ menus per item

### Live reality
- Breadcrumb + status badge (good)
- Top nav row with "Enrollments" / "Announcements" / Publish-toggle / Delete buttons
- **Single-column stacked** layout
- Details card with Title + Description + "Save changes" button (published toggle is up top instead of inline)
- Semesters card below: "+ Add semester" text link + list with per-item "Remove" link
- **No drag-to-reorder**, no ⋯ menus

### Gaps
1. **2-column layout** — side-by-side details + semesters
2. **Status as radio buttons** — replace the "Publish/Unpublish" top button with inline radio buttons in the Details card. Keep the publish-validation error flow (no semesters / no youtube_url → 422).
3. **Drag-to-reorder semesters** — backend already supports `sort_order` on semesters. Use `react-dnd-kit` or `@dnd-kit/sortable`. On drop, PATCH each affected semester with new `sort_order`.
4. **⋯ menu per semester** — Edit / Duplicate / Delete options. Currently the inline Remove is OK as a v0.1 but a menu is richer.
5. **"Edit course" eyebrow** — add above the h1
6. **edit-ring styling** — subtle focus ring around the title suggesting you can click to edit inline. For v0.1 the separate Title field in the Details card is fine; skip inline-edit until later.

---

## 11. `/admin/courses/[courseId]/enrollments` — Review enrollments

**Design:** `screens-admin.jsx` → `AdminEnrollments`
**Live:** `apps/frontend/src/app/admin/courses/[courseId]/enrollments/page.tsx` + `enrollment-actions.tsx`
**Backend:** `GET /api/enrollments?course_id=&status=`, `PATCH /api/enrollments/:id`

### Design intent
- Breadcrumbs (PageHeader)
- **Tabs:** Pending (3) / Approved (42) / Rejected (1)
- **Bulk selection row:** checkbox "2 selected" + "Approve selected" + "Reject selected" buttons
- Table with avatar + name, email, requested, per-row Approve/Reject buttons

### Live reality
- Breadcrumb + h1 + description
- **Stacked sections** instead of tabs (Pending / Approved / Rejected, all on one page)
- **No bulk selection**
- Table: Student (name + email) / Requested / Status / Actions
- No avatar

### Gaps
1. **Tabs** — switch to tabs with counts. Client component with `useState`. Backend already filters by `?status=`. Fetch all three in parallel on initial load.
2. **Bulk selection** — checkbox column, "N selected" indicator, "Approve selected" / "Reject selected" buttons. Requires:
   - State management for selection set
   - Backend batch endpoint OR client loops N individual PATCH calls (pilot-scale OK, typical pending queue <10)
3. **Avatar in table** — `<Avatar>` component with initials fallback from `full_name` or email. Design uses 32x32 pill.
4. **Separate email column** — design has Student (name) / Email columns separated. Live stacks email under name. Design's way uses horizontal space better.

---

## 12. `/admin/assignments` — All submissions

**Design:** `screens-admin.jsx` → `AdminAssignments`
**Live:** `apps/frontend/src/app/admin/assignments/page.tsx` + `download-link.tsx`
**Backend:** `GET /api/assignments?course_id=&semester_id=&student_id=&cursor=&limit=`, `GET /api/assignments/:id/download`

### Design intent
- PageHeader
- Filter row: **Course dropdown**, **Semester dropdown**, Student **search** input
- Table: Student (avatar + name) / Course / Semester / File (icon + filename) / Submitted / Download

### Live reality
- PageHeader + description
- **No filter dropdowns**, **no search**
- Table: Student (name + email) / Course · Semester (stacked) / File (name + type) / Submitted / Download
- Download works (60s signed URL on click)
- Pagination link at bottom — good

### Gaps
1. **Course filter dropdown** — backend already accepts `?course_id=`. Populate with `GET /api/courses?limit=50`. Wire to query string.
2. **Semester filter dropdown** — requires a selected course to populate semesters. Chain: course selection → fetch semesters → populate dropdown. Backend `?semester_id=` already works.
3. **Student search** — backend doesn't support free-text student search yet. Cheapest path: filter loaded page client-side by name/email string. Real solution: add `?student_query=` to backend (ilike on profiles).
4. **Avatar in table** — `<Avatar>` with initials
5. **Two-column layout** for Course/Semester — design shows them as separate columns, live stacks them. Minor.

---

## 13. Announcements UI — NO DESIGN MOCKUP

The Edulearn design bundle predates the announcements scope addition. These pages exist in live code but have no mockup to compare against:

- `/admin/courses/[courseId]/announcements` — list
- `/admin/courses/[courseId]/announcements/new` — create
- `/admin/courses/[courseId]/announcements/[announcementId]` — edit
- Announcement cards in student `/courses/[courseId]` feed
- `/my-courses` right rail and unread badges
- `components/announcement-card.tsx` (shared)

### Recommendation

Commission matching Edulearn-style mockups for the announcement surfaces, OR accept the current design as the source of truth and port it back into the Edulearn design language (Fraunces display font on titles, ochre accent on pin indicator, warm-paper background, caption-uppercase-tracked "PINNED" eyebrow).

Current announcement UI uses the same tokens (bg-paper, border-line, text-muted, accent-600, font-display) as the rest of the app, so it's consistent with live design already. Matches DESIGN.md.

---

## 14. Fragment components (DropzoneStates, SemesterModal)

### DropzoneStates — 6 states per design

Listed under gap 4.6-4.11 above. Here's the full state matrix for reference:

| State | Visual | Trigger |
|---|---|---|
| Idle | Gray dashed border, Upload icon, "Drop PDF or DOCX" | Default |
| Dragging over | Accent-colored border + bg, Upload icon accent-600, "Release to upload · 1 file detected" | `onDragEnter` with file |
| Uploading | File row (icon + name + X cancel) + progress bar + "62% · 1.2 MB of 1.9 MB" | After `upload.start()` |
| Success | Green success-bg, CircleCheck, "Uploaded · Semester marked complete · submit another" | After register endpoint 201 |
| Error | Red danger-bg, X icon, reason + "try again" link | On any error |
| Empty/Toast | Toast message "Assignment submitted — semester marked complete" | Post-submit feedback |

### SemesterModal — MODAL vs PAGE

Design: `SemesterModal` is a MODAL overlay with title/description/YouTube URL fields + YouTube preview + Cancel/Save buttons.

Live: `app/admin/courses/[courseId]/semesters/new/page.tsx` is a dedicated PAGE.

**Call:** keep the page approach for v0.1 (modals are more complex state-wise and the page works fine). If you port to modal later, use a Dialog primitive (Radix UI) and render the same form inline.

---

## Priority order for re-implementation

Ordered by impact per unit of effort. Start at the top.

### Tier 1 — structural, high leverage (do first)
1. **TopNav** (three variants) — unlocks wayfinding on every page (0.1)
2. **Shared primitives** to `components/`: `CourseCard`, `EnrollmentBadge`, `StatCard`, `ProgressBar` (0.4)
3. **Icon set** (lucide-react) (0.3)

### Tier 2 — highest-visibility screens
4. **Landing hero + featured courses grid** (gaps 1.2, 1.4)
5. **Catalog 3-col grid + semester count on cards** (2.4, 2.5)
6. **SemesterViewer sidebar with all semesters + prev/next** (4.2, 4.3)
7. **Login/Register Google button first + missing Google on register** (6.1, 7.1)

### Tier 3 — admin polish
8. **Admin dashboard: correct stats + recent enrollments + recent assignments sections** (8.1, 8.4, 8.5)
9. **Admin courses table: search + status filter + semester/enrollment counts** (9.1, 9.2, 9.4, 9.5)
10. **Admin enrollments: tabs + bulk select** (11.1, 11.2)
11. **Admin assignments: course/semester filter dropdowns** (12.1, 12.2)

### Tier 4 — polish pass
12. **CourseDetail 2-column layout + locked semester list** (3.2, 3.7)
13. **SemesterViewer richer dropzone states** (4.6-4.10)
14. **My Courses tabs (if desired)** (5.2)
15. **Footer + About/Privacy/Terms placeholder pages** (0.2)
16. **Forgot password flow** (6.3)
17. **Course edit: 2-col layout + status radios + drag-to-reorder semesters** (10.1-10.3)
18. **Avatar component + use in all admin tables** (11.3, 12.4)

### Deferred to v0.2
- Course difficulty field (eyebrow metadata)
- Course body markdown (`.prose` content)
- Course estimated-hours field
- "Last viewed" metadata on my-courses cards (requires telemetry join)
- "Completed" tab on my-courses (requires percentage === 100 computation)
- Drag-to-reorder semesters (nice-to-have, manual sort order editing works)
- ⋯ dropdown menus (Edit/Duplicate/Delete)
- Announcements design mockups

---

## How to use this doc

Work through tiers 1-4 in order. Each numbered gap has:
- **The design source** (which file/component in `screens-*.jsx`)
- **The live file** to edit
- **The backend endpoint** already available (or a note if one needs to be added)
- **Specific implementation notes** for the change

When you finish a gap, tick it off in this file. Commit after each tier with
a message like `feat(design-port): Tier 2 — catalog + semester viewer`.

For gaps that require backend changes (adding `semester_count` to CoursePayload,
adding `/api/admin/stats`, etc.), do the backend work first in its own commit so
the frontend change is a clean one-commit front-end-only diff.
