import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">□</div>
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </div>
  );
}
