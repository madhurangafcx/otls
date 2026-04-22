// Admin screens: Dashboard, Courses list, Course edit, Enrollments, Assignments

const AdminShell = ({ active, children }) => (
  <div className="ab">
    <TopNav variant="admin" />
    <div style={{ display: 'flex', height: 'calc(100% - 56px)' }}>
      <AdminSidebar active={active} />
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 40px' }}>
          {children}
        </div>
      </div>
    </div>
  </div>
);

const AdminDashboard = () => (
  <AdminShell active="dashboard">
    <PageHeader title="Dashboard" description="Activity across every course in the last 30 days." />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 40 }}>
      <StatCard label="Students" value="142" delta="+12 this week" up />
      <StatCard label="Courses" value="8" delta="1 in draft" />
      <StatCard label="Pending enrollments" value="5" delta="Review now" />
      <StatCard label="Submissions" value="34" delta="+8 today" up />
    </div>

    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
      <h3 className="t-h2" style={{ margin: 0 }}>Recent enrollment requests</h3>
      <a className="ulink t-body-sm">View all →</a>
    </div>
    <div className="card" style={{ overflow: 'hidden', marginBottom: 36 }}>
      {[
        { avatar: 'JD', name: 'Jane Doe', email: 'jane@school.edu', course: 'Intro to React', when: '2h ago' },
        { avatar: 'JS', name: 'John Smith', email: 'john@school.edu', course: 'Advanced TypeScript', when: '5h ago' },
        { avatar: 'PR', name: 'Priya Raj', email: 'priya@school.edu', course: 'Modern CSS', when: '1d ago' },
      ].map((r, i) => (
        <div key={i} className="row" style={{ padding: '16px 20px', borderBottom: i < 2 ? '1px solid var(--line)' : 'none', gap: 14 }}>
          <div className="avatar avatar-lg">{r.avatar}</div>
          <div className="grow">
            <div className="t-h4">{r.name} <span className="muted" style={{ fontWeight: 400 }}>· {r.course}</span></div>
            <div className="t-body-sm muted">{r.email} · requested {r.when}</div>
          </div>
          <button className="btn btn-primary btn-sm"><Icons.Check size={13}/> Approve</button>
          <button className="btn btn-secondary btn-sm">Reject</button>
        </div>
      ))}
    </div>

    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
      <h3 className="t-h2" style={{ margin: 0 }}>Recent assignments</h3>
      <a className="ulink t-body-sm">View all →</a>
    </div>
    <div className="card" style={{ overflow: 'hidden' }}>
      <table className="tbl">
        <thead><tr><th>Student</th><th>Course</th><th>Semester</th><th>File</th><th>Submitted</th><th></th></tr></thead>
        <tbody>
          {[
            ['Jane Doe', 'Intro to React', '02 · State Management', 'hw1.pdf', '12 min ago'],
            ['John Smith', 'Advanced TS', '01 · Types 101', 'assignment.docx', '1h ago'],
            ['Priya Raj', 'Modern CSS', '03 · Grid Mastery', 'layout.pdf', '3h ago'],
          ].map((r, i) => (
            <tr key={i}>
              <td>{r[0]}</td><td className="muted">{r[1]}</td><td className="muted">{r[2]}</td>
              <td><span className="row" style={{ gap: 6 }}><Icons.FileText size={14} className="muted"/>{r[3]}</span></td>
              <td className="muted">{r[4]}</td>
              <td style={{ textAlign: 'right' }}><button className="btn btn-ghost btn-sm"><Icons.Download size={14}/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </AdminShell>
);

const AdminCourses = () => (
  <AdminShell active="courses">
    <PageHeader
      title="Courses"
      description="Every course on the platform. Click a row to edit."
      action={<button className="btn btn-primary"><Icons.Plus size={15}/> New course</button>}
    />
    <div className="row" style={{ gap: 12, marginBottom: 20 }}>
      <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
        <Icons.Search size={15} className="muted" style={{ position: 'absolute', left: 12, top: 12 }} />
        <input className="input" style={{ paddingLeft: 34 }} placeholder="Search courses…" />
      </div>
      <button className="btn btn-secondary">Status: All <Icons.ChevronDown size={14}/></button>
      <div className="grow" />
      <span className="muted t-body-sm">Showing 6 of 8</span>
    </div>
    <div className="card" style={{ overflow: 'hidden' }}>
      <table className="tbl">
        <thead><tr><th>Title</th><th>Semesters</th><th>Enrollments</th><th>Status</th><th>Updated</th><th></th></tr></thead>
        <tbody>
          {[
            ['Intro to React', 6, 42, 'published', '2d ago'],
            ['Advanced TypeScript', 7, 28, 'published', '5d ago'],
            ['Node.js Mastery', 5, 17, 'draft', '1d ago'],
            ['Modern CSS', 6, 31, 'published', '1w ago'],
            ['SQL for Engineers', 4, 12, 'published', '2w ago'],
            ['System Design', 8, 0, 'draft', '3h ago'],
          ].map((r, i) => (
            <tr key={i} className={i === 1 ? 'hover' : ''}>
              <td><span className="t-h4">{r[0]}</span></td>
              <td className="tabular">{r[1]}</td>
              <td className="tabular muted">{r[2]}</td>
              <td><EnrollmentBadge status={r[3]} /></td>
              <td className="muted">{r[4]}</td>
              <td style={{ textAlign: 'right' }}><button className="btn btn-ghost btn-sm"><Icons.More size={16}/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </AdminShell>
);

const AdminCourseEdit = () => (
  <AdminShell active="courses">
    <a className="ulink t-body-sm row" style={{ gap: 6, marginBottom: 16 }}>
      <Icons.ChevronLeft size={14}/> Back to courses
    </a>
    <div className="t-caption muted" style={{ marginBottom: 8 }}>Edit course</div>
    <div className="row" style={{ gap: 10, alignItems: 'baseline', marginBottom: 28 }}>
      <h1 className="edit-ring t-h1" style={{ margin: 0 }}>Intro to React</h1>
      <EnrollmentBadge status="published" />
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 28 }}>
      <div className="card" style={{ padding: 24 }}>
        <div className="t-caption muted" style={{ marginBottom: 14 }}>Details</div>
        <div className="col" style={{ gap: 16 }}>
          <div>
            <label className="t-body-sm" style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Title</label>
            <input className="input" defaultValue="Intro to React" />
          </div>
          <div>
            <label className="t-body-sm" style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Description</label>
            <textarea className="input" rows={5} defaultValue="Learn hooks, state, and effects from the ground up. By the end you'll have built three small apps and understand the mental model behind modern React." />
          </div>
          <div>
            <label className="t-body-sm" style={{ fontWeight: 500, display: 'block', marginBottom: 10 }}>Status</label>
            <div className="row" style={{ gap: 20 }}>
              <label className="row" style={{ gap: 8, cursor: 'pointer' }}><span className="radio" /><span className="t-body-sm">Draft</span></label>
              <label className="row" style={{ gap: 8, cursor: 'pointer' }}><span className="radio on" /><span className="t-body-sm">Published</span></label>
            </div>
          </div>
        </div>
        <div className="sep" style={{ margin: '22px 0' }} />
        <div className="row" style={{ gap: 10 }}>
          <button className="btn btn-primary">Save changes</button>
          <button className="btn btn-ghost" style={{ color: 'var(--danger-fg)' }}>Delete course</button>
        </div>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="t-caption muted">Semesters · 6</div>
          <button className="btn btn-ghost btn-sm"><Icons.Plus size={13}/> Add</button>
        </div>
        {['Hooks Fundamentals','State Management','Effects & Lifecycle','Forms & Validation','Data Fetching','Composition Patterns'].map((t, i) => (
          <div key={i} className="row" style={{ padding: '10px 4px', borderTop: i > 0 ? '1px solid var(--line)' : 'none', gap: 10 }}>
            <span className="grip"><Icons.Grip size={16} /></span>
            <span className="tabular muted" style={{ width: 22, fontSize: 13 }}>{String(i+1).padStart(2,'0')}</span>
            <span className="grow t-body">{t}</span>
            <button className="btn btn-ghost btn-sm"><Icons.More size={15}/></button>
          </div>
        ))}
      </div>
    </div>
  </AdminShell>
);

const AdminEnrollments = () => (
  <AdminShell active="enrollments">
    <PageHeader
      breadcrumbs={['Courses','Intro to React']}
      title="Enrollment requests"
      description="Review and approve students waiting to start this course."
    />
    <div className="tabs" style={{ marginBottom: 20 }}>
      <div className="tab active">Pending <span className="count">3</span></div>
      <div className="tab">Approved <span className="count">42</span></div>
      <div className="tab">Rejected <span className="count">1</span></div>
    </div>

    <div className="row" style={{ marginBottom: 14, gap: 10 }}>
      <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
        <span className="chk on"><Icons.Check size={11}/></span>
        <span className="t-body-sm">2 selected</span>
      </label>
      <button className="btn btn-primary btn-sm">Approve selected</button>
      <button className="btn btn-secondary btn-sm">Reject selected</button>
    </div>

    <div className="card" style={{ overflow: 'hidden' }}>
      <table className="tbl">
        <thead><tr><th style={{ width: 44 }}></th><th>Student</th><th>Email</th><th>Requested</th><th style={{ textAlign:'right' }}>Actions</th></tr></thead>
        <tbody>
          {[
            { sel: true, av: 'JD', name: 'Jane Doe', email: 'jane@school.edu', when: '2h ago' },
            { sel: true, av: 'JS', name: 'John Smith', email: 'john@school.edu', when: '5h ago' },
            { sel: false, av: 'AK', name: 'Alex Kim', email: 'alex@school.edu', when: '1d ago' },
          ].map((r, i) => (
            <tr key={i}>
              <td><span className={`chk ${r.sel ? 'on' : ''}`}>{r.sel && <Icons.Check size={11}/>}</span></td>
              <td><span className="row" style={{ gap: 10 }}><div className="avatar">{r.av}</div><span className="t-body" style={{ fontWeight: 500 }}>{r.name}</span></span></td>
              <td className="muted">{r.email}</td>
              <td className="muted">{r.when}</td>
              <td style={{ textAlign: 'right' }}>
                <span className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary btn-sm"><Icons.Check size={13}/> Approve</button>
                  <button className="btn btn-secondary btn-sm">Reject</button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </AdminShell>
);

const AdminAssignments = () => (
  <AdminShell active="assignments">
    <PageHeader title="Submitted assignments" description="Download and review the latest student work." />
    <div className="row" style={{ gap: 10, marginBottom: 20 }}>
      <button className="btn btn-secondary btn-sm">Course: All <Icons.ChevronDown size={13}/></button>
      <button className="btn btn-secondary btn-sm">Semester: All <Icons.ChevronDown size={13}/></button>
      <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
        <Icons.Search size={14} className="muted" style={{ position: 'absolute', left: 10, top: 9 }} />
        <input className="input" style={{ paddingLeft: 30, height: 32, fontSize: 13 }} placeholder="Search student…" />
      </div>
    </div>
    <div className="card" style={{ overflow: 'hidden' }}>
      <table className="tbl">
        <thead><tr><th>Student</th><th>Course</th><th>Semester</th><th>File</th><th>Submitted</th><th></th></tr></thead>
        <tbody>
          {[
            ['Jane Doe','Intro to React','02 State Management','homework-1.pdf','12 min ago'],
            ['John Smith','Advanced TS','01 Types 101','assignment.docx','1h ago'],
            ['Priya Raj','Modern CSS','03 Grid Mastery','layout.pdf','3h ago'],
            ['Alex Kim','Node.js Mastery','02 Streams','streams-lab.pdf','6h ago'],
            ['Sam Oduya','Intro to React','01 Hooks','hooks-notes.docx','1d ago'],
          ].map((r, i) => (
            <tr key={i}>
              <td><span className="row" style={{ gap: 10 }}><div className="avatar" style={{ fontSize: 11 }}>{r[0].split(' ').map(x=>x[0]).join('')}</div>{r[0]}</span></td>
              <td className="muted">{r[1]}</td>
              <td className="muted">{r[2]}</td>
              <td><span className="row" style={{ gap: 6 }}><Icons.FileText size={14} className="muted"/>{r[3]}</span></td>
              <td className="muted">{r[4]}</td>
              <td style={{ textAlign: 'right' }}><button className="btn btn-ghost btn-sm"><Icons.Download size={14}/></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </AdminShell>
);

// ── Fragment: assignment dropzone states & modal ──
const DropzoneStates = () => (
  <div className="ab" style={{ padding: 28, overflow: 'auto' }}>
    <div className="t-caption muted" style={{ marginBottom: 16 }}>AssignmentDropzone · six states</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div>
        <div className="t-body-sm muted" style={{ marginBottom: 6 }}>Idle</div>
        <div className="dropzone">
          <Icons.Upload size={24} className="muted" />
          <div className="t-h4" style={{ margin: '10px 0 4px' }}>Drop PDF or DOCX</div>
          <div className="muted t-body-sm">or click to browse · max 25 MB</div>
        </div>
      </div>
      <div>
        <div className="t-body-sm muted" style={{ marginBottom: 6 }}>Dragging over</div>
        <div className="dropzone drag">
          <Icons.Upload size={28} style={{ color: 'var(--accent-600)' }}/>
          <div className="t-h4" style={{ margin: '10px 0 4px', color: 'var(--accent-700)' }}>Release to upload</div>
          <div className="t-body-sm" style={{ color: 'var(--accent-700)' }}>1 file detected</div>
        </div>
      </div>
      <div>
        <div className="t-body-sm muted" style={{ marginBottom: 6 }}>Uploading</div>
        <div className="dropzone" style={{ textAlign: 'left' }}>
          <div className="row"><Icons.FileText size={18} className="muted"/><span className="t-body grow" style={{ marginLeft: 8 }}>homework-2.pdf</span><button className="btn btn-ghost btn-sm"><Icons.X size={13}/></button></div>
          <div className="progress" style={{ marginTop: 12 }}><i style={{ width: '62%' }}/></div>
          <div className="t-body-sm muted tabular" style={{ marginTop: 6 }}>62% · 1.2 MB of 1.9 MB</div>
        </div>
      </div>
      <div>
        <div className="t-body-sm muted" style={{ marginBottom: 6 }}>Success</div>
        <div className="dropzone" style={{ borderStyle: 'solid', borderColor: 'var(--success-border)', background: 'var(--success-bg)' }}>
          <Icons.CircleCheck size={28} style={{ color: 'var(--success-fg)' }}/>
          <div className="t-h4" style={{ margin: '10px 0 4px', color: 'var(--success-fg)' }}>Uploaded</div>
          <div className="t-body-sm" style={{ color: 'var(--success-fg)' }}>Semester marked complete · <a className="ulink" style={{ color: 'var(--success-fg)', textDecoration: 'underline' }}>submit another</a></div>
        </div>
      </div>
      <div>
        <div className="t-body-sm muted" style={{ marginBottom: 6 }}>Error</div>
        <div className="dropzone error">
          <Icons.X size={26} style={{ color: 'var(--danger-fg)' }}/>
          <div className="t-h4" style={{ margin: '10px 0 4px', color: 'var(--danger-fg)' }}>File too large</div>
          <div className="t-body-sm" style={{ color: 'var(--danger-fg)' }}>essay.pdf is 34 MB · max 25 MB · <a className="ulink" style={{ color: 'var(--danger-fg)', textDecoration: 'underline' }}>try again</a></div>
        </div>
      </div>
      <div>
        <div className="t-body-sm muted" style={{ marginBottom: 6 }}>Toast + empty state</div>
        <div className="card" style={{ padding: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 140 }}>
          <Toast>Assignment submitted — semester marked complete.</Toast>
        </div>
      </div>
    </div>
  </div>
);

const SemesterModal = () => (
  <div className="ab" style={{ background: 'var(--paper)' }}>
    <div className="backdrop" style={{ position: 'absolute', inset: 0 }}>
      <div className="modal">
        <div className="row" style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
          <span className="t-h4 grow">Add semester</span>
          <button className="btn btn-ghost btn-icon"><Icons.X size={16}/></button>
        </div>
        <div style={{ padding: 22 }}>
          <div className="col" style={{ gap: 14 }}>
            <div>
              <label className="t-body-sm" style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Title</label>
              <input className="input" defaultValue="State Management" />
            </div>
            <div>
              <label className="t-body-sm" style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Description</label>
              <textarea className="input" rows={3} defaultValue="Lifting state up, context, and reducer patterns."/>
            </div>
            <div>
              <label className="t-body-sm" style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>YouTube URL</label>
              <input className="input" defaultValue="https://youtu.be/abc123XYZ" />
              <div className="t-body-sm muted" style={{ marginTop: 6 }}>Video will be embedded via youtube-nocookie.</div>
              <div style={{ marginTop: 12 }}>
                <div className="video-ph" style={{ maxWidth: 200, aspectRatio: '16/9' }}>
                  <div className="play" style={{ width: 40, height: 40 }}><Icons.Play size={14}/></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="row" style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', justifyContent: 'flex-end', gap: 10, background: 'var(--paper)' }}>
          <button className="btn btn-secondary">Cancel</button>
          <button className="btn btn-primary">Save semester</button>
        </div>
      </div>
    </div>
  </div>
);

Object.assign(window, {
  AdminDashboard, AdminCourses, AdminCourseEdit, AdminEnrollments, AdminAssignments,
  DropzoneStates, SemesterModal,
});
