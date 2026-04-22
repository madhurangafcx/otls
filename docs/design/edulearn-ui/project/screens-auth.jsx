// Auth screens: Login, Register, OAuth callback

const AuthShell = ({ children }) => (
  <div className="ab"><div className="ab-scroll" style={{ overflowY: 'auto', height: '100%' }}>
    <div style={{ padding: '28px 40px' }}>
      <Brand />
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 20px 80px' }}>
      {children}
    </div>
  </div></div>
);

const Login = () => (
  <AuthShell>
    <div style={{ width: 420 }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h1 className="t-h1-sm" style={{ margin: '0 0 8px' }}>Welcome back</h1>
        <div className="muted t-body">Sign in to continue learning.</div>
      </div>

      <div className="card" style={{ padding: 28 }}>
        <button className="btn btn-secondary" style={{ width: '100%', height: 44 }}>
          <Icons.Google size={18} /> Continue with Google
        </button>

        <div className="row" style={{ gap: 12, margin: '20px 0' }}>
          <div className="sep grow" />
          <span className="t-caption muted" style={{ letterSpacing: '0.08em' }}>or sign in with email</span>
          <div className="sep grow" />
        </div>

        <div className="col" style={{ gap: 14 }}>
          <div>
            <label className="t-body-sm" style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Email</label>
            <input className="input" defaultValue="jane.doe@school.edu" />
          </div>
          <div>
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <label className="t-body-sm" style={{ fontWeight: 500 }}>Password</label>
              <a className="ulink t-body-sm">Forgot?</a>
            </div>
            <input className="input" type="password" defaultValue="••••••••••" />
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 6, height: 44 }}>Sign in</button>
        </div>
      </div>

      <div className="muted t-body-sm" style={{ textAlign: 'center', marginTop: 18 }}>
        New here? <a className="ulink">Create an account →</a>
      </div>
    </div>
  </AuthShell>
);

const Register = () => (
  <AuthShell>
    <div style={{ width: 420 }}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h1 className="t-h1-sm" style={{ margin: '0 0 8px' }}>Create your account</h1>
        <div className="muted t-body">Start with one course. Add more whenever.</div>
      </div>

      <div className="card" style={{ padding: 28 }}>
        <button className="btn btn-secondary" style={{ width: '100%', height: 44 }}>
          <Icons.Google size={18} /> Sign up with Google
        </button>

        <div className="row" style={{ gap: 12, margin: '20px 0' }}>
          <div className="sep grow" />
          <span className="t-caption muted" style={{ letterSpacing: '0.08em' }}>or with email</span>
          <div className="sep grow" />
        </div>

        <div className="col" style={{ gap: 14 }}>
          <div>
            <label className="t-body-sm" style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Full name</label>
            <input className="input" defaultValue="Jane Doe" />
          </div>
          <div>
            <label className="t-body-sm" style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Email</label>
            <input className="input" defaultValue="jane@school.edu" />
          </div>
          <div>
            <label className="t-body-sm" style={{ fontWeight: 500, display: 'block', marginBottom: 6 }}>Password</label>
            <input className="input" type="password" defaultValue="••••••••" />
            <div className="strength ok" style={{ marginTop: 8 }}><i/><i/><i/></div>
            <div className="t-body-sm muted" style={{ marginTop: 6 }}>8+ characters, include a number.</div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', marginTop: 8, height: 44 }}>Create account</button>
        </div>
      </div>

      <div className="muted t-body-sm" style={{ textAlign: 'center', marginTop: 18 }}>
        Already have an account? <a className="ulink">Sign in →</a>
      </div>
    </div>
  </AuthShell>
);

Object.assign(window, { Login, Register });
