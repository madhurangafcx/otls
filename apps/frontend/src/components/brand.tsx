// Edulearn wordmark. Fraunces display face + ochre accent dot.
// Design reference: docs/design/edulearn-ui/project/parts.jsx → Brand

export function Brand({
  size = 20,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`font-display font-semibold tracking-tight text-ink ${className}`}
      style={{ fontSize: size }}
    >
      Edulearn<span className="text-accent-600">.</span>
    </span>
  );
}
