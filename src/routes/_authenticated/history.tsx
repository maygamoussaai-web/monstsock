import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useLedger } from "@/lib/queries";
import { formatDate, formatMoney, formatQty, UNIT_LABEL } from "@/lib/format";
import { History, Flame, ShoppingBag, Package2, AlertTriangle, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/history")({ component: HistoryPage });

type LedgerRow = ReturnType<typeof useLedger> extends { data?: (infer R)[] | undefined } ? R : any;

type Group = {
  key: string;
  kind: "batch" | "sale" | "purchase" | "loss" | "adjustment";
  createdAt: string;
  entries: LedgerRow[];
};

const KIND_META = {
  batch: { label: "Fournée", icon: Flame, tone: "text-primary" },
  sale: { label: "Vente", icon: ShoppingBag, tone: "text-accent" },
  purchase: { label: "Réapprovisionnement", icon: Package2, tone: "text-accent" },
  loss: { label: "Perte", icon: AlertTriangle, tone: "text-destructive" },
  adjustment: { label: "Ajustement", icon: ShieldCheck, tone: "text-muted-foreground" },
} as const;

const PERIODS = [
  { key: "all", label: "Tout" },
  { key: "today", label: "Aujourd'hui" },
  { key: "week", label: "Cette semaine" },
  { key: "month", label: "Ce mois" },
] as const;

function HistoryPage() {
  const { data: ledger = [] } = useLedger(1000);
  const [kind, setKind] = useState<string>("all");
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["key"]>("all");
  const [q, setQ] = useState("");

  const groups = useMemo<Group[]>(() => {
    const since = (() => {
      const now = new Date();
      if (period === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      if (period === "week") { const d = new Date(now); d.setDate(d.getDate() - 7); return d.getTime(); }
      if (period === "month") { const d = new Date(now); d.setMonth(d.getMonth() - 1); return d.getTime(); }
      return 0;
    })();

    const byBatch = new Map<string, Group>();
    const list: Group[] = [];

    for (const l of ledger as LedgerRow[]) {
      if (new Date(l.created_at).getTime() < since) continue;
      const k = l.kind;
      if (k === "batch_consume" || k === "batch_produce") {
        const key = `batch:${l.ref_id ?? l.id}`;
        let g = byBatch.get(key);
        if (!g) {
          g = { key, kind: "batch", createdAt: l.created_at, entries: [] };
          byBatch.set(key, g);
          list.push(g);
        }
        g.entries.push(l);
        if (l.created_at < g.createdAt) g.createdAt = l.created_at;
      } else if (k === "sale" || k === "purchase" || k === "loss" || k === "adjustment") {
        list.push({ key: l.id, kind: k, createdAt: l.created_at, entries: [l] });
      }
    }

    list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return list.filter((g) => {
      if (kind !== "all" && g.kind !== kind) return false;
      if (q) {
        const hay = g.entries
          .map((e) => `${e.raw_materials?.name ?? ""} ${e.products?.name ?? ""} ${e.note ?? ""}`)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [ledger, kind, q, period]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Historique</p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">Journal des mouvements</h1>
        <p className="mt-1 text-sm text-muted-foreground">Chaque entrée est immuable et horodatée — traçabilité totale.</p>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex rounded-full border border-border bg-card p-1 overflow-x-auto">
            {(["all", "batch", "sale", "purchase", "loss"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`px-3 py-1.5 text-xs whitespace-nowrap rounded-full transition-colors ${kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {k === "all" ? "Tout" : KIND_META[k as keyof typeof KIND_META].label}
              </button>
            ))}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher mot-clé, produit, matière…"
            className="rounded-full border border-input bg-card px-4 py-2 text-sm outline-none focus:border-accent max-w-xs flex-1"
          />
        </div>
        <div className="flex rounded-full border border-border bg-card p-1 w-fit overflow-x-auto">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 text-xs whitespace-nowrap rounded-full transition-colors ${period === p.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 && (
        <div className="card-elegant p-10 text-center text-sm text-muted-foreground">
          <History className="mx-auto mb-2 h-6 w-6 opacity-40" />
          Aucun mouvement pour ces filtres.
        </div>
      )}

      <div className="grid gap-3">
        {groups.map((g) => (
          <GroupCard key={g.key} group={g} />
        ))}
      </div>
    </div>
  );
}

function GroupCard({ group }: { group: Group }) {
  const meta = KIND_META[group.kind];
  const Icon = meta.icon;
  const dt = new Date(group.createdAt);
  const time = dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="card-elegant p-4">
      <div className="flex items-start gap-3">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-secondary ${meta.tone}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-bold text-sm">{meta.label}</p>
            <p className="text-xs text-muted-foreground shrink-0">
              {formatDate(dt)} · {time}
            </p>
          </div>
          <div className="mt-2 space-y-0.5 text-xs sm:text-sm">
            {group.kind === "batch" && <BatchLines entries={group.entries} />}
            {group.kind === "sale" && <SaleLines entries={group.entries} />}
            {group.kind === "purchase" && <PurchaseLines entries={group.entries} />}
            {group.kind === "loss" && <LossLines entries={group.entries} />}
            {group.kind === "adjustment" && <PlainLines entries={group.entries} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function line(sign: "+" | "-", qty: number, unit: string | undefined, name: string) {
  const u = unit ? UNIT_LABEL[unit] ?? unit : "";
  return `${sign}${formatQty(qty, u)} ${name}`.trim();
}

function BatchLines({ entries }: { entries: LedgerRow[] }) {
  const consumed = entries.filter((e) => e.kind === "batch_consume");
  const produced = entries.filter((e) => e.kind === "batch_produce");
  const matValue = consumed.reduce((s, e) => s + e.delta_value, 0);
  const prodValue = produced.reduce((s, e) => s + e.delta_value, 0);
  return (
    <>
      {consumed.map((e) => (
        <p key={e.id}>• {line("-", Math.abs(e.delta_quantity), e.raw_materials?.unit, e.raw_materials?.name ?? "—")}</p>
      ))}
      {produced.map((e) => (
        <p key={e.id}>• {line("+", Math.abs(e.delta_quantity), e.products?.unit, e.products?.name ?? "—")}</p>
      ))}
      {consumed.length > 0 && (
        <p className="text-muted-foreground">
          Valeur matières premières : <span className="text-destructive">{formatMoney(matValue)}</span>
        </p>
      )}
      {produced.length > 0 && (
        <p className="text-muted-foreground">
          Valeur produits finis : <span className="text-accent">+{formatMoney(prodValue)}</span>
        </p>
      )}
    </>
  );
}

function SaleLines({ entries }: { entries: LedgerRow[] }) {
  const e = entries[0];
  return (
    <>
      <p>• {line("-", Math.abs(e.delta_quantity), e.products?.unit, e.products?.name ?? "—")}</p>
      <p className="text-muted-foreground">
        Chiffre d'affaires : <span className="text-accent">+{formatMoney(e.delta_value)}</span>
      </p>
    </>
  );
}

function PurchaseLines({ entries }: { entries: LedgerRow[] }) {
  const e = entries[0];
  return (
    <>
      <p>• {line("+", Math.abs(e.delta_quantity), e.raw_materials?.unit, e.raw_materials?.name ?? "—")}</p>
      <p className="text-muted-foreground">
        Achats : <span className="text-accent">+{formatMoney(e.delta_value)}</span>
      </p>
    </>
  );
}

function LossLines({ entries }: { entries: LedgerRow[] }) {
  const e = entries[0];
  const name = e.products?.name ?? e.raw_materials?.name ?? "—";
  const unit = e.products?.unit ?? e.raw_materials?.unit;
  return (
    <>
      <p>• {line("-", Math.abs(e.delta_quantity), unit, name)}</p>
      <p className="text-muted-foreground">
        Pertes : <span className="text-destructive">{formatMoney(-Math.abs(e.delta_value))}</span>
      </p>
    </>
  );
}

function PlainLines({ entries }: { entries: LedgerRow[] }) {
  return (
    <>
      {entries.map((e) => (
        <p key={e.id}>• {e.note || "—"}</p>
      ))}
    </>
  );
}
