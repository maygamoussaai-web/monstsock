import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { getDebugResets, clearDebugResets } from "@/lib/debug-reset-watcher";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/debug")({ component: DebugPage });

function DebugPage() {
  const [entries, setEntries] = useState(getDebugResets());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Journal de diagnostic</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setEntries(getDebugResets())}
            className="rounded-full border border-border px-3 py-1.5 text-xs"
          >
            Actualiser
          </button>
          <button
            onClick={() => { clearDebugResets(); setEntries([]); }}
            className="rounded-full border border-destructive/40 px-3 py-1.5 text-xs text-destructive"
          >
            Vider
          </button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Liste des données qui se sont vidées après avoir été chargées, avec l'heure exacte.
      </p>
      {entries.length === 0 && (
        <p className="text-sm text-muted-foreground italic">Rien d'enregistré pour l'instant.</p>
      )}
      <div className="space-y-2">
        {entries.map((e, i) => (
          <div key={i} className="card-elegant p-3 text-sm">
            <p className="font-mono text-xs">{e.queryKey}</p>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(e.at)} · avait {e.from} élément(s) · {e.online ? "en ligne" : "hors ligne"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}