import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

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
  const [closing, setClosing] = useState(false);
  const closedRef = useRef(false);
  const pushedHistoryRef = useRef(false);
  // Rendu uniquement côté navigateur (document.body n'existe pas en SSR).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const finalizeClose = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    setClosing(true);
    window.setTimeout(onClose, 150);
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (closedRef.current) return;
    if (pushedHistoryRef.current) {
      window.history.back();
    } else {
      finalizeClose();
    }
  }, [finalizeClose]);

  useEffect(() => {
    if (!pushedHistoryRef.current) {
      window.history.pushState({ __modal: true }, "");
      pushedHistoryRef.current = true;
    }

    const onPopState = () => finalizeClose();
    window.addEventListener("popstate", onPopState);

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && requestClose();
    window.addEventListener("keydown", onKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [finalizeClose, requestClose]);

  if (!mounted) return null;

  const maxW = size === "lg" ? "max-w-2xl" : "max-w-lg";

  const node = (
    // Rendu via un portail directement sous <body> : entièrement affranchi de tout
    // ancêtre de la page (y compris les animations d'entrée de page qui appliquent
    // un transform et "piègent" sinon les éléments position:fixed).
    <div
      className={`fixed inset-0 z-50 flex justify-center overflow-y-auto bg-foreground/30 backdrop-blur-sm px-3 py-8 sm:px-4 ${
        closing ? "animate-modal-out" : "animate-overlay-in"
      }`}
      style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
      onClick={requestClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`h-fit w-full ${maxW} self-start rounded-2xl border border-border bg-card shadow-[var(--shadow-lift)] overflow-hidden ${
          closing ? "animate-modal-out" : "animate-modal-in"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h3 className="font-display text-lg sm:text-xl truncate">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
          <button
            onClick={requestClose}
            className="shrink-0 rounded-full p-1.5 hover:bg-secondary transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4 icon-pop" />
          </button>
        </div>
        <div className="px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}