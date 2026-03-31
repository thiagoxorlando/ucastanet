type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

type BadgeProps = {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200/80",
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200/80",
  danger:  "bg-red-50 text-red-700 ring-1 ring-red-200/80",
  info:    "bg-sky-50 text-sky-700 ring-1 ring-sky-200/80",
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
