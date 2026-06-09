import { useToast } from "../../context/ToastContext";

/**
 * Renders the toast stack. Place once at the app root level.
 * Toasts auto-dismiss; no close button needed.
 */
export default function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast-item">
          {toast.message}
        </div>
      ))}
    </div>
  );
}
