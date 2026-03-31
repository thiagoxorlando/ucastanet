import type { Metadata } from "next";
import AdminDashboard from "@/features/admin/AdminDashboard";

export const metadata: Metadata = { title: "Admin Dashboard — ucastanet" };

export default function AdminDashboardPage() {
  return <AdminDashboard />;
}
