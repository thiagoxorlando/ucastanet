import DashboardShell from "@/components/layout/DashboardShell";

export default function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
