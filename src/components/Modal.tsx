import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

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

// Hauteur de la fenêtre mesurée en JS plutôt qu'en unités CSS (vh/dvh/svh) : ces
// unités sont peu fiables sur mobile, ce qui peut fausser le calcul du max-height.
function useViewportHeight() {
  const [height, setHeight] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 800
  );
  useEffect(() => {
    const update = () => setHeight(window.visualViewport?.height ?? window.innerHeight);
    update();
    window.visualViewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);
  return height;
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
  const viewportHeight = useViewportHeight();

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

  const maxW = size === "lg" ? "max-w-2xl" : "max-w-lg";
  const modalMaxHeight = Math.max(240, viewportHeight - 32);

  return (
    // Fond : plus de scroll ici, juste le centrage. Un seul conteneur défilant
    // dans toute la fenêtre (celui du contenu, plus bas) — deux zones "auto"
    // imbriquées de taille quasi identique piègent le geste de glisser sur
    // mobile (le navigateur le capture sur celle du fond, qui n'a rien à
    // défiler, et ne le transmet jamais à celle du contenu).
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-3 sm:p-4 ${
        closing ? "animate-modal-out" : "animate-overlay-in"
      }`}
      onClick={requestClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex w-full ${maxW} min-h-0 flex-col rounded-2xl border border-border bg-card shadow-[var(--shadow-lift)] overflow-hidden ${
          closing ? "animate-modal-out" : "animate-modal-in"
        }`}
        style={{ maxHeight: `${modalMaxHeight}px` }}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
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
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}