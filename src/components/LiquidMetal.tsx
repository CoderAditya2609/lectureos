import { memo, forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from "react";
import { LiquidMetal as LiquidMetalShader } from "@paper-design/shaders-react";

function cn(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export interface LiquidMetalProps {
  colorBack?: string;
  colorTint?: string;
  speed?: number;
  repetition?: number;
  distortion?: number;
  scale?: number;
  className?: string;
  style?: CSSProperties;
}

export const LiquidMetal = memo(function LiquidMetal({
  colorBack = "#aaaaac",
  colorTint = "#ffffff",
  speed = 0.5,
  repetition = 4,
  distortion = 0.1,
  scale = 1,
  className,
  style,
}: LiquidMetalProps) {
  return (
    <div className={cn("liquid-metal", className)} style={style}>
      <LiquidMetalShader
        colorBack={colorBack}
        colorTint={colorTint}
        speed={speed}
        repetition={repetition}
        distortion={distortion}
        softness={0}
        shiftRed={0.3}
        shiftBlue={-0.3}
        angle={45}
        shape="none"
        scale={scale}
        fit="cover"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
});

LiquidMetal.displayName = "LiquidMetal";

export interface LiquidMetalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode;
  borderWidth?: number;
  metalConfig?: Omit<LiquidMetalProps, "className" | "style">;
  size?: "sm" | "md" | "lg";
}

export const LiquidMetalButton = forwardRef<HTMLButtonElement, LiquidMetalButtonProps>(
  (
    {
      children,
      icon,
      borderWidth = 3,
      metalConfig,
      size = "md",
      className,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn("lmb", `lmb-${size}`, className)}
        {...props}
      >
        <span className="lmb-shell" style={{ padding: borderWidth }}>
          <LiquidMetal
            colorBack={metalConfig?.colorBack ?? "#888888"}
            colorTint={metalConfig?.colorTint ?? "#ffffff"}
            speed={metalConfig?.speed ?? 0.4}
            repetition={metalConfig?.repetition ?? 4}
            distortion={metalConfig?.distortion ?? 0.15}
            scale={metalConfig?.scale ?? 1}
          />
          <span className="lmb-body">
            {icon && <span className="lmb-icon">{icon}</span>}
            <span className="lmb-label">{children}</span>
          </span>
        </span>
      </button>
    );
  },
);

LiquidMetalButton.displayName = "LiquidMetalButton";

export default LiquidMetalButton;
