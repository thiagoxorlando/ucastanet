type EmptyStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="brisahub-card px-6 py-10 text-center">
      <p className="text-[15px] font-semibold text-zinc-900">{title}</p>
      {description && (
        <p className="mt-2 text-[13px] leading-6 text-zinc-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
