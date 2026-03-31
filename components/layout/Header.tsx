type HeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export default function Header({ title, description, actions }: HeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
        {description && (
          <p className="text-sm text-zinc-500 mt-0.5">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
