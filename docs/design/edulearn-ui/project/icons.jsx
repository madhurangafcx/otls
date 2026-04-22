// Lucide-style icons drawn as inline SVG, stroke 1.75.
const Ic = ({ d, size = 18, className = '', fill = 'none', children }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
       strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    {d && <path d={d} />}
    {children}
  </svg>
);

const Icons = {
  BookOpen: (p) => <Ic {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></Ic>,
  Layers: (p) => <Ic {...p}><path d="M12 2 2 7l10 5 10-5-10-5z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/></Ic>,
  PlayCircle: (p) => <Ic {...p}><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/></Ic>,
  Play: (p) => <Ic {...p}><polygon points="6 4 20 12 6 20 6 4" fill="currentColor"/></Ic>,
  FileText: (p) => <Ic {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8M8 9h2"/></Ic>,
  Upload: (p) => <Ic {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></Ic>,
  Download: (p) => <Ic {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></Ic>,
  UserPlus: (p) => <Ic {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></Ic>,
  Check: (p) => <Ic {...p}><polyline points="20 6 9 17 4 12"/></Ic>,
  X: (p) => <Ic {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ic>,
  Eye: (p) => <Ic {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></Ic>,
  EyeOff: (p) => <Ic {...p}><path d="M17.94 17.94A10 10 0 0 1 12 20c-7 0-11-8-11-8a18 18 0 0 1 4.16-5.19"/><path d="M9.9 4.24A10 10 0 0 1 12 4c7 0 11 8 11 8a18 18 0 0 1-2.59 3.71"/><line x1="1" y1="1" x2="23" y2="23"/></Ic>,
  CircleCheck: (p) => <Ic {...p}><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/></Ic>,
  ShieldCheck: (p) => <Ic {...p}><path d="M20 13c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V5l8-3 8 3z"/><polyline points="9 12 11 14 15 10"/></Ic>,
  GraduationCap: (p) => <Ic {...p}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></Ic>,
  Search: (p) => <Ic {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Ic>,
  Settings: (p) => <Ic {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Ic>,
  LogOut: (p) => <Ic {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></Ic>,
  ChevronLeft: (p) => <Ic {...p}><polyline points="15 18 9 12 15 6"/></Ic>,
  ChevronRight: (p) => <Ic {...p}><polyline points="9 18 15 12 9 6"/></Ic>,
  ChevronDown: (p) => <Ic {...p}><polyline points="6 9 12 15 18 9"/></Ic>,
  ArrowRight: (p) => <Ic {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></Ic>,
  Lock: (p) => <Ic {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Ic>,
  More: (p) => <Ic {...p}><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/></Ic>,
  Grip: (p) => <Ic {...p}><circle cx="9" cy="6" r=".8" fill="currentColor"/><circle cx="9" cy="12" r=".8" fill="currentColor"/><circle cx="9" cy="18" r=".8" fill="currentColor"/><circle cx="15" cy="6" r=".8" fill="currentColor"/><circle cx="15" cy="12" r=".8" fill="currentColor"/><circle cx="15" cy="18" r=".8" fill="currentColor"/></Ic>,
  Loader: (p) => <Ic {...p}><path d="M21 12a9 9 0 1 1-6.2-8.55"/></Ic>,
  Google: (p) => <svg viewBox="0 0 24 24" width={p?.size || 18} height={p?.size || 18} aria-hidden><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.3h6.5c-.3 1.5-1.1 2.8-2.4 3.7v3h3.9c2.3-2.1 3.5-5.3 3.5-8.8z"/><path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.7-4.9H1.4v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.3 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.6.4-2.4V6.6H1.4A12 12 0 0 0 0 12c0 1.9.5 3.8 1.4 5.4z"/><path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.6 1.4 6.6l3.9 3.1C6.3 6.9 8.9 4.8 12 4.8z"/></svg>,
  Dot: (p) => <Ic {...p}><circle cx="12" cy="12" r="3" fill="currentColor"/></Ic>,
  Filter: (p) => <Ic {...p}><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></Ic>,
  Menu: (p) => <Ic {...p}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></Ic>,
  LayoutDashboard: (p) => <Ic {...p}><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></Ic>,
  ClipboardList: (p) => <Ic {...p}><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h.01M9 16h.01M13 12h4M13 16h4"/></Ic>,
  UserCheck: (p) => <Ic {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/></Ic>,
  TrendingUp: (p) => <Ic {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></Ic>,
  Users: (p) => <Ic {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></Ic>,
  Calendar: (p) => <Ic {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></Ic>,
  Plus: (p) => <Ic {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Ic>,
  Info: (p) => <Ic {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></Ic>,
  Clock: (p) => <Ic {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Ic>,
  Mail: (p) => <Ic {...p}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></Ic>,
};

Object.assign(window, { Ic, Icons });
