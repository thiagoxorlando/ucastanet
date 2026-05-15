"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import WorkspaceTalentSidebar from "./WorkspaceTalentSidebar";
import { WorkspacePortalData, WorkspacePortalProvider, useWorkspacePortal } from "@/lib/WorkspacePortalContext";

export default function DashboardShell({
  children,
  initialWorkspacePortal = null,
}: {
  children: React.ReactNode;
  initialWorkspacePortal?: WorkspacePortalData | null;
}) {
  return (
    <WorkspacePortalProvider initialWorkspace={initialWorkspacePortal}>
      <DashboardShellFrame>{children}</DashboardShellFrame>
    </WorkspacePortalProvider>
  );
}

function DashboardShellFrame({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { workspace } = useWorkspacePortal();
  const isTalentPortal = workspace?.mode === "talent";
  const contentOffsetClass = isTalentPortal ? "lg:ml-72" : "lg:ml-64";

  // Talent portal → branded talent sidebar; all other cases → main sidebar
  // (agents use the main Sidebar which already renders AGENCY_AGENT_PREMIUM_NAV)
  const homeHref = isTalentPortal
    ? `/talent/workspaces/${workspace!.slug}`
    : undefined;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      {isTalentPortal ? (
        <WorkspaceTalentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      ) : (
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      <div className={`${contentOffsetClass} flex flex-1 flex-col overflow-hidden`}>
        <Topbar
          onMenuClick={() => setSidebarOpen(true)}
          homeHref={homeHref}
        />
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
