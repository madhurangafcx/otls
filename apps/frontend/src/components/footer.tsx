// Site footer — copyright + About / Privacy / Terms / Contact links.
// Design reference: docs/design/edulearn-ui/project/parts.jsx → Footer.

import Link from 'next/link';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-paper mt-12">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-body-sm text-muted">
        <div>© {year} Edulearn · Structured learning for curious minds.</div>
        <nav className="flex items-center gap-5">
          <Link href="/about" className="hover:text-ink transition-colors">
            About
          </Link>
          <Link href="/privacy" className="hover:text-ink transition-colors">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-ink transition-colors">
            Terms
          </Link>
          <Link href="/contact" className="hover:text-ink transition-colors">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}
