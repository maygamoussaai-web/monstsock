import { WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useOnlineStatus } from "@/lib/offline";
import { usePendingCount } from "@/lib/offline-queue";

export function OfflineBanner() {
  const online = useOnlineStatus();
  const { pending, failed } = usePendingCount();

  if (online && pending === 0 && failed === 0) return null;

  if (!online) {
    return (
      <div className="flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-center text-xs text-destructive-foreground">
        <WifiOff className="h-3.5 w-3.5 shrink-0" />
        {pending + failed > 0 ? (
          <span>
            Hors ligne — {pending + failed} action{pending + failed > 1 ? "s" : ""} enregistrée
            {pending + failed > 1 ? "s" : ""} sur cet appareil, envoi au retour du réseau.
          </span>
        ) : (
          <span>Hors ligne — vous continuez à travailler, tout sera synchronisé plus tard.</span>
        )}
      </div>
    );
  }

  if (pending > 0) {
    return (
      <div className="flex items-center justify-center gap-2 bg-accent px-4 py-2 text-center text-xs text-accent-foreground">
        <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" />
        Synchronisation de {pending} action{pending > 1 ? "s" : ""}…
      </div>
    );
  }

  return (
    <Link
      to="/sync"
      className="flex items-center justify-center gap-2 bg-destructive/10 px-4 py-2 text-center text-xs text-destructive hover:bg-destructive/15"
    >
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      {failed} action{failed > 1 ? "s" : ""} non synchronisée{failed > 1 ? "s" : ""} — voir le détail
    </Link>
  );
}
