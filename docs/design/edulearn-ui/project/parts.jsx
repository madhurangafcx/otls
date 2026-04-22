// Shared UI parts used by multiple screens.

const Brand = ({ size = 20 }) => (
  <div className="brand" style={{ fontSize: size }}>
    Edulearn<span className="dot">.</span>
  </div>
);

const TopNav = ({ variant = 'public', active }) => {
  if (variant === 'public') {
    return (
      <div className="topnav">
        <Brand />
        <div className="grow" />
        <button className="btn btn-ghost btn-sm">Log in</button>
        <button className="btn btn-primary btn-sm">Create account</button>
      </div>
    );
  }
  if (variant === 'student') {
    return (
      <div className="topnav">
        <Brand />
        <div style={{ width: 24 }} />
        <div className="navlinks">
          <a className={active === 'catalog' ? 'active' : ''}>Courses</a>
          <a className={active === 'my' ? 'active' : ''}>My Courses</a>
        </div>
        <div className="grow" />
        <div className="row" style={{ gap: 10 }}>
          <Icons.Search size={18} className="muted" />
          <div className="avatar">JD</div>
        </div>
      </div>
    );
  }
  if (variant === 'admin') {
    return (
      <div className="topnav" style={{ height: 56, padding: '0 20px' }}>
        <Brand size={18} />
        <span className="badge badge-neutral" style={{ marginLeft: 6 }}>Admin</span>
        <div className="grow" />
        <span className="kbd">⌘K</span>
        <div className="avatar" style={{ marginLeft: 10 }}>AM</div>
      </div>
    );
  }
};

const PageHeader = ({ breadcrumbs, title, description, action, eyebrow }) => (
  <div style={{ marginBottom: 32 }}>
    {breadcrumbs && (
      <div className="t-caption muted" style={{ marginBottom: 10, letterSpacing: '0.08em' }}>
        {breadcrumbs.map((b, i) => (
          <span key={i}>{i > 0 && <span style={{ margin: '0 8px', color: 'var(--subtle)' }}>›</span>}{b}</span>
        ))}
      </div>
    )}
    {eyebrow && <div className="t-caption accent" style={{ marginBottom: 10 }}>{eyebrow}</div>}
    <div className="row" style={{ alignItems: 'flex-end', justifyContent: 'space-between', gap: 20 }}>
      <div>
        <h1 className="t-h1" style={{ margin: 0 }}>{title}</h1>
        {description && <div className="muted" style={{ marginTop: 8, fontSize: 15, lineHeight: 1.5, maxWidth: 640 }}>{description}</div>}
      </div>
      {action && <div>{action}</div>}
    </div>
  </div>
);

const CourseCard = ({ semesters, title, desc, status = 'published', hover }) => (
  <div className="card" style={{ padding: 22, background: hover ? 'var(--paper)' : 'var(--surface)', cursor: 'pointer' }}>
    <div className="t-caption muted" style={{ marginBottom: 12 }}>{semesters} semesters</div>
    <h3 className="t-h3" style={{ margin: '0 0 10px' }}>{title}</h3>
    <div className="t-body-sm muted" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{desc}</div>
    <div className="sep" style={{ margin: '18px 0 14px' }} />
    <div className="row" style={{ justifyContent: 'space-between' }}>
      <span className={`badge badge-${status === 'published' ? 'success' : 'warning'}`}>
        <i className="status-dot" /> {status === 'published' ? 'Published' : 'Draft'}
      </span>
      <a className="ulink t-body-sm row" style={{ gap: 4 }}>View <Icons.ArrowRight size={14} /></a>
    </div>
  </div>
);

const EnrollmentBadge = ({ status }) => {
  const map = {
    pending:  { cls: 'warning', label: 'Pending review' },
    approved: { cls: 'success', label: 'Approved' },
    rejected: { cls: 'danger',  label: 'Rejected' },
    published:{ cls: 'success', label: 'Published' },
    draft:    { cls: 'warning', label: 'Draft' },
    completed:{ cls: 'success', label: 'Completed' },
  };
  const s = map[status] || map.pending;
  return <span className={`badge badge-${s.cls}`}><i className="status-dot" />{s.label}</span>;
};

const ProgressBar = ({ value }) => (
  <div className="row" style={{ gap: 12 }}>
    <div className="progress grow"><i style={{ width: `${value}%` }} /></div>
    <span className="t-body-sm tabular muted" style={{ minWidth: 36, textAlign: 'right' }}>{value}%</span>
  </div>
);

const Footer = () => (
  <div className="footer">
    <div>© 2026 Edulearn · Structured learning for curious minds.</div>
    <div className="row" style={{ gap: 18 }}>
      <a className="muted" style={{ color: 'var(--muted)', textDecoration: 'none' }}>About</a>
      <a className="muted" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Privacy</a>
      <a className="muted" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Terms</a>
      <a className="muted" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Contact</a>
    </div>
  </div>
);

const AdminSidebar = ({ active }) => (
  <div className="sidebar">
    <div className="sidelabel">Main</div>
    <a className={`sideitem ${active === 'dashboard' ? 'active' : ''}`}><Icons.LayoutDashboard size={17}/> Dashboard</a>
    <a className={`sideitem ${active === 'courses' ? 'active' : ''}`}><Icons.BookOpen size={17}/> Courses</a>
    <a className={`sideitem ${active === 'enrollments' ? 'active' : ''}`}><Icons.UserCheck size={17}/> Enrollments <span className="badge badge-warning" style={{ marginLeft:'auto', fontSize: 10, padding: '1px 7px' }}>5</span></a>
    <a className={`sideitem ${active === 'assignments' ? 'active' : ''}`}><Icons.ClipboardList size={17}/> Assignments</a>
    <a className={`sideitem ${active === 'students' ? 'active' : ''}`}><Icons.Users size={17}/> Students</a>
    <div className="sidelabel">Account</div>
    <a className="sideitem"><Icons.Settings size={17}/> Settings</a>
    <a className="sideitem"><Icons.LogOut size={17}/> Log out</a>
  </div>
);

const StatCard = ({ label, value, delta, up }) => (
  <div className="statcard">
    <div className="t-caption muted">{label}</div>
    <div className="statnum" style={{ marginTop: 10 }}>{value}</div>
    {delta && (
      <div className="t-body-sm" style={{ marginTop: 8, color: up ? 'var(--success-fg)' : 'var(--danger-fg)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <Icons.TrendingUp size={13} style={{ transform: up ? 'none' : 'scaleY(-1)' }} />
        {delta}
      </div>
    )}
  </div>
);

const EmptyState = ({ icon: I, title, body, action }) => (
  <div style={{ textAlign: 'center', padding: '56px 20px' }}>
    <div style={{ color: 'var(--subtle)', marginBottom: 14 }}>
      <I size={40} />
    </div>
    <h3 className="t-h3" style={{ margin: '0 0 6px' }}>{title}</h3>
    <div className="muted t-body" style={{ maxWidth: 420, margin: '0 auto 18px' }}>{body}</div>
    {action}
  </div>
);

const Toast = ({ children, icon: I = Icons.Check }) => (
  <div className="toast"><span className="ico"><I size={16} /></span>{children}</div>
);

Object.assign(window, {
  Brand, TopNav, PageHeader, CourseCard, EnrollmentBadge, ProgressBar,
  Footer, AdminSidebar, StatCard, EmptyState, Toast,
});
