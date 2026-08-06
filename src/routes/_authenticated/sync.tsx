import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, Trash2, CheckCircle2, AlertTriangle, CloudUpload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useOfflineQueue, removeAction, retryAction } from "@/lib/offline-queue";
import { useRetryQueue } from "@/lib/queries";
import { EmptyState } from "@/components/Loader";
import { Reveal } from "@/components/motion";

export const Route = createFileRoute("/_authenticated/sync")({
  head: () => ({
    meta: [
      { title: "À synchroniser — MonStock" },
      {
        name: "description",
        content:
          "Suivez les actions enregistrées hors ligne dans MonStock et relancez leur envoi vers le serveur.",
      },
      { property: "og:title", content: "À synchroniser — MonStock" },
      {
        property: "og:description",
        content: "Actions hors ligne en attente d'envoi et erreurs de synchronisation.",
      },
    ],
  }),
  component: SyncPage,
});

function SyncPage() {
  const queue = useOfflineQueue();
  const retryAll = useRetryQueue();
  const [busy, setBusy] = useState(false);

  const pending = queue.filter((q) => q.status === "pending");
  const failed = queue.filter((q) => q.status === "failed");

  async function run() {
    setBusy(true);
    try {
      await retryAll();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">À synchroniser</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Les actions faites sans réseau sont conservées ici jusqu'à leur envoi. Rien n'est perdu.
          </p>
        </div>
        <button
          onClick={run}
          disabled={busy || queue.length === 0}
          className="btn-press btn-shimmer inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
          Tout envoyer
        </button>
      </div>

      {queue.length === 0 && (
        <div className="mt-10">
          <EmptyState
            icon={CheckCircle2}
            title="Tout est synchronisé"
            description="Aucune action en attente : vos données sont à jour sur le serveur."
          />
        </div>
      )}

      {pending.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            En attente ({pending.length})
          </h2>
          <ul className="mt-3 space-y-2 stagger">
            {pending.map((a) => (
              <Reveal key={a.local_id}>
                <li className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                  <CloudUpload className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{a.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(a.queued_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      {failed.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-destructive">
            Refusées par le serveur ({failed.length})
          </h2>
          <ul className="mt-3 space-y-2 stagger">
            {failed.map((a) => (
              <Reveal key={a.local_id}>
                <li className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{a.label}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-destructive">
                        {a.last_error ?? "Erreur inconnue"}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {new Date(a.queued_at).toLocaleString("fr-FR")} · {a.attempts} tentative
                        {a.attempts > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        retryAction(a.local_id);
                        toast.info("Action remise en file d'attente.");
                      }}
                      className="btn-press inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Réessayer
                    </button>
                    <button
                      onClick={() => {
                        removeAction(a.local_id);
                        toast.success("Action abandonnée.");
                      }}
                      className="btn-press inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Abandonner
                    </button>
                  </div>
                </li>
              </Reveal>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
