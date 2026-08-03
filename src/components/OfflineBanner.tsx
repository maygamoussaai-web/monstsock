import { WifiOff, RefreshCw } from "lucide-react";
import { useOnlineStatus } from "@/lib/offline";
import { useOfflineQueue } from "@/lib/offline-queue";

export function OfflineBanner() {
  const online = useOnlineStatus();
  const queue = useOfflineQueue();
  const pending = queue.length;

  if (online && pending === 0) return null;

  if (!online) {
    return (
      <div className="flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-center text-xs text-destructive-foreground">
        <WifiOff className="h-3.5 w-3.5 shrink-0" />
        {pending > 0
          ? `Hors ligne — ${pending} vente${pending > 1 ? "s" : ""} en attente de synchronisation.`
          : "Hors ligne — vous consultez les dernières données chargées. Les autres actions (réappro, fournée…) nécessitent une connexion."}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 bg-accent px-4 py-2 text-center text-xs text-accent-foreground">
      <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" />
      Synchronisation de {pending} vente{pending > 1 ? "s" : ""} en cours…
    </div>
  );
}