// Student screens: My Courses, Semester Viewer

const MyCourses = () => {
  const [tab, setTab] = React.useState('progress');
  return (
    <div className="ab"><div className="ab-scroll" style={{ overflowY: 'auto', height: '100%' }}>
      <TopNav variant="student" active="my" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 40px' }}>
        <PageHeader title="My Courses" description="Pick up where you left off, or revisit completed work." />

        <div className="tabs" style={{ marginBottom: 24 }}>
          <div className={`tab ${tab === 'progress' ? 'active' : ''}`} onClick={() => setTab('progress')}>In Progress <span className="count">3</span></div>
          <div className={`tab ${tab === 'completed' ? 'active' : ''}`} onClick={() => setTab('completed')}>Completed <span className="count">1</span></div>
          <div className={`tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>Pending <span className="count">2</span></div>
        </div>

        {tab === 'progress' && (
          <div className="col" style={{ gap: 14 }}>
            {[
              { t: 'Intro to React', done: 4, total: 6, pct: 67 },
              { t: 'Advanced TypeScript', done: 1, total: 7, pct: 15 },
              { t: 'Modern CSS', done: 3, total: 6, pct: 50 },
            ].map((c, i) => (
              <div key={i} className="card" style={{ padding: 22 }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h3 className="t-h3" style={{ margin: 0 }}>{c.t}</h3>
                  <a className="ulink t-body-sm row" style={{ gap: 4 }}>Continue <Icons.ArrowRight size={14} /></a>
                </div>
                <div style={{ margin: '14px 0 10px' }}><ProgressBar value={c.pct} /></div>
                <div className="t-body-sm muted tabular">{c.done} of {c.total} semesters completed · last viewed 2 days ago</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'completed' && (
          <div className="col" style={{ gap: 14 }}>
            <div className="card" style={{ padding: 22 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <h3 className="t-h3" style={{ margin: 0 }}>HTML & Accessibility</h3>
                  <div className="t-body-sm muted" style={{ marginTop: 4 }}>Finished · Mar 18, 2026</div>
                </div>
                <span className="badge badge-success"><Icons.Check size={11} /> Completed</span>
              </div>
            </div>
          </div>
        )}

        {tab === 'pending' && (
          <div className="col" style={{ gap: 14 }}>
            {['Node.js Mastery', 'System Design Essentials'].map((t, i) => (
              <div key={i} className="card" style={{ padding: 22 }}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <h3 className="t-h3" style={{ margin: 0 }}>{t}</h3>
                    <div className="t-body-sm muted" style={{ marginTop: 4 }}>Requested 2 days ago · awaiting instructor review</div>
                  </div>
                  <EnrollmentBadge status="pending" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div></div>
  );
};

const SemesterViewer = () => {
  const sems = [
    { n: 1, t: 'Hooks Fundamentals', state: 'done' },
    { n: 2, t: 'State Management', state: 'current' },
    { n: 3, t: 'Effects & Lifecycle' },
    { n: 4, t: 'Forms & Validation' },
    { n: 5, t: 'Data Fetching' },
    { n: 6, t: 'Composition Patterns' },
  ];
  return (
    <div className="ab"><div className="ab-scroll" style={{ overflowY: 'auto', height: '100%' }}>
      <TopNav variant="student" active="my" />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 40px 64px' }}>
        <a className="ulink t-body-sm row" style={{ gap: 6, marginBottom: 20 }}>
          <Icons.ChevronLeft size={14}/> Intro to React
        </a>
        <div className="t-caption accent" style={{ marginBottom: 10 }}>Semester 02</div>
        <h1 className="t-h1" style={{ margin: '0 0 32px' }}>State Management</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 32 }}>
          <div>
            <div className="video-ph">
              <div className="play"><Icons.Play size={26} /></div>
              <div className="meta"><span>youtube.com · State Management in React</span><span>14:32</span></div>
            </div>

            <h3 className="t-h2" style={{ margin: '32px 0 14px' }}>About this semester</h3>
            <div className="prose" style={{ maxWidth: '65ch' }}>
              <p>State is the heart of any React app — and the source of almost every bug. In this semester we'll look at where state <em>belongs</em>, when to lift it, when to push it down, and when to reach for context.</p>
              <p>We'll rebuild a small todo app four times, each version solving the same problem with a different state strategy. By the end you'll have a clear sense of the trade-offs.</p>
              <h3>What you'll build</h3>
              <p>A collaborative-style task list with optimistic updates, persistence, and a reducer-backed undo stack.</p>
            </div>

            <div className="sep" style={{ margin: '40px 0 24px' }} />
            <h3 className="t-h2" style={{ margin: '0 0 16px' }}>Assignment</h3>
            <div className="dropzone">
              <Icons.Upload size={32} className="muted" />
              <div className="t-h4" style={{ margin: '14px 0 6px' }}>Drop your PDF or DOCX here</div>
              <div className="muted t-body-sm">or <a className="ulink">click to browse</a> · max 25 MB</div>
            </div>

            <div style={{ marginTop: 24 }}>
              <div className="t-caption muted" style={{ marginBottom: 10 }}>Previously submitted</div>
              <div className="card" style={{ padding: '14px 18px' }}>
                <div className="row">
                  <Icons.FileText size={17} className="muted" />
                  <div className="grow">
                    <div className="t-body">homework-1.pdf</div>
                    <div className="t-body-sm muted">Submitted 3 days ago · 1.2 MB</div>
                  </div>
                  <button className="btn btn-ghost btn-sm"><Icons.Download size={15} /></button>
                </div>
              </div>
            </div>

            <div className="row" style={{ justifyContent: 'space-between', marginTop: 40 }}>
              <button className="btn btn-secondary"><Icons.ChevronLeft size={14}/> Previous</button>
              <button className="btn btn-secondary">Next semester <Icons.ChevronRight size={14}/></button>
            </div>
          </div>

          {/* sidebar */}
          <div style={{ position: 'sticky', top: 24, alignSelf: 'start' }}>
            <div className="t-caption muted" style={{ marginBottom: 10 }}>Course</div>
            <div className="card" style={{ overflow: 'hidden' }}>
              {sems.map((s) => {
                const active = s.state === 'current';
                return (
                  <div key={s.n} style={{
                    display: 'grid', gridTemplateColumns: '28px 1fr 18px',
                    alignItems: 'center', gap: 10, padding: '12px 14px',
                    borderBottom: '1px solid var(--line)',
                    background: active ? 'var(--accent-50)' : 'transparent',
                    color: active ? 'var(--accent-700)' : 'var(--ink)',
                    borderLeft: active ? '2px solid var(--accent-600)' : '2px solid transparent',
                  }}>
                    <span className="tabular t-body-sm muted" style={{ color: active ? 'var(--accent-600)' : 'var(--muted)' }}>
                      {String(s.n).padStart(2, '0')}
                    </span>
                    <span className="t-body-sm" style={{ fontWeight: active ? 600 : 400 }}>{s.t}</span>
                    {s.state === 'done' && <Icons.Check size={14} style={{ color: 'var(--success-fg)' }} />}
                    {active && <Icons.Dot size={14} />}
                  </div>
                );
              })}
              <div style={{ padding: '14px 14px 16px' }}>
                <ProgressBar value={33} />
                <div className="t-body-sm muted tabular" style={{ marginTop: 6 }}>2 of 6 complete</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div></div>
  );
};

Object.assign(window, { MyCourses, SemesterViewer });
