import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { resolvePortalOnlyTalentLanding } from "@/lib/talentPortalLanding";

export async function GET() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient({ useServiceRole: true });
  const portalLanding = await resolvePortalOnlyTalentLanding(supabase, user.id);

  return NextResponse.json({
    destination: portalLanding ?? "/talent/dashboard",
  });
}
