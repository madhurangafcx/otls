// AuthShell — brand top-left + centered form container.
// Design reference: docs/design/edulearn-ui/project/screens-auth.jsx (both
// Login and Register use this shape).

import Link from 'next/link';
import { Brand } from './brand';

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <header className="px-6 py-5">
        <Link href="/" className="inline-block">
          <Brand />
        </Link>
      </header>
      <div className="flex-1 flex items-start justify-center px-6 pb-20 pt-4">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
