import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

export const inputCls =
  "w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm outline-none focus:border-accent transition-colors";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </label>
  );
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  size = "md",
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "md" | "lg";
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const maxW = size === "lg" ? "max-w-2xl" : "max-w-lg";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-3 sm:p-4 animate-fade-up"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex w-full ${maxW} flex-col rounded-2xl border border-border bg-card shadow-[var(--shadow-lift)] overflow-hidden`}
        style={{ maxHeight: "calc(100dvh - 1.5rem)" }}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h3 className="font-display text-lg sm:text-xl truncate">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 hover:bg-secondary"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
