import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import { Fraunces } from 'next/font/google';
import './globals.css';

// DESIGN.md typography:
//   Fraunces — display serif  (loaded from Google Fonts via next/font)
//   Geist    — sans           (loaded from the official `geist` package)
//   Geist Mono — mono         (loaded from the official `geist` package)
// CSS variables are wired into tailwind.config.ts's fontFamily extension.
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-fraunces',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Edulearn — OTLS',
  description: 'Online Teaching & Learning System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
