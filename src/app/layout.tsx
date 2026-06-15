import type { Metadata } from "next";
import { AppDataProvider } from "@/lib/data/AppDataContext";
import { AppHeader } from "@/components/layout/AppHeader";
import { MainNav } from "@/components/layout/MainNav";
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
          <AppDataProvider>
            <AppHeader />
            <MainNav />
            {children}
          </AppDataProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
