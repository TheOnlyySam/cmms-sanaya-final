import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ToastProvider } from "@/components/ui/ToastProvider";
import "@/styles/globals.css";
import "@/styles/print.css";

export const metadata: Metadata = {
  title: "SyncShield CMMS",
  description: "Professional CMMS for work orders, field reports, assets, clients, and PM schedules."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
