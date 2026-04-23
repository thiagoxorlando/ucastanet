import { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: "none" | "sm" | "md" | "lg";
  variant?: "default" | "soft" | "dark";
};

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const variantClasses = {
  default:
    "bg-white border border-zinc-100 text-zinc-950 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_12px_28px_rgba(0,0,0,0.04)]",
  soft:
    "bg-[var(--brand-paper)] border border-zinc-200/80 text-zinc-950 shadow-[0_1px_4px_rgba(0,0,0,0.04)]",
  dark:
    "bg-[var(--brand-surface)] border border-white/10 text-white shadow-[0_24px_70px_rgba(7,17,13,0.32)]",
};

export default function Card({
  padding = "md",
  variant = "default",
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={[
        "rounded-[1.5rem]",
        variantClasses[variant],
        paddingClasses[padding],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
