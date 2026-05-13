"use client";

import { createContext, useContext, useState } from "react";

export type WorkspacePortalData = {
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
};

type ContextValue = {
  workspace: WorkspacePortalData | null;
  setWorkspace: (data: WorkspacePortalData | null) => void;
};

const WorkspacePortalContext = createContext<ContextValue>({
  workspace: null,
  setWorkspace: () => {},
});

export function WorkspacePortalProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<WorkspacePortalData | null>(null);
  return (
    <WorkspacePortalContext.Provider value={{ workspace, setWorkspace }}>
      {children}
    </WorkspacePortalContext.Provider>
  );
}

export function useWorkspacePortal() {
  return useContext(WorkspacePortalContext);
}
