import { useEffect, useRef } from "react";

/** Reusable state shape for components that manage their own ConfirmDialog. */
export interface ConfirmActionState {
  open: boolean;
  title: string;
  message: string;
  action: () => void;
}

export const CONFIRM_CLOSED: ConfirmActionState = { open: false, title: "", message: "", action: () => {} };

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A non-blocking confirmation dialog using the native <dialog> element.
 * Replaces window.confirm() calls throughout the app.
 *
 * Features:
 * - Native backdrop + focus trap via <dialog>
 * - Escape key closes (built-in)
 * - Styled to match the existing MIRA dark theme
 * - "danger" variant for destructive actions (red confirm button)
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Handle native close event (Escape key, backdrop click)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      if (open) onCancel();
    };

    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [open, onCancel]);

  // Close on backdrop click (click on <dialog> itself, not its content)
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onCancel();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      onClick={handleBackdropClick}
      aria-labelledby="confirm-dialog-title"
    >
      <div className="confirm-dialog-panel">
        <h3 id="confirm-dialog-title" className="confirm-dialog-title">
          {title}
        </h3>
        <p className="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="confirm-dialog-cancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-dialog-confirm ${variant === "danger" ? "danger" : ""}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
