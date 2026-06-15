import type { ReactNode } from "react";
import { Button } from "./Button";

export function Modal({
  open,
  title,
  subtitle,
  children,
  footer,
  onClose,
  wide = false
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`modal ${wide ? "modal-wide" : ""}`}>
        <header className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            ×
          </Button>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
