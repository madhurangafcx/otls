// Icon facade — keeps design names stable ("Icons.ArrowRight") while using
// lucide-react under the hood. Everything below is a straight re-export with
// the name the Edulearn mockups use, plus a hand-rolled brand Google SVG since
// lucide doesn't ship branded logos.
//
// Design reference: docs/design/edulearn-ui/project/icons.jsx
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle as CircleCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Dot,
  Download,
  Eye,
  EyeOff,
  FileText,
  Filter,
  GraduationCap,
  GripVertical as Grip,
  Info,
  Layers,
  LayoutDashboard,
  Loader,
  Lock,
  LogOut,
  Mail,
  Menu,
  MoreHorizontal as More,
  Play,
  PlayCircle,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type { LucideProps } from 'lucide-react';

function Google(props: LucideProps) {
  const size = props.size ?? 18;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      className={props.className}
    >
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.3h6.5c-.3 1.5-1.1 2.8-2.4 3.7v3h3.9c2.3-2.1 3.5-5.3 3.5-8.8z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.7-4.9H1.4v3.1A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.4c-.2-.7-.4-1.5-.4-2.4s.1-1.6.4-2.4V6.6H1.4A12 12 0 0 0 0 12c0 1.9.5 3.8 1.4 5.4z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.6 1.4 6.6l3.9 3.1C6.3 6.9 8.9 4.8 12 4.8z"
      />
    </svg>
  );
}

export const Icons = {
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  Clock,
  Dot,
  Download,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Google,
  GraduationCap,
  Grip,
  Info,
  Layers,
  LayoutDashboard,
  Loader,
  Lock,
  LogOut,
  Mail,
  Menu,
  More,
  Play,
  PlayCircle,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  X,
};
