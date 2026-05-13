"use client";

import { useEffect } from "react";
import { useWorkspacePortal } from "@/lib/WorkspacePortalContext";

type WorkspaceData = {
  name: string;
  logoUrl: string | null;
  brandPrimaryColor: string | null;
  brandAccentColor: string | null;
};

type Props = {
  workspace: WorkspaceData;
  workspaceSlug: string;
  children: React.ReactNode;
};

export default function WorkspacePortalShell({ workspace, workspaceSlug, children }: Props) {
  const { setWorkspace } = useWorkspacePortal();

  useEffect(() => {
    setWorkspace({
      slug: workspaceSlug,
      name: workspace.name,
      logoUrl: workspace.logoUrl,
      primaryColor: workspace.brandPrimaryColor ?? "#1ABC9C",
      accentColor: workspace.brandAccentColor ?? "#27C1D6",
    });
    return () => setWorkspace(null);
  }, [workspaceSlug, workspace.name, workspace.logoUrl, workspace.brandPrimaryColor, workspace.brandAccentColor, setWorkspace]);

  return <>{children}</>;
}
