// App.jsx — compose all screens into a DesignCanvas

const Frame = ({ children, bg }) => (
  <div style={{ width: '100%', height: '100%', background: bg || 'var(--paper)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 6, overflow: 'hidden' }}>
    {children}
  </div>
);

function App() {
  return (
    <DesignCanvas>
      <DCSection id="direction" title="Design direction" subtitle="Editorial Academic — paper & ochre, Fraunces display + Geist UI">
        <DCArtboard id="tokens" label="01 · Design tokens" width={720} height={560}>
          <Frame><div style={{ padding: 32, overflow: 'auto', height: '100%' }} className="ab-scroll">
            <div className="t-caption accent">Edulearn · UI system</div>
            <h1 className="t-display-sm" style={{ margin: '10px 0 24px' }}>Paper & Ochre</h1>

            <div className="t-caption muted" style={{ marginBottom: 10 }}>Surface</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 24 }}>
              {[['#FAF8F3','paper'],['#FFFFFF','surface'],['#E7E5E4','line'],['#A8A29E','subtle'],['#57534E','muted'],['#1C1917','ink']].map(([c,n])=>(
                <div key={n}>
                  <div style={{ background:c, border:'1px solid var(--line)', borderRadius: 6, aspectRatio: '1/1' }}/>
                  <div className="t-body-sm" style={{ marginTop: 6 }}>{n}</div>
                  <div className="t-body-sm muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{c}</div>
                </div>
              ))}
            </div>

            <div className="t-caption muted" style={{ marginBottom: 10 }}>Accent · single confident color</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 24 }}>
              {[['#FEF7EC','50'],['#FDECCB','100'],['#D97706','500'],['#B45309','600'],['#92400E','700'],['#451A03','900']].map(([c,n])=>(
                <div key={n}>
                  <div style={{ background:c, border:'1px solid var(--line)', borderRadius: 6, aspectRatio: '1/1' }}/>
                  <div className="t-body-sm" style={{ marginTop: 6 }}>accent-{n}</div>
                </div>
              ))}
            </div>

            <div className="t-caption muted" style={{ marginBottom: 10 }}>Semantic status</div>
            <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
              <EnrollmentBadge status="published" />
              <EnrollmentBadge status="draft" />
              <EnrollmentBadge status="pending" />
              <EnrollmentBadge status="approved" />
              <EnrollmentBadge status="rejected" />
              <EnrollmentBadge status="completed" />
            </div>

            <div className="t-caption muted" style={{ marginBottom: 10 }}>Type scale</div>
            <div style={{ display:'grid', gridTemplateColumns: '110px 1fr', rowGap: 10, columnGap: 20, alignItems:'baseline' }}>
              <div className="muted t-body-sm">Display</div><div className="t-display-sm">Curious minds</div>
              <div className="muted t-body-sm">H1</div><div className="t-h1">Structured learning</div>
              <div className="muted t-body-sm">H2</div><div className="t-h2">About this course</div>
              <div className="muted t-body-sm">H3</div><div className="t-h3">Hooks Fundamentals</div>
              <div className="muted t-body-sm">Body-lg</div><div className="t-body-lg">Comfortable reading on long descriptions.</div>
              <div className="muted t-body-sm">Body</div><div className="t-body">Default UI text.</div>
              <div className="muted t-body-sm">Caption</div><div className="t-caption muted">Eyebrow label</div>
            </div>
          </div></Frame>
        </DCArtboard>

        <DCArtboard id="components" label="02 · Component kit" width={720} height={560}>
          <Frame><div style={{ padding: 32, overflow: 'auto', height: '100%' }} className="ab-scroll">
            <div className="t-caption muted" style={{ marginBottom: 12 }}>Buttons</div>
            <div className="row" style={{ gap: 10, flexWrap:'wrap', marginBottom: 20 }}>
              <button className="btn btn-primary">Primary</button>
              <button className="btn btn-secondary">Secondary</button>
              <button className="btn btn-ghost">Ghost</button>
              <button className="btn btn-danger">Delete</button>
              <button className="btn btn-primary btn-sm">Small</button>
              <button className="btn btn-primary btn-lg">Large</button>
            </div>

            <div className="t-caption muted" style={{ marginBottom: 12 }}>Inputs</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 14, marginBottom: 20 }}>
              <div>
                <label className="t-body-sm" style={{ fontWeight: 500, display:'block', marginBottom: 6 }}>Default</label>
                <input className="input" defaultValue="jane.doe@school.edu"/>
              </div>
              <div>
                <label className="t-body-sm" style={{ fontWeight: 500, display:'block', marginBottom: 6 }}>Error</label>
                <input className="input" style={{ borderColor:'var(--danger-border)' }} defaultValue="invalid"/>
                <div className="t-body-sm" style={{ color:'var(--danger-fg)', marginTop: 4 }}>Enter a valid email.</div>
              </div>
            </div>

            <div className="t-caption muted" style={{ marginBottom: 12 }}>Progress</div>
            <div className="col" style={{ gap: 10, marginBottom: 20 }}>
              <ProgressBar value={15} />
              <ProgressBar value={67} />
              <ProgressBar value={100} />
            </div>

            <div className="t-caption muted" style={{ marginBottom: 12 }}>Course card</div>
            <CourseCard semesters={6} title="Intro to React" desc="Learn hooks, state, and effects from the ground up." status="published" />
          </div></Frame>
        </DCArtboard>
      </DCSection>

      <DCSection id="public" title="Public" subtitle="Landing · Catalog · Course detail">
        <DCArtboard id="landing" label="03 · Landing" width={1280} height={860}><Frame><Landing /></Frame></DCArtboard>
        <DCArtboard id="catalog" label="04 · Course catalog" width={1280} height={860}><Frame><Catalog /></Frame></DCArtboard>
        <DCArtboard id="detail-locked" label="05 · Course detail · not enrolled" width={1280} height={920}><Frame><CourseDetail enrollState="not-enrolled"/></Frame></DCArtboard>
        <DCArtboard id="detail-pending" label="06 · Course detail · pending" width={1280} height={920}><Frame><CourseDetail enrollState="pending"/></Frame></DCArtboard>
        <DCArtboard id="detail-approved" label="07 · Course detail · approved" width={1280} height={920}><Frame><CourseDetail enrollState="approved"/></Frame></DCArtboard>
      </DCSection>

      <DCSection id="auth" title="Auth" subtitle="Login & Register">
        <DCArtboard id="login" label="08 · Sign in" width={720} height={720}><Frame><Login/></Frame></DCArtboard>
        <DCArtboard id="register" label="09 · Create account" width={720} height={820}><Frame><Register/></Frame></DCArtboard>
      </DCSection>

      <DCSection id="student" title="Student" subtitle="My courses · Semester viewer">
        <DCArtboard id="my" label="10 · My courses" width={1280} height={760}><Frame><MyCourses/></Frame></DCArtboard>
        <DCArtboard id="semester" label="11 · Semester viewer" width={1280} height={1100}><Frame><SemesterViewer/></Frame></DCArtboard>
        <DCArtboard id="dropzone" label="12 · Assignment dropzone · states" width={820} height={520}><Frame><DropzoneStates/></Frame></DCArtboard>
      </DCSection>

      <DCSection id="admin" title="Admin" subtitle="Dashboard · Course editor · Review queues">
        <DCArtboard id="dash" label="13 · Admin dashboard" width={1280} height={860}><Frame><AdminDashboard/></Frame></DCArtboard>
        <DCArtboard id="admin-courses" label="14 · Courses management" width={1280} height={760}><Frame><AdminCourses/></Frame></DCArtboard>
        <DCArtboard id="admin-edit" label="15 · Course edit" width={1280} height={820}><Frame><AdminCourseEdit/></Frame></DCArtboard>
        <DCArtboard id="admin-enrolls" label="16 · Enrollment review" width={1280} height={720}><Frame><AdminEnrollments/></Frame></DCArtboard>
        <DCArtboard id="admin-assign" label="17 · Assignments queue" width={1280} height={720}><Frame><AdminAssignments/></Frame></DCArtboard>
        <DCArtboard id="semester-modal" label="18 · Add semester · dialog" width={800} height={640}><Frame><SemesterModal/></Frame></DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
