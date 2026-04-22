// PII redaction helpers for logs.
// CEO-review amendment: full emails never hit logs. Domain survives, local-part
// is masked to first char + asterisks. UUIDs are NOT PII and are logged raw for
// correlation.

export function redactEmail(email: string | null | undefined): string {
  if (!email) return '';
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return '***';

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);

  if (local.length <= 1) return `*@${domain}`;
  return `${local[0]}${'*'.repeat(Math.min(local.length - 1, 5))}@${domain}`;
}

// Shallow redact — replaces common PII fields in a record so it's safe to log.
// Extend the keys list as we encounter new PII surfaces.
const PII_KEYS = new Set(['email', 'password', 'full_name', 'phone']);

export function redactPii<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    if (!PII_KEYS.has(key)) continue;
    const value = out[key];
    if (key === 'email' && typeof value === 'string') {
      (out as Record<string, unknown>)[key] = redactEmail(value);
    } else if (key === 'password') {
      (out as Record<string, unknown>)[key] = '***';
    } else if (typeof value === 'string' && value.length > 0) {
      (out as Record<string, unknown>)[key] = '***';
    }
  }
  return out;
}
