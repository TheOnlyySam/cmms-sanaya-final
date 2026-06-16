"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getCurrentTenantSubdomain } from "@/lib/tenancy";
import type { Id } from "@/lib/types";

interface AppUserProfile {
  id: Id;
  email: string;
  displayName: string;
  roleId: Id;
  roleName: string;
  companyId: Id | null;
  companySubdomain: string | null;
  teamMemberId: Id | null;
  status: string;
}

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: AppUserProfile | null;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; message?: string; profile?: AppUserProfile | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadProfile(userId: Id): Promise<AppUserProfile | null> {
  const supabase = createBrowserSupabaseClient() as any;
  const { data, error } = await supabase
    .from("users")
    .select("id,email,display_name,role_id,company_id,team_member_id,status,roles(name),company_settings(company_subdomain)")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Could not load app user profile.", error);
    return null;
  }

  if (!data) return null;
  const role = Array.isArray(data.roles) ? data.roles[0] : data.roles;
  const company = Array.isArray(data.company_settings) ? data.company_settings[0] : data.company_settings;

  return {
    id: data.id,
    email: data.email,
    displayName: data.display_name ?? data.email,
    roleId: data.role_id,
    roleName: role?.name ?? "",
    companyId: data.company_id ?? null,
    companySubdomain: company?.company_subdomain ?? null,
    teamMemberId: data.team_member_id,
    status: data.status
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  async function refreshProfileForSession(nextSession: Session | null) {
    if (!nextSession?.user) {
      setProfile(null);
      return;
    }
    const nextProfile = await loadProfile(nextSession.user.id);
    const tenantSubdomain = getCurrentTenantSubdomain();
    if (tenantSubdomain && nextProfile?.companySubdomain !== tenantSubdomain) {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      return;
    }
    setProfile(nextProfile);
  }

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await refreshProfileForSession(data.session);
      if (mounted) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void refreshProfileForSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  const value: AuthContextValue = {
    loading,
    session,
    user: session?.user ?? null,
    profile,
    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) return { ok: false, message: error.message };

      setSession(data.session);
      const nextProfile = data.session?.user ? await loadProfile(data.session.user.id) : null;
      const tenantSubdomain = getCurrentTenantSubdomain();
      if (tenantSubdomain && nextProfile?.companySubdomain !== tenantSubdomain) {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        return { ok: false, message: "This account does not belong to this company subdomain." };
      }
      setProfile(nextProfile);
      return { ok: true, profile: nextProfile };
    },
    signOut: async () => {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
    },
    refreshProfile: async () => refreshProfileForSession(session)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
