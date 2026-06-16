"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Remove",
  onCancel,
  onConfirm
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="modal-backdrop" />
        <AlertDialog.Content className="modal confirm-modal">
          <header className="confirm-header">
            <div className="confirm-icon">
              <AlertTriangle size={20} />
            </div>
            <div>
              <AlertDialog.Title className="modal-title">{title}</AlertDialog.Title>
              <AlertDialog.Description className="confirm-copy">{message}</AlertDialog.Description>
            </div>
          </header>
          <footer className="modal-footer">
            <AlertDialog.Cancel asChild>
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant="danger" onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
