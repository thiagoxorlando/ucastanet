"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getUserRole, type UserRole } from "./getUserRole";

type RoleContextValue = {
  role: UserRole | null;
  loading: boolean;
};

const RoleContext = createContext<RoleContextValue>({ role: null, loading: true });

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole]       = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserRole().then((r) => {
      setRole(r);
      setLoading(false);
    });
  }, []);

  return (
    <RoleContext.Provider value={{ role, loading }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
