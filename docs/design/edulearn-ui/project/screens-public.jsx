// Public screens: Landing, Course Catalog, Course Detail

const FEATURED = [
  { semesters: 6, title: 'Intro to React', desc: 'Learn hooks, state, and effects from the ground up. Build practical components.', status: 'published' },
  { semesters: 7, title: 'Advanced TypeScript', desc: 'Generics, conditional types, and type-level programming for real codebases.', status: 'published' },
  { semesters: 5, title: 'Node.js Mastery', desc: 'Async patterns, streams, and building production services that scale.', status: 'published' },
];

const CATALOG = [
  ...FEATURED,
  { semesters: 4, title: 'SQL for Engineers', desc: 'Query patterns, indexes, and how to reason about database performance.', status: 'published' },
  { semesters: 8, title: 'System Design Essentials', desc: 'Trade-offs in distributed systems — caching, consistency, and queues.', status: 'published' },
  { semesters: 6, title: 'Modern CSS', desc: 'Grid, subgrid, container queries, and the cascade layers you actually need.', status: 'published' },
];

// ── 1. Landing ──────────────────────────────────────────────
const Landing = () => (
  <div className="ab"><div className="ab-scroll" style={{ overflowY: 'auto', height: '100%' }}>
    <TopNav variant="public" />
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 40px 48px' }}>
      <div className="rule-accent" style={{ marginBottom: 20 }} />
      <div className="t-caption accent" style={{ marginBottom: 18 }}>Learn anything · self-paced</div>
      <h1 className="t-display" style={{ margin: '0 0 22px', maxWidth: 900 }}>
        Structured learning<br/>for curious minds.
      </h1>
      <p className="t-body-lg muted" style={{ maxWidth: 560, margin: '0 0 32px' }}>
        A focused, instructor-led platform with bite-sized modules, assignments, and progress tracking. No badges, no streaks — just good teaching.
      </p>
      <div className="row" style={{ gap: 12 }}>
        <button className="btn btn-primary btn-lg">Browse courses <Icons.ArrowRight size={16} /></button>
        <button className="btn btn-secondary btn-lg">Create account</button>
      </div>
    </div>

    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 40px 64px' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <h2 className="t-h2" style={{ margin: 0 }}>Featured courses</h2>
        <a className="ulink t-body-sm">View all →</a>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {FEATURED.map((c, i) => <CourseCard key={i} {...c} />)}
      </div>
    </div>

    <Footer />
  </div></div>
);

// ── 2. Catalog ──────────────────────────────────────────────
const Catalog = () => (
  <div className="ab"><div className="ab-scroll" style={{ overflowY: 'auto', height: '100%' }}>
    <TopNav variant="student" active="catalog" />
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 40px' }}>
      <PageHeader
        title="Courses"
        description="Browse every published course. Enroll anytime — approval is usually within a day."
      />
      <div className="row" style={{ gap: 12, marginBottom: 28 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Icons.Search size={16} className="muted" style={{ position: 'absolute', left: 12, top: 12 }} />
          <input className="input" style={{ paddingLeft: 36 }} placeholder="Search courses…" />
        </div>
        <button className="btn btn-secondary">Sort: Newest <Icons.ChevronDown size={14} /></button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {CATALOG.map((c, i) => <CourseCard key={i} {...c} hover={i === 1} />)}
      </div>
      <div style={{ textAlign: 'center', marginTop: 36 }}>
        <button className="btn btn-secondary">Load more</button>
        <div className="muted t-body-sm" style={{ marginTop: 10 }}>Showing 6 of 18</div>
      </div>
    </div>
  </div></div>
);

// ── 3. Course Detail (not enrolled) ─────────────────────────
const CourseDetail = ({ enrollState = 'not-enrolled' }) => {
  const semesters = [
    { n: '01', t: 'Hooks Fundamentals', d: 'useState, useEffect, and the rules of hooks.' },
    { n: '02', t: 'State Management', d: 'Lifting state up, context, and reducer patterns.' },
    { n: '03', t: 'Effects & Lifecycle', d: 'Cleanup, dependencies, and avoiding infinite loops.' },
    { n: '04', t: 'Forms & Validation', d: 'Controlled inputs, react-hook-form, and zod.' },
    { n: '05', t: 'Data Fetching', d: 'Tanstack Query, caching, and mutations.' },
    { n: '06', t: 'Composition Patterns', d: 'Render props, compound components, and slots.' },
  ];
  return (
    <div className="ab"><div className="ab-scroll" style={{ overflowY: 'auto', height: '100%' }}>
      <TopNav variant="student" active="catalog" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 40px 64px' }}>
        <a className="ulink t-body-sm row" style={{ gap: 6, marginBottom: 24 }}>
          <Icons.ChevronLeft size={14}/> Back to courses
        </a>
        <div className="t-caption accent" style={{ marginBottom: 12 }}>6 semesters · intermediate</div>
        <h1 className="t-display-sm" style={{ margin: '0 0 16px', maxWidth: 820 }}>Intro to React</h1>
        <p className="t-body-lg muted" style={{ maxWidth: 720, margin: 0 }}>
          Learn hooks, state, and effects from the ground up. By the end you'll have built three small apps and understand the mental model behind modern React.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 40, marginTop: 44 }}>
          <div>
            <h3 className="t-h2" style={{ margin: '0 0 16px' }}>About this course</h3>
            <div className="prose" style={{ maxWidth: '65ch' }}>
              <p className="lead">This isn't a tutorial. It's a sequenced curriculum built by practicing engineers — every semester is a self-contained lesson with a video, written notes, and a graded assignment.</p>
              <p>You'll start with the fundamentals: how components render, how state flows, and why useEffect behaves the way it does. We then move into patterns you'll use every day — composition, data fetching, and forms.</p>
              <p>Each assignment is reviewed asynchronously by instructors. Expect honest, detailed feedback within three business days.</p>
            </div>
          </div>

          <div>
            <div className="card" style={{ padding: 22, position: 'sticky', top: 24 }}>
              <div className="t-caption muted" style={{ marginBottom: 14 }}>Enrollment</div>
              {enrollState === 'not-enrolled' && (
                <button className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                  <Icons.UserPlus size={16} /> Enroll now
                </button>
              )}
              {enrollState === 'pending' && (
                <div>
                  <EnrollmentBadge status="pending" />
                  <div className="t-body-sm muted" style={{ marginTop: 12, lineHeight: 1.5 }}>
                    Your request is with an instructor. We'll email you the moment it's reviewed — usually within a day.
                  </div>
                </div>
              )}
              {enrollState === 'approved' && (
                <button className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                  Continue course <Icons.ArrowRight size={16} />
                </button>
              )}
              <div className="sep" style={{ margin: '20px 0' }} />
              <div className="col" style={{ gap: 10 }}>
                <div className="row t-body-sm muted" style={{ gap: 10 }}><Icons.Layers size={15}/> 6 semesters, ~18 hours</div>
                <div className="row t-body-sm muted" style={{ gap: 10 }}><Icons.PlayCircle size={15}/> Video lessons</div>
                <div className="row t-body-sm muted" style={{ gap: 10 }}><Icons.FileText size={15}/> PDF / DOCX assignments</div>
                <div className="row t-body-sm muted" style={{ gap: 10 }}><Icons.UserCheck size={15}/> Instructor feedback</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 56 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
            <h3 className="t-h2" style={{ margin: 0 }}>Semesters</h3>
            <div className="muted t-body-sm">Enroll to unlock</div>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {semesters.map((s, i) => (
              <div key={i} className={`sem-row ${enrollState !== 'approved' ? 'locked' : ''}`}>
                <div className="sem-num tabular">{s.n}</div>
                <div>
                  <div className="t-h4">{s.t}</div>
                  <div className="t-body-sm muted" style={{ marginTop: 2 }}>{s.d}</div>
                </div>
                {enrollState === 'approved' ? (
                  i === 0 ? <span className="badge badge-success"><Icons.Check size={11}/> Completed</span>
                          : <span className="muted t-body-sm tabular">12 min</span>
                ) : (
                  <div className="muted row" style={{ gap: 6, fontSize: 13 }}><Icons.Lock size={14}/> Enroll to view</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div></div>
  );
};

Object.assign(window, { Landing, Catalog, CourseDetail });
