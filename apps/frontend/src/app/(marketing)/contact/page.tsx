export const metadata = { title: 'Contact · Edulearn' };

export default function ContactPage() {
  return (
    <section className="max-w-3xl mx-auto px-6 py-20">
      <div className="text-caption uppercase tracking-[0.09em] text-accent-600 mb-3">
        Contact
      </div>
      <h1 className="font-display text-h1 font-medium mb-6">Get in touch</h1>
      <div className="text-body-lg text-muted space-y-5 max-w-2xl">
        <p>
          Questions about a pilot, account issues, or bug reports — drop us a line.
          We&apos;ll get back to you within one business day.
        </p>
        <p>
          This is a placeholder. A contact form + email address will land here shortly.
        </p>
      </div>
    </section>
  );
}
