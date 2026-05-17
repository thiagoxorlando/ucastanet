"use client";

export const APPLICATION_REQUIREMENT_OPTIONS = [
  { value: "photos",     label: "Fotos",     desc: "3 ângulos (frente, esquerda, direita)" },
  { value: "video",      label: "Vídeo",     desc: "Apresentação de 30–60 segundos" },
  { value: "curriculum", label: "Currículo", desc: "PDF ou DOC, até 10 MB" },
  { value: "portfolio",  label: "Portfólio", desc: "PDF, imagens ou documentos" },
] as const;

export default function ApplicationRequirementsInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  function toggle(opt: string) {
    onChange(
      value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt],
    );
  }

  return (
    <div>
      <p className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-1">
        O que o talento deve enviar ao se candidatar?
      </p>
      <p className="text-[12px] text-zinc-400 mb-3">
        Deixe em branco para aceitar qualquer candidatura sem uploads.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {APPLICATION_REQUIREMENT_OPTIONS.map((opt) => {
          const selected = value.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={[
                "flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-3 text-left transition-colors cursor-pointer",
                selected
                  ? "border-[#1ABC9C] bg-[#1ABC9C]/5 ring-1 ring-[#1ABC9C]"
                  : "border-zinc-200 hover:border-zinc-300 bg-white",
              ].join(" ")}
            >
              <span className={`text-[13px] font-semibold ${selected ? "text-[#0e9e82]" : "text-zinc-800"}`}>
                {opt.label}
              </span>
              <span className="text-[11px] text-zinc-400 leading-tight">{opt.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
