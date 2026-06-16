"use client";

import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthContext";
import Link from "next/link";

export function AppHeader() {
  const { profile, signOut } = useAuth();

  return (
    <header className="app-header">
      <div className="brand">
        <svg className="brand-mark" viewBox="0 0 96 104" role="img" aria-label="SyncShield">
          <defs>
            <marker id="appHeaderArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M 0 1 L 9 5 L 0 9 Z" fill="#0A1628" />
            </marker>
          </defs>
          <path d="M 13 6 L 83 6 Q 91 6 91 14 L 91 60 Q 91 81 48 98 Q 5 81 5 60 L 5 14 Q 5 6 13 6 Z" fill="#00C8D4" />
          <path d="M 62 43 A 19 19 0 0 0 31 62" stroke="#0A1628" strokeWidth="4" fill="none" strokeLinecap="round" markerEnd="url(#appHeaderArrow)" />
          <path d="M 34 72 A 19 19 0 0 0 65 53" stroke="#0A1628" strokeWidth="4" fill="none" strokeLinecap="round" markerEnd="url(#appHeaderArrow)" />
          <circle cx="48" cy="58" r="3.2" fill="#0A1628" opacity="0.8" />
        </svg>
        <div>
          <div className="brand-name">
            SYNC<span>SHIELD</span>
          </div>
          <div className="brand-tag">CMMS FIELD OPERATIONS</div>
        </div>
      </div>
      <div className="header-user">
        <div>
          <strong>{profile?.displayName ?? "Signed in"}</strong>
          <span>{profile?.roleName ?? "CMMS User"}</span>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/">Home</Link>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => void signOut()}>
          Sign Out
        </Button>
      </div>
    </header>
  );
}
