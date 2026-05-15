"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type WorkspacePortalData = {
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  /** "talent" = portal talent sidebar; "agent" = agency workspace sidebar */
  mode: "talent" | "agent";
};

type ContextValue = {
  workspace: WorkspacePortalData | null;
  setWorkspace: (data: WorkspacePortalData | null) => void;
};

const WorkspacePortalContext = createContext<ContextValue>({
  workspace: null,
  setWorkspace: () => {},
});

export function WorkspacePortalProvider({
  children,
  initialWorkspace = null,
}: {
  children: React.ReactNode;
  initialWorkspace?: WorkspacePortalData | null;
}) {
  const [workspace, setWorkspace] = useState<WorkspacePortalData | null>(initialWorkspace);

  useEffect(() => {
    setWorkspace(initialWorkspace);
  }, [
    initialWorkspace?.slug,
    initialWorkspace?.name,
    initialWorkspace?.logoUrl,
    initialWorkspace?.primaryColor,
    initialWorkspace?.accentColor,
  ]);

  return (
    <WorkspacePortalContext.Provider value={{ workspace, setWorkspace }}>
      {children}
    </WorkspacePortalContext.Provider>
  );
}

export function useWorkspacePortal() {
  return useContext(WorkspacePortalContext);
}
