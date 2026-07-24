import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBakery, useUpdateBakery, useCurrentMember, useSubscription } from "@/lib/queries";
import { Field, inputCls } from "@/components/Modal";
import { User, Pencil, Upload, Save, X, CreditCard } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({ component: ProfilePage });

function ProfilePage() {
  const { data: bakery } = useBakery();
  const { data: member } = useCurrentMember();
  const isOwner = member?.role === "owner";
  const updateBakery = useUpdateBakery();
  const { data: subscription } = useSubscription(isOwner ? bakery?.id : undefined);
  const { data: user, refetch: refetchUser } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [bakeryName, setBakeryName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName((user?.user_metadata as any)?.full_name ?? (user?.user_metadata as any)?.name ?? "");
    setBakeryName(bakery?.name ?? "");
    setLogoUrl((bakery as any)?.logo_url ?? null);
  }, [user, bakery, editing]);

  async function onPickFile(f: File) {
    if (f.size > 500 * 1024) {
      toast.error("Logo trop volumineux (max 500 Ko).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(String(reader.result));
    reader.readAsDataURL(f);
  }

  async function save() {
    if (!bakery) return;
    setSaving(true);
    try {
      if (name && name !== ((user?.user_metadata as any)?.full_name ?? "")) {
        const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
        if (error) throw error;
        await refetchUser();
      }
      const patch: any = {};
      if (isOwner) {
        if (bakeryName && bakeryName !== bakery.name) patch.name = bakeryName;
        if (logoUrl !== ((bakery as any).logo_url ?? null)) patch.logo_url = logoUrl;
      }
      if (Object.keys(patch).length) {
        await new Promise<void>((resolve, reject) =>
          updateBakery.mutate(
            { id: bakery.id, ...patch },
            { onSuccess: () => resolve(), onError: (e) => reject(e) }
          )
        );
      }
      toast.success("Profil mis à jour");
      setEditing(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erreur");
    } finally {
      setSaving(false);
    }
  }

  const displayName = (user?.user_metadata as any)?.full_name ?? (user?.user_metadata as any)?.name ?? "—";
  const currentLogo = (bakery as any)?.logo_url as string | null | undefined;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Profil</p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">Votre compte & boulangerie</h1>
      </div>

      <div className="card-elegant p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-secondary overflow-hidden">
            {currentLogo ? (
              <img src={currentLogo} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <User className="h-7 w-7 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs hover:bg-secondary"
            >
              <Pencil className="h-3.5 w-3.5" /> Modifier
            </button>
          )}
        </div>

        {!editing ? (
          <div className="space-y-3 text-sm">
            <Row label="Nom" value={displayName} />
            <Row label="E-mail" value={user?.email ?? "—"} />
            <Row label="Boulangerie" value={bakery?.name ?? "—"} />
            <Row label="Rôle" value={isOwner ? "Gérant" : "Employé"} />
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Votre nom">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </Field>
            <Field label="E-mail">
              <input value={user?.email ?? ""} disabled className={inputCls + " opacity-60"} />
            </Field>
            {isOwner ? (
              <>
                <Field label="Nom de la boulangerie">
                  <input
                    value={bakeryName}
                    onChange={(e) => setBakeryName(e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Logo de la boulangerie">
                  <div className="flex items-center gap-3">
                    <div className="grid h-16 w-16 place-items-center rounded-xl bg-secondary overflow-hidden shrink-0">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs hover:bg-secondary"
                    >
                      <Upload className="h-3.5 w-3.5" /> Choisir un fichier
                    </button>
                    {logoUrl && (
                      <button
                        type="button"
                        onClick={() => setLogoUrl(null)}
                        className="inline-flex items-center gap-1 rounded-xl border border-destructive/40 px-3 py-2 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-3.5 w-3.5" /> Retirer
                      </button>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => e.target.files?.[0] && onPickFile(e.target.files[0])}
                    />
                  </div>
                </Field>
              </>
            ) : (
              <div className="space-y-3 text-sm">
                <Row label="Boulangerie" value={bakery?.name ?? "—"} />
                <p className="text-[11px] text-muted-foreground">
                  Seul le gérant peut modifier le nom et le logo de la boulangerie.
                </p>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm"
              >
                Annuler
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm text-primary-foreground disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> Enregistrer
              </button>
            </div>
          </div>
        )}
      </div>

      {isOwner && <SubscriptionBlock sub={subscription} />}
    </div>
  );
}

function SubscriptionBlock({
  sub,
}: {
  sub:
    | null
    | undefined
    | {
        status: "trial" | "active" | "expired" | "blocked";
        plan: "monthly" | "annual" | null;
        trial_end: string | null;
        subscription_end: string | null;
      };
}) {
  if (!sub) return null;
  const daysLeft = (iso: string | null) => {
    if (!iso) return 0;
    const diff = new Date(iso).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };
  let label: React.ReactNode;
  let danger = false;
  if (sub.status === "trial") {
    label = `Essai gratuit fin dans ${daysLeft(sub.trial_end)} jours`;
  } else if (sub.status === "active" && sub.plan === "monthly") {
    label = `Abonnement mensuel fin dans ${daysLeft(sub.subscription_end)} jours`;
  } else if (sub.status === "active" && sub.plan === "annual") {
    label = `Abonnement annuel fin dans ${daysLeft(sub.subscription_end)} jours`;
  } else if (sub.status === "expired") {
    label = "Abonnement expiré";
    danger = true;
  } else if (sub.status === "blocked") {
    label = "Compte bloqué, contactez le support";
    danger = true;
  } else {
    return null;
  }
  return (
    <div className="card-elegant p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-accent">
          <CreditCard className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Abonnement</p>
          <p className={`mt-0.5 font-display text-lg ${danger ? "text-destructive" : ""}`}>{label}</p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-border/60 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
