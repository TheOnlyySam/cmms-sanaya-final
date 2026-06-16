"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canManageSettingsForMember, resolveCurrentMember } from "@/lib/access-control";
import { useAppData } from "@/lib/data/AppDataContext";
import { useAuth } from "@/lib/auth/AuthContext";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/work-orders", label: "Work Orders", icon: "☷" },
  { href: "/pm-schedule", label: "PM Schedule", icon: "◷" },
  { href: "/reports", label: "Reports", icon: "▤" },
  { href: "/settings", label: "Settings", icon: "⚙" }
];

export function MainNav() {
  const pathname = usePathname();
  const { state } = useAppData();
  const { profile } = useAuth();
  const currentMember = resolveCurrentMember(state, profile?.teamMemberId);
  const canSeeSettings = profile ? ["CMMS Admin", "Project Manager"].includes(profile.roleName) : canManageSettingsForMember(state, currentMember);
  const visibleItems = items.filter((item) => item.href !== "/settings" || canSeeSettings);

  return (
    <nav className="main-nav">
      {visibleItems.map((item) => {
        const active = pathname === item.href || (pathname === "/" && item.href === "/dashboard");
        return (
          <Link className={`nav-link ${active ? "active" : ""}`} href={item.href} key={item.href}>
            <span className="nav-icon">{item.icon}</span>
            {item.label}
            {item.href === "/work-orders" ? <span className="nav-pill">{state.workOrders.length}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
