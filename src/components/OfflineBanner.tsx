import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/offline";

// Bandeau affiché uniquement hors ligne. Étape 1 du mode hors ligne : l'app
// reste consultable (dernières données déjà chargées en mémoire), mais toute
// action qui écrit (vente, réappro, fournée...) nécessite encore le réseau.
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-center text-xs text-destructive-foreground">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      Hors ligne — vous consultez les dernières données chargées. Les actions (vente, réappro, fournée…) nécessitent une connexion.
    </div>
  );
}