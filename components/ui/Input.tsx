import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  hint?: string;
};

const baseClasses =
  "w-full rounded-xl border bg-white px-4 py-3 text-[15px] text-zinc-900 placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-900 focus:outline-none transition-colors duration-150";

const stateClasses = (error?: string) =>
  error ? "border-rose-300 hover:border-rose-400 focus:border-rose-500" : "border-zinc-200";

const labelClass = "text-[13px] font-medium text-zinc-600";

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className = "", ...props },
  ref
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className={labelClass}>{label}</label>}
      <input
        ref={ref}
        className={[baseClasses, stateClasses(error), className].filter(Boolean).join(" ")}
        {...props}
      />
      {hint && !error && <p className="text-[12px] text-zinc-400 leading-snug">{hint}</p>}
      {error && <p className="text-[12px] text-rose-500">{error}</p>}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, error, hint, className = "", ...props }, ref) {
    return (
      <div className="flex flex-col gap-1.5">
        {label && <label className={labelClass}>{label}</label>}
        <textarea
          ref={ref}
          rows={4}
          className={[baseClasses, stateClasses(error), "resize-none leading-relaxed", className]
            .filter(Boolean)
            .join(" ")}
          {...props}
        />
        {hint && !error && <p className="text-[12px] text-zinc-400 leading-snug">{hint}</p>}
        {error && <p className="text-[12px] text-rose-500">{error}</p>}
      </div>
    );
  }
);
