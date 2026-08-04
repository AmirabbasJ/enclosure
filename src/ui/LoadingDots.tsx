export function LoadingDots({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`loading-dots inline-flex items-end gap-1.5 ${className}`}
    >
      <span />
      <span />
      <span />
    </span>
  );
}
