"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppDataProvider } from "@/lib/data/AppDataContext";
import { AppHeader } from "@/components/layout/AppHeader";
import { MainNav } from "@/components/layout/MainNav";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/lib/auth/AuthContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, session, profile } = useAuth();
  const toast = useToast();
  const isLogin = pathname === "/login";
  const isHome = pathname === "/";
  const isPublic = isLogin || isHome;
  const isAdminRoute = pathname.startsWith("/admin");
  const isSettingsRoute = pathname.startsWith("/settings");

  useEffect(() => {
    if (!loading && !session && !isPublic) router.replace("/login");
    if (!loading && session && isLogin) router.replace(profile?.roleName === "CMMS Admin" ? "/admin" : "/dashboard");
    if (!loading && session && profile && isAdminRoute && profile.roleName !== "CMMS Admin") router.replace("/dashboard");
    if (!loading && session && profile && isSettingsRoute && profile.roleName !== "Project Manager") {
      router.replace(profile.roleName === "CMMS Admin" ? "/admin" : "/dashboard");
    }
  }, [isAdminRoute, isLogin, isPublic, isSettingsRoute, loading, profile, router, session]);

  useEffect(() => {
    function handleRejection(event: PromiseRejectionEvent) {
      console.error(event.reason);
      toast.error("A database request failed. Please refresh and try again.");
    }

    function handleError(event: ErrorEvent) {
      console.error(event.error ?? event.message);
      toast.error("Something went wrong in the app. Please try again.");
    }

    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);
    return () => {
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
    };
  }, [toast]);

  if (isPublic) return <>{children}</>;

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
