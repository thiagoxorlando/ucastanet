import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSessionClient } from "@/lib/supabase.server";
import { createServerClient } from "@/lib/supabase";

export async function GET() {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ language_preference: null });

  const supabase = createServerClient({ useServiceRole: true });
  const { data } = await supabase
    .from("profiles")
    .select("language_preference")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({ language_preference: data?.language_preference ?? null });
}

export async function PATCH(request: NextRequest) {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let body: { language_preference?: string };
  try {
    body = await request.json() as { language_preference?: string };
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const lang = body.language_preference;
  if (lang !== "pt-BR" && lang !== "en") {
    return NextResponse.json({ error: "invalid_lang" }, { status: 400 });
  }

  const supabase = createServerClient({ useServiceRole: true });
  const { error } = await supabase
    .from("profiles")
    .update({ language_preference: lang })
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
