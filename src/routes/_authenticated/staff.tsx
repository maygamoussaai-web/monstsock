import { BaguetteLoader } from "@/components/Loader";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useBakery,
  useCurrentMember,
  useCreateInvitation,
  useRemoveMember,
  useTransferOwnership,
  useMemberActivity,
} from "@/lib/queries";
import { requireOwner } from "@/routes/_authenticated/route";
import { Modal } from "@/components/Modal";
import {
  Users, Link2, Copy, Crown, Trash2, UserRound, Loader2,
  ShoppingCart, Flame, ShoppingBag, TrendingDown, ClipboardList,
  ArrowLeft, Clock,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/staff")({
  // ── Protection serveur (correction C4) ───────────────────────────────────
  // requireOwner() vérifie le rôle directement en base avant le rendu.
  // Un employé qui navigue manuellement vers /staff est redirigé vers /dashboard
  // sans que le composant ne soit jamais affiché — même sans JavaScript.
  beforeLoad: async () => {
    await requireOwner();
  },
  component: StaffPage,
});

type MemberRow = { user_id: string; email: string | null; role: "owner" | "staff"; created_at: string };

function useListBakeryMembers(bakeryId: string | undefined) {
  return useQuery({
    queryKey: ["staff-members", bakeryId],
    enabled: !!bakeryId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_bakery_members" as any, { _bakery_id: bakeryId });
      if (error) throw error;
      return (data ?? []) as MemberRow[];
    },
  });
}

function StaffPage() {
  const { data: member, isLoading: memLoading } = useCurrentMember();
  const { data: bakery } = useBakery();

  // Le beforeLoad garantit qu'on n'arrive ici qu'en tant qu'owner.
  // Ce garde React est conservé comme filet de sécurité UI (ex: changement de rôle
  // pendant la session sans rechargement de page).
  if (memLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <BaguetteLoader size={40} />
      </div>
    );
  }

  if (member?.role !== "owner") {
    return (
      <div className="max-w-xl mx-auto card-elegant p-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Accès restreint</p>
        <h1 className="mt-2 font-display text-2xl">Cette page est réservée au gérant</h1>
      </div>
    );
  }

  return <OwnerView bakeryId={member.bakery_id} bakeryName={bakery?.name ?? ""} />;
}

function OwnerView({ bakeryId, bakeryName }: { bakeryId: string; bakeryName: string }) {
  const { data: members = [], isLoading } = useListBakeryMembers(bakeryId);
  const createInvite = useCreateInvitation();
  const removeMember = useRemoveMember();
  const transferOwn = useTransferOwnership();

  const [selected, setSelected] = useState<MemberRow | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const staffCount = useMemo(() => members.filter((m) => m.role === "staff").length, [members]);
  const canInvite = staffCount < 3;

  async function generate() {
    try {
      const token = await createInvite.mutateAsync(bakeryId);
      const url = `${window.location.origin}/join/${token}`;
      setInviteLink(url);
    } catch {
      /* toast handled in mutation */
    }
  }

  async function copyLink() {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Lien copié");
    } catch {
      toast.error("Impossible de copier");
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Équipe</p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">Mon personnel</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gérez les employés de {bakeryName || "votre boulangerie"} (3 maximum).
        </p>
      </div>

      <div className="card-elegant p-6 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-accent">
              <Link2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-lg">Inviter un employé</p>
              <p className="text-xs text-muted-foreground">
                {staffCount}/3 employé{staffCount > 1 ? "s" : ""} · rôle « staff »
              </p>
            </div>
          </div>
          <button
            onClick={generate}
            disabled={!canInvite || createInvite.isPending}
            className="btn-press btn-shimmer inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs text-primary-foreground disabled:opacity-50"
          >
            {createInvite.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Générer un lien d'invitation
          </button>
        </div>
        {!canInvite && (
          <p className="text-xs text-destructive">
            Vous avez atteint la limite de 3 employés. Retirez un employé pour en inviter un autre.
          </p>
        )}
        {inviteLink && (
          <div className="rounded-xl border border-border bg-secondary/50 p-3 flex items-center gap-2">
            <code className="flex-1 truncate text-xs">{inviteLink}</code>
            <button
              onClick={copyLink}
              className="btn-press inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-secondary"
            >
              <Copy className="h-3.5 w-3.5" /> Copier
            </button>
          </div>
        )}
      </div>

      <div className="card-elegant p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-muted-foreground" />
          <p className="font-display text-lg">Membres</p>
        </div>
        {isLoading ? (
          <div className="py-8 flex justify-center text-muted-foreground">
            <BaguetteLoader size={40} />
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun membre pour le moment.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center gap-3 py-3">
                <button
                  onClick={() => setSelected(m)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left group"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary">
                    {m.role === "owner" ? (
                      <Crown className="h-4 w-4 text-accent" />
                    ) : (
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm truncate group-hover:text-accent transition-colors">
                      {m.email ?? m.user_id.slice(0, 8)}
                    </p>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {m.role === "owner" ? "Gérant" : "Employé"}
                    </p>
                  </div>
                </button>
                {m.role === "staff" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        if (confirm("Transférer la gérance à cet employé ? Vous deviendrez employé.")) {
                          transferOwn.mutate({ bakery_id: bakeryId, new_owner: m.user_id });
                        }
                      }}
                      className="btn-press inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-secondary"
                    >
                      <Crown className="h-3.5 w-3.5" /> Transférer
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Retirer cet employé de la boulangerie ?")) {
                          removeMember.mutate({ bakery_id: bakeryId, user_id: m.user_id });
                        }
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Retirer
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <MemberActivityModal
          member={selected}
          bakeryId={bakeryId}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Journal d'activité d'un membre : liste des actions, puis détail au clic.
// ─────────────────────────────────────────────────────────────────────────────

type ActivityRow = {
  id: string;
  bakery_id: string;
  user_id: string;
  action_type: string;
  description: string | null;
  created_at: string;
};

// Libellé + icône lisibles pour chaque type d'action enregistré par activity_log
// (voir record_purchase / record_batch / record_product_sale / record_loss / close_sales_session).
const ACTION_META: Record<string, { label: string; icon: typeof ShoppingCart }> = {
  purchase: { label: "Réapprovisionnement", icon: ShoppingCart },
  batch: { label: "Fournée", icon: Flame },
  sale: { label: "Vente", icon: ShoppingBag },
  loss: { label: "Perte", icon: TrendingDown },
  sales_session: { label: "Clôture de session", icon: ClipboardList },
};

function actionMeta(type: string) {
  return ACTION_META[type] ?? { label: type, icon: ClipboardList };
}

function MemberActivityModal({
  member,
  bakeryId,
  onClose,
}: {
  member: MemberRow;
  bakeryId: string;
  onClose: () => void;
}) {
  const { data: activity = [], isLoading } = useMemberActivity(member.user_id, bakeryId);
  const [detail, setDetail] = useState<ActivityRow | null>(null);

  // Vue détail d'une action précise — remplace la liste tant qu'elle est ouverte.
  if (detail) {
    const meta = actionMeta(detail.action_type);
    const Icon = meta.icon;
    return (
      <Modal
        title="Détail de l'action"
        subtitle={member.email ?? "Membre"}
        onClose={onClose}
        size="lg"
      >
        <button
          onClick={() => setDetail(null)}
          className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Retour au journal
        </button>
        <div className="rounded-xl border border-border bg-card/60 p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-accent shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {meta.label}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <Clock className="h-3 w-3" />
                {new Date(detail.created_at).toLocaleString("fr-FR", {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
              Description
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {detail.description ?? "Aucune description disponible."}
            </p>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={member.email ?? "Membre"}
      subtitle={member.role === "owner" ? "Gérant" : "Employé"}
      onClose={onClose}
      size="lg"
    >
      {isLoading ? (
        <div className="py-8 flex justify-center text-muted-foreground">
          <BaguetteLoader size={40} />
        </div>
      ) : activity.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune action enregistrée pour ce membre.</p>
      ) : (
        <ul className="space-y-2">
          {activity.map((a) => {
            const meta = actionMeta(a.action_type);
            const Icon = meta.icon;
            return (
              <li key={a.id}>
                <button
                  onClick={() => setDetail(a)}
                  className="btn-press w-full rounded-xl border border-border bg-card/60 p-3 text-sm flex items-start gap-3 text-left hover:border-accent/50 hover:bg-secondary/40 transition-colors"
                >
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-secondary text-accent shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {meta.label}
                    </p>
                    <p className="mt-0.5 truncate">{a.description ?? "—"}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
