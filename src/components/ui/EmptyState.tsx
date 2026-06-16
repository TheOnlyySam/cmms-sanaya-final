import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon ?? <Inbox size={20} strokeWidth={1.8} />}</div>
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </div>
  );
}
