"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppDataProvider } from "@/lib/data/AppDataContext";
import { AppHeader } from "@/components/layout/AppHeader";
import { MainNav } from "@/components/layout/MainNav";
import { useAuth } from "@/lib/auth/AuthContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, session, profile } = useAuth();
  const isLogin = pathname === "/login";

  useEffect(() => {
    if (!loading && !session && !isLogin) router.replace("/login");
    if (!loading && session && isLogin) router.replace("/dashboard");
  }, [isLogin, loading, router, session]);

  if (isLogin) return <>{children}</>;

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="brand-name">
          SYNC<span>SHIELD</span>
        </div>
        <p>Checking secure session...</p>
      </div>
    );
  }

  if (!session) return null;

  if (!profile) {
    return (
      <div className="auth-loading">
        <div className="brand-name">
          SYNC<span>SHIELD</span>
        </div>
        <p>Your Supabase Auth user is missing an app profile. Add a row in public.users for this user.</p>
      </div>
    );
  }

  if (profile.status !== "active") {
    return (
      <div className="auth-loading">
        <div className="brand-name">
          SYNC<span>SHIELD</span>
        </div>
        <p>This account is {profile.status}. Ask a CMMS Admin or Project Manager to activate it.</p>
      </div>
    );
  }

  return (
    <AppDataProvider>
      <AppHeader />
      <MainNav />
      {children}
    </AppDataProvider>
  );
}
