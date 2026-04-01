"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRole } from "@/lib/RoleProvider";

type UserProfile = {
  displayName: string;
  email: string;
  initials: string;
  loading: boolean;
};

export function useUserProfile(): UserProfile {
  const { role } = useRole();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      setEmail(user.email ?? "");

      if (role === "talent") {
        const { data } = await supabase
          .from("talent_profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        setDisplayName(data?.full_name ?? user.email ?? "");
      } else if (role === "agency") {
        const { data } = await supabase
          .from("agencies")
          .select("company_name")
          .eq("id", user.id)
          .single();
        setDisplayName(data?.company_name ?? user.email ?? "");
      } else {
        setDisplayName(user.email ?? "");
      }

      setLoading(false);
    }
    load();
  }, [role]);

  const initials = displayName
    ? displayName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  return { displayName, email, initials, loading };
}
