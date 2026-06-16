"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarClock, ClipboardList, FileText, Shield, Settings } from "lucide-react";
import { canManageSettingsForMember, resolveCurrentMember } from "@/lib/access-control";
import { useAuth } from "@/lib/auth/AuthContext";
import { useAppData } from "@/lib/data/AppDataContext";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/work-orders", label: "Work Orders", icon: ClipboardList },
  { href: "/pm-schedule", label: "PM Schedule", icon: CalendarClock },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin", label: "Admin", icon: Shield }
];

export function MainNav() {
  const pathname = usePathname();
  const { state } = useAppData();
  const { profile } = useAuth();
  const currentMember = resolveCurrentMember(state, profile?.teamMemberId);
  const canSeeSettings = profile ? profile.roleName === "Project Manager" : canManageSettingsForMember(state, currentMember);
  const visibleItems = items.filter((item) => {
    if (item.href === "/settings") return canSeeSettings;
    if (item.href === "/admin") return profile?.roleName === "CMMS Admin";
    return true;
  });

  return (
    <nav className="main-nav">
      {visibleItems.map((item) => {
        const active = pathname === item.href || (pathname === "/" && item.href === "/dashboard");
        const Icon = item.icon;

        return (
          <Link className={`nav-link ${active ? "active" : ""}`} href={item.href} key={item.href}>
            <span className="nav-icon">
              <Icon size={16} />
            </span>
            {item.label}
            {item.href === "/work-orders" ? <span className="nav-pill">{state.workOrders.length}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
