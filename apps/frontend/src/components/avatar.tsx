// Initials avatar — 32px circle, accent-tinted, uppercase letters.
// Derives initials from full_name ("Jane Doe" → "JD") falling back to the
// first letter of the email. Matches the .avatar class from DESIGN.md.

export function Avatar({
  name,
  email,
  size = 32,
  className = '',
}: {
  name?: string | null;
  email?: string | null;
  size?: number;
  className?: string;
}) {
  const initials = computeInitials(name, email);
  return (
    <div
      className={`inline-flex items-center justify-center rounded-pill bg-accent-100 text-accent-700 font-medium border border-line shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
      }}
      aria-label={name ?? email ?? 'Account'}
    >
      {initials}
    </div>
  );
}

function computeInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
    return (first + last).toUpperCase();
  }
  if (email && email.length > 0) {
    return email[0]!.toUpperCase();
  }
  return '?';
}
