export function RevealTitle({ text, className }: { text: string; className?: string }) {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return <span className={className}>{text}</span>;
  return (
    <span className={`reveal ${className ?? ""}`} aria-label={text}>
      {text.split("").map((ch, i) => (
        <span key={`${ch}-${i}`} style={{ animationDelay: `${i * 18}ms` }}>
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </span>
  );
}
