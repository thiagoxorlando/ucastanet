import { redirect } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  console.log("[AdminLayout] cookies received:", allCookies.map((c) => c.name));

  const session = await createSessionClient();
  const {
    data: { user },
    error: sessionError,
  } = await session.auth.getUser();
  console.log("[AdminLayout] getUser result:", { userId: user?.id ?? null, error: sessionError?.message ?? null });

  if (!user) redirect("/login");

  const supabase = createServerClient({ useServiceRole: true });
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    if (profile?.role === "agency") redirect("/agency/dashboard");
    if (profile?.role === "talent") redirect("/talent/dashboard");
    redirect("/login");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
