# DESIGN.md — Edulearn Visual System

Design system of record for the OTLS frontend. Extracted from the Claude Design handoff bundle at `docs/design/edulearn-ui/` (received 2026-04-22). The bundle is the authoritative visual source; this file is the distilled reference for implementation.

## Aesthetic

**Editorial Academic.** Warm paper-off-white background, serif display (Fraunces) paired with a clean geometric sans (Geist), single ochre accent. Books-and-libraries feel, not SaaS-dashboard feel. Generous line-height, letter-spacing pulled tight on large display sizes, tabular nums on everything countable.

Brand: **Edulearn.** (wordmark with an ochre period as the design mark).

## Brand Tokens (copy these verbatim into the Tailwind config)

### Colors

| Token | Hex | Use |
|---|---|---|
| `paper` | `#FAF8F3` | Page background (warm off-white) |
| `surface` | `#FFFFFF` | Card/panel fill |
| `ink` | `#1C1917` | Primary text |
| `muted` | `#57534E` | Secondary text |
| `subtle` | `#A8A29E` | Tertiary text, placeholders |
| `line` | `#E7E5E4` | Borders, dividers |
| `line-soft` | `#F0EEE9` | Faint rules, stripe patterns |
| `accent-50` | `#FEF7EC` | Active sidebar item bg |
| `accent-100` | `#FDECCB` | Avatar bg |
| `accent-500` | `#D97706` | (reserved) |
| `accent-600` | `#B45309` | **Primary action**, focus ring, progress fill, underline active tab |
| `accent-700` | `#92400E` | Hover primary, sidebar active text |
| `accent-900` | `#451A03` | (reserved) |

Semantic pairs (bg / fg / border):

| Status | bg | fg | border |
|---|---|---|---|
| success | `#ECFDF5` | `#065F46` | `#A7F3D0` |
| warning | `#FEF3C7` | `#92400E` | `#FDE68A` |
| danger | `#FEF2F2` | `#991B1B` | `#FECACA` |
| info | `#EFF6FF` | `#1E40AF` | `#BFDBFE` |

### Typography

Fonts (Google Fonts, preconnect both):
- **Display**: `Fraunces` (opsz 9..144, weights 400/500/600/700) — `ui-serif, Georgia, serif` fallback
- **Sans**: `Geist` (400/500/600/700) — `ui-sans-serif, system-ui, sans-serif` fallback
- **Mono**: `Geist Mono` (400/500) — `ui-monospace, SFMono-Regular, monospace` fallback

Scale (use Fraunces for display, Geist for everything else):

| Class | Family | Size / line-height | Weight | Tracking |
|---|---|---|---|---|
| `t-display` | Fraunces | 56 / 1.03 | 500 | −0.025em |
| `t-display-sm` | Fraunces | 44 / 1.05 | 500 | −0.02em |
| `t-h1` | Fraunces | 40 / 1.1 | 500 | −0.018em |
| `t-h1-sm` | Fraunces | 32 / 1.15 | 500 | −0.01em |
| `t-h2` | Fraunces | 28 / 1.2 | 500 | −0.008em |
| `t-h3` | Fraunces | 22 / 1.25 | 500 | — |
| `t-h4` | Geist | 17 / 1.4 | 600 | −0.005em |
| `t-body-lg` | Geist | 18 / 1.65 | 400 | — |
| `t-body` | Geist | 15 / 1.6 | 400 | — |
| `t-body-sm` | Geist | 13.5 / 1.5 | 400 | — |
| `t-caption` | Geist | 11 / 1.4 | 600 | 0.09em, UPPERCASE |
| stat number | Fraunces | 36 / 1 | 500 | tabular-nums |
| brand mark | Fraunces | 20 / — | 600 | −0.01em |

Tabular-nums utility (`.tabular`) is applied to any numeric cell — enrollment counts, progress %, stat cards, table rows.

### Spacing, Radius, Shadow

- **Radius**: buttons `6px`, inputs `6px`, cards `8px`, modals `12px`, progress/badge pills `999px`, dropzone `10px`, stat card `10px`.
- **Border**: `1px solid var(--line)` is the default; dashed `2px` for dropzone.
- **Shadow**: modals `0 10px 32px -12px rgba(0,0,0,0.2)`, toasts `0 10px 32px -12px rgba(0,0,0,0.35)`. No shadows on cards — flat with line borders.
- **Focus ring**: `outline: 2px solid var(--accent-600); outline-offset: 2px` on buttons; `border-color: accent-600 + box-shadow: 0 0 0 3px rgba(180,83,9,0.15)` on inputs.

## Component Kit

See `docs/design/edulearn-ui/project/parts.jsx` for reference implementations. Rebuild these as React components in `apps/frontend/src/components/` using shadcn/ui primitives + the tokens above.

### Primitives

| Component | Height / size | Variants |
|---|---|---|
| `Button` | 40 (default), 48 (lg), 32 (sm), 36×36 (icon) | `primary` (ochre fill), `secondary` (surface + line border), `ghost` (transparent), `danger` (dark red), `link` (underline on hover, 4px underline-offset) |
| `Input` | 40 | default, textarea (multiline, min-height 80) |
| `Card` | — | `padding: 22`, line border, 8px radius, surface bg; `hover` state flips bg to paper |
| `Badge` | pill | `success` / `warning` / `danger` / `info` / `neutral`, optional 6×6 `.status-dot` prefix |
| `Progress` | 4px tall | line bg, ochre fill, paired with right-aligned tabular % label |
| `Tabs` | — | underline active indicator in ochre, `.count` subtle after label |
| `Avatar` | 32 (default), 40 (lg) | accent-100 bg, accent-700 text, line border, initials weight 600 |
| `Checkbox` / `Radio` | 16×16 | off = subtle border; on = ochre fill/dot |

### Domain-specific

| Component | Notes |
|---|---|
| `Brand` | `Edulearn<span class="dot">.</span>` — the period is ochre (accent-600) |
| `TopNav` | 3 variants: `public` (brand + login/create buttons right), `student` (brand + "Courses"/"My Courses" linklist + search + avatar), `admin` (56px tall, brand + Admin badge + ⌘K kbd + avatar) |
| `AdminSidebar` | 240px wide, paper bg, sections `Main` / `Account`, active item uses `accent-50` bg + `accent-700` text, pending-enrollments count shown as inline warning badge |
| `PageHeader` | breadcrumbs (caption, uppercase, › separator), optional eyebrow (accent caption), h1 display + muted description, right-aligned action slot |
| `CourseCard` | "N semesters" caption → h3 title → 2-line clamped description → 1px separator → status badge + "View →" link |
| `EnrollmentBadge` | status → badge mapping: `pending→warning`, `approved→success`, `rejected→danger`, `published→success`, `draft→warning`, `completed→success` |
| `ProgressBar` | labelled, tabular %, right-aligned |
| `StatCard` | caption label → Fraunces 36px value → small delta line with TrendingUp icon (flipped if down) |
| `EmptyState` | centered 56×20 padding, subtle 40px icon, h3 title, muted body (max 420), action |
| `Toast` | dark ink bg, white text, success-dot icon prefix |
| `Dropzone` | dashed 2px line, 36px padding, paper bg → `accent-600` solid border + `accent-50` bg on drag-over, danger border + bg on error |
| `VideoPlaceholder` | 16/9, `#0f0d0c` bg, radial ochre glow gradient overlay + 12px diagonal hairline stripes, 72×72 white play button, meta strip bottom |
| `Image placeholder` | diagonal 135deg stripe pattern in line-soft/paper with mono caption |
| `Modal` | 480px wide, 12px radius, blurred 40% ink backdrop |
| `Kbd` | mono 11px, line border, paper bg |

### Density

Admin tables use 12/16 header padding, 14/16 row padding, 10.5px uppercase column titles. Semester rows in course editor use a three-column grid `56px 1fr auto` with 18/20 padding, large Fraunces semester number on the left, grip-drag affordance on hover.

## Screen Inventory (18 screens)

From the pan/zoom design canvas in `design-canvas.jsx` + screen files:

**Public** (`screens-public.jsx`)
1. Landing — hero + value prop + course highlights
2. Course catalog — grid of `CourseCard`
3. Course detail — not-enrolled state (enroll CTA visible)
4. Course detail — pending state (yellow badge, content locked)
5. Course detail — rejected state (red banner)

**Auth** (`screens-auth.jsx`)
6. Login
7. Register (with password strength indicator: weak/ok/strong, 3-segment bar)

**Student** (`screens-student.jsx`)
8. My Courses — progress-bar-per-course layout
9. Semester viewer — YouTube embed + description + assignment panel
10. Assignment upload — idle dropzone
11. Assignment upload — drag-over state
12. Assignment upload — uploading / uploaded
13. Assignment upload — error

**Admin** (`screens-admin.jsx`)
14. Dashboard — stat cards row + recent activity
15. Courses list — table with status badges
16. Course editor — title/description + reorderable semester list + publish action
17. Enrollments — pending-review tab + approve/reject row actions
18. Assignments — submissions table with Download action → signed URL
19. Semester modal — title/description/YouTube URL + validation

(The README counts 18; the screen list resolves to 19 states once the dropzone has four. Treat it as ~18 unique screens, some with state variants.)

## Patterns & Rules

- **Enrollment state drives UI gates** — the CTA on course detail, the lock state of semester rows, and the dropzone availability all read from `enrollments.status`. Match these badge/text pairings exactly against the blueprint's state machine (§15.1) and the `EnrollmentBadge` map above.
- **Progress is always `completed / total` with a percent** — never a count alone. The bar and label always appear together.
- **Drafts never show to students** — course cards with `draft` status only appear in the admin list view.
- **Admin sidebar's "Enrollments" badge shows the pending count** — live-pull when the page loads; no polling in v1.
- **YouTube embed is the only video surface** — the `video-ph` placeholder in the HTML is swapped for a real `<iframe>` at implementation time. No self-hosted video per blueprint constraint §4.1.
- **Dropzone accepts PDF/DOCX, 25 MB max** (blueprint §14.1). Enforce client-side for UX; backend is source of truth.
- **Signed URLs are 60s TTL** for assignment download (blueprint §14.5) — the UI triggers a fetch immediately on click, no copy-URL affordance.
- **Tabular numerals on every count** — enrollment counts, stat values, progress %, table columns with counts.

## Implementation Mapping (design → stack)

The OTLS frontend is Next.js 14 App Router + Tailwind + shadcn/ui per `docs/blueprint.md` §8. Map the design like so:

| Design artifact | Next.js implementation |
|---|---|
| CSS tokens (`:root` vars) | Extend `tailwind.config.ts` theme — add `paper`, `ink`, `muted`, `subtle`, `line`, `accent-{50..900}` and semantic color keys |
| Font stack | `next/font/google` for Fraunces + Geist + Geist Mono; CSS var names `--font-display`, `--font-sans`, `--font-mono`; apply via Tailwind `fontFamily` extend |
| Typography classes (`t-display`, `t-h1`, etc.) | Tailwind `@apply` on a small set of utility classes in `globals.css` — avoids re-implementing each as a component |
| `parts.jsx` components | Direct 1:1 port into `apps/frontend/src/components/` (Brand, TopNav, AdminSidebar, CourseCard, EnrollmentBadge, ProgressBar, StatCard, EmptyState, Toast) |
| shadcn/ui usage | Button, Input, Card, Badge, Progress, Tabs, Avatar, Dialog (modal), Dropdown, Table, Toast (sonner) — themed via the tokens above. Don't import shadcn defaults; wire each through the `paper/ink/accent` palette. |
| `screens-*.jsx` | Each maps to a Next.js route segment under `app/(public)/`, `app/(auth)/`, `app/(student)/`, `app/(admin)/` (blueprint §8.1). JSX is reference composition — recreate the layout, don't port the markup verbatim. |
| Dropzone | Build on `react-dropzone` (blueprint §20); match visual states idle/drag/uploading/error from `screens-student.jsx` |
| Video placeholder | Replace with `<iframe src="https://www.youtube.com/embed/{id}" />` at `aspect-video` |

## Non-Goals

- Do not render or screenshot the handoff HTML files (per the bundle's own README).
- Do not copy the prototype's React+Babel-UMD loading pattern — that's a design-time artifact. Production uses Next.js.
- Do not preserve the pan/zoom design canvas in production — it's a showcase.

## Announcement components (v0.1 additions — from /plan-design-review 2026-04-22)

These extend the component kit. Not in the handoff bundle's `parts.jsx` — new design work for OTLS v0.1's announcements feature. Build them in the same vocabulary.

### Pinned announcement card

A standard `.card` with `border-top: 2px solid var(--accent-600)` (other sides remain 1px `--line`). No background tint. Full body rendered (no clamp). Footer shows "Pinned by {admin}, {relative date}" in caption style. One per course, enforced by partial unique index.

### Non-pinned announcement card

Standard `.card` with 16px internal padding (down from course-card 22px, reflecting compact feed density). 3-line body clamp with fade-out mask at the bottom edge, "Read more" button bottom-right expands inline. WhatsApp share button (28×28, ghost bg, `--accent-50` on hover, Lucide `MessageCircle` icon 16px) top-right corner of card.

### Unread count badge (`.badge-unread`)

New Badge variant. Absolute position `top: -6px; right: -6px` on the parent course card. 20×20px desktop, 18×18px mobile. `background: var(--accent-600); color: #fff; font: 600 11px Geist; font-variant-numeric: tabular-nums;`. Displays `1..9`, then `9+`. Invisible 44×44 tap target via ::before pseudo-element to meet a11y minimum. `aria-label="{N} unread"` on the parent link.

### Audit timeline item

Left rail with a 6px colored dot keyed to event type:
- CREATE → `var(--success-fg)` (#065F46)
- UPDATE → `var(--warning-fg)` (#92400E)
- DELETE → `var(--danger-fg)` (#991B1B)

16px gap from rail to content. Content column: caption (11px uppercase, `--muted`) showing event type + timestamp, then title, then a "Show diff" collapsible region that reveals the JSON diff in Geist Mono 12px on `--paper` background. Default collapsed.

### Announcement post modal (mobile drawer)

Desktop: existing 480px modal pattern. Mobile (< 768px): becomes a full-screen bottom drawer with sticky button bar at the footer. Title + body + pin-checkbox stacked vertically. The pin checkbox has a dynamic helper text beneath it (13px Geist, `--muted`, `margin-top: 4px`):

- If something is currently pinned: `"Pinning this will unpin '{current pinned title}'."`
- If nothing is pinned: `"No announcement currently pinned."`

Submit button disabled + inline spinner during save. Inline error displays above the button group on validation failure or pin conflict (409).

### Unread badge math (service query)

Not a visual component, but the contract for the server-side query used by the course cards:

```sql
SELECT e.course_id,
       count(a.id) FILTER (
         WHERE e.last_announcement_read_at IS NULL
            OR a.created_at > e.last_announcement_read_at
       ) AS unread_count
  FROM public.enrollments e
  LEFT JOIN public.announcements a ON a.course_id = e.course_id
 WHERE e.student_id = auth.uid() AND e.status = 'approved'
 GROUP BY e.course_id;
```

One query, GROUP BY, no N+1 (per /plan-eng-review Performance finding).

## Where the source lives

- **Bundle**: `docs/design/edulearn-ui/` (preserved as-received)
- **Primary HTML**: `docs/design/edulearn-ui/project/Edulearn UI.html`
- **Component reference**: `docs/design/edulearn-ui/project/parts.jsx`
- **Screen compositions**: `docs/design/edulearn-ui/project/screens-{public,auth,student,admin}.jsx`
- **Design chat (intent)**: `docs/design/edulearn-ui/chats/chat1.md`
