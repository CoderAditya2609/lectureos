import { useRef } from "react";

export function LiquidButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  return (
    <span className="liquid-wrap">
      <svg className="filter-goo" aria-hidden>
        <filter id="goo">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
            result="goo"
          />
        </filter>
      </svg>
      <button
        ref={ref}
        className="liquid-btn"
        type="button"
        disabled={disabled}
        onClick={onClick}
        onPointerMove={(e) => {
          const el = ref.current;
          if (!el) return;
          const r = el.getBoundingClientRect();
          el.style.setProperty("--x", `${((e.clientX - r.left) / r.width) * 100}%`);
          el.style.setProperty("--y", `${((e.clientY - r.top) / r.height) * 100}%`);
        }}
      >
        <span className="goo" style={{ filter: "url(#goo)" }} />
        {children}
      </button>
    </span>
  );
}
