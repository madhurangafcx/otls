export const metadata = { title: 'About · Edulearn' };

export default function AboutPage() {
  return (
    <section className="max-w-3xl mx-auto px-6 py-20">
      <div className="text-caption uppercase tracking-[0.09em] text-accent-600 mb-3">
        About
      </div>
      <h1 className="font-display text-h1 font-medium mb-6">
        Learning that fits your life.
      </h1>
      <div className="text-body-lg text-muted space-y-5 max-w-2xl">
        <p>
          Edulearn is an online teaching and learning system built for small groups and
          tutoring centres. Video recordings, graded assignments, and course announcements
          in one place.
        </p>
        <p>This is a placeholder page. A proper About write-up is coming.</p>
      </div>
    </section>
  );
}
