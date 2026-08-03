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
  // Sortie animée : on joue l'animation de fermeture avant de démonter.
  const [closing, setClosing] = useState(false);
  const closedRef = useRef(false);
  const pushedHistoryRef = useRef(false);

  const finalizeClose = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    setClosing(true);
    window.setTimeout(onClose, 150);
  }, [onClose]);

  // Fermeture demandée depuis l'UI (croix, clic hors modal, Échap) : on passe par
  // history.back() pour que ça reste cohérent avec le bouton retour du téléphone,
  // qui déclenchera le même popstate ci-dessous.
  const requestClose = useCallback(() => {
    if (closedRef.current) return;
    if (pushedHistoryRef.current) {
      window.history.back();
    } else {
      finalizeClose();
    }
  }, [finalizeClose]);

  useEffect(() => {
    // Un formulaire ouvert = une entrée d'historique. Le bouton retour du téléphone
    // (ou du navigateur) ferme alors le formulaire au lieu de quitter la page/l'app,
    // et n'enregistre rien (l'état du formulaire est local tant qu'on n'a pas validé).
    window.history.pushState({ __modal: true }, "");
    pushedHistoryRef.current = true;

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
      // Si le composant se démonte sans que l'utilisateur soit passé par le bouton
      // retour (fermeture via la croix, ou changement de page), on retire nous-mêmes
      // l'entrée d'historique ajoutée pour ne pas la laisser traîner.
      if (pushedHistoryRef.current && !closedRef.current) {
        window.history.back();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxW = size === "lg" ? "max-w-2xl" : "max-w-lg";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-foreground/30 backdrop-blur-sm p-3 py-6 sm:p-4 ${
        closing ? "animate-modal-out" : "animate-overlay-in"
      }`}
      onClick={requestClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex w-full ${maxW} flex-col rounded-2xl border border-border bg-card shadow-[var(--shadow-lift)] overflow-hidden my-auto ${
          closing ? "animate-modal-out" : "animate-modal-in"
        }`}
        style={{ maxHeight: "calc(100vh - 3rem)" }}
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
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}