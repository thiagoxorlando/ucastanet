// Layout is handled by the parent app/agency/layout.tsx.
// This file is a passthrough to avoid double-wrapping.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
