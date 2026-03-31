import Link from "next/link";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      
      {/* Sidebar */}
      <aside className="w-64 bg-black text-white p-6">
        <h2 className="text-xl font-bold mb-8">Ucastanet</h2>

        <nav className="flex flex-col gap-4">
          <Link href="/agency/dashboard">Dashboard</Link>
          <Link href="/agency/jobs">Jobs</Link>
          <Link href="/agency/post-job">Post Job</Link>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
}