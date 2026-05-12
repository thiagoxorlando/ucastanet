import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { createSessionClient } from "@/lib/supabase.server";
import { getUserPremiumWorkspace } from "@/lib/premiumWorkspace.server";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(req: NextRequest) {
  const session = await createSessionClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ws = await getUserPremiumWorkspace(user.id);
  if (!ws) return NextResponse.json({ error: "Workspace não encontrado." }, { status: 404 });
  if (ws.membership.role !== "owner") {
    return NextResponse.json({ error: "Somente o proprietário pode enviar o logo." }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Arquivo é obrigatório." }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Apenas imagens PNG, JPG ou WebP são aceitas." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "O logo deve ter no máximo 5MB." }, { status: 400 });
  }

  const ext = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const timestamp = Date.now();
  const path = `premium-workspaces/${ws.workspace.id}/logo-${timestamp}.${ext}`;

  const supabase = createServerClient({ useServiceRole: true });

  // Try "logos" bucket first, fall back to "talent-media"
  let logoUrl: string;
  const { error: uploadError } = await supabase.storage
    .from("logos")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    const { error: fallbackError } = await supabase.storage
      .from("talent-media")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (fallbackError) {
      console.error("[POST /api/agency/workspace/branding/logo]", fallbackError);
      return NextResponse.json({ error: "Não foi possível enviar o logo." }, { status: 400 });
    }

    const { data: urlData } = supabase.storage.from("talent-media").getPublicUrl(path);
    logoUrl = urlData.publicUrl;
  } else {
    const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path);
    logoUrl = urlData.publicUrl;
  }

  await supabase
    .from("premium_workspaces")
    .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
    .eq("id", ws.workspace.id);

  return NextResponse.json({ logoUrl });
}
