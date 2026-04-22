import { Footer } from '@/components/footer';
import { TopNav } from '@/components/top-nav';

// Marketing-style pages (about / privacy / terms / contact) share the same
// chrome: public TopNav above, Footer below. Pulled into a route group so
// each placeholder page stays short.

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-paper text-ink flex flex-col">
      <TopNav />
      <div className="flex-1">{children}</div>
      <Footer />
    </main>
  );
}
