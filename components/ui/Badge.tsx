type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "dark" | "muted" | "accent";

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80",
  success: "bg-[var(--brand-green-soft)] text-emerald-800 ring-1 ring-emerald-200/80",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/80",
  danger:  "bg-red-50 text-red-700 ring-1 ring-red-200/80",
  info:    "bg-sky-50 text-sky-700 ring-1 ring-sky-200/80",
  dark:    "bg-[var(--brand-surface)] text-white ring-1 ring-white/10",
  muted:   "bg-white/10 text-zinc-200 ring-1 ring-white/15",
  accent:  "bg-[var(--brand-green)] text-[var(--brand-surface)] ring-1 ring-[var(--brand-green)]",
};

export default function Badge({
  children,
  variant = "default",
  className = "",
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </span>
  );
}
