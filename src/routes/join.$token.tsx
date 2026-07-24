// Fichier à placer à : src/routes/join.$token.tsx (remplace entièrement l'ancien)
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAcceptInvitation } from "@/lib/queries";
import { Loader2, Wheat, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/join/$token")({ ssr: false, component: JoinPage });

function usePreview(token: string) {
  return useQuery({
    queryKey: ["invite-preview", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_invitation_preview" as any, { _token: token });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return row as { bakery_name: string | null; valid: boolean; reason: string | null };
    },
  });
}

function JoinPage() {
  const { token } = Route.useParams();
  const { data: preview, isLoading } = usePreview(token);
  const [user, setUser] = useState<any>(undefined); // undefined = en cours, null = déconnecté
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accept = useAcceptInvitation();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleAccept() {
    try {
      await accept.mutateAsync(token);
      setAccepted(true);
      setTimeout(() => (window.location.href = "/dashboard"), 1200);
    } catch (e: any) {
      setError(e.message ?? "Impossible de rejoindre cette boulangerie.");
    }
  }

  if (isLoading || user === undefined) {
    return <Centered><Loader2 className="h-6 w-6 animate-spin text-accent" /></Centered>;
  }

  if (!preview?.valid) {
    return (
      <Centered>
        <XCircle className="mx-auto h-8 w-8 text-destructive" />
        <p className="mt-3 text-sm text-muted-foreground">{preview?.reason ?? "Ce lien n'est plus valide."}</p>
      </Centered>
    );
  }

  if (accepted) {
    return (
      <Centered>
        <CheckCircle2 className="mx-auto h-8 w-8 text-accent" />
        <p className="mt-3 text-sm">Bienvenue chez {preview.bakery_name} ! Redirection…</p>
      </Centered>
    );
  }

  if (!user) {
    return <RegisterOrLogin token={token} bakeryName={preview.bakery_name ?? ""} onAuthed={() => {}} />;
  }

  return (
    <Centered>
      <div className="grid h-12 w-12 mx-auto place-items-center rounded-2xl bg-primary text-primary-foreground">
        <Wheat className="h-6 w-6" />
      </div>
      <h1 className="mt-4 font-display text-2xl">Rejoindre {preview.bakery_name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Vous êtes connecté en tant que {user.email}. Confirmez pour rejoindre l'équipe de cette boulangerie en tant qu'employé.
      </p>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <button
        onClick={handleAccept}
        disabled={accept.isPending}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {accept.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Accepter l'invitation
      </button>
    </Centered>
  );
}

function RegisterOrLogin({ token, bakeryName }: { token: string; bakeryName: string; onAuthed: () => void }) {
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        // Pas de bakery_name transmis : le trigger handle_new_user ne crée aucune boulangerie pour cet utilisateur.
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/join/${token}`, data: { full_name: name } },
        });
        if (error) throw error;
        toast.success("Compte créé. Vérifiez vos emails si la confirmation est requise, puis revenez sur ce lien.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message ?? "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Centered wide>
      <div className="grid h-12 w-12 mx-auto place-items-center rounded-2xl bg-primary text-primary-foreground">
        <Wheat className="h-6 w-6" />
      </div>
      <h1 className="mt-4 font-display text-2xl">Vous êtes invité(e) chez {bakeryName}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "signup"
          ? "Créez votre compte employé pour rejoindre l'équipe."
          : "Connectez-vous pour rejoindre l'équipe."}
      </p>
      <form onSubmit={submit} className="mt-6 space-y-3 text-left">
        {mode === "signup" && (
          <div>
            <label className="text-xs text-muted-foreground">Votre nom</label>
            <input
              required value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-accent"
              placeholder="Aïcha Traoré"
            />
          </div>
        )}
        <div>
          <label className="text-xs text-muted-foreground">Email</label>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Mot de passe</label>
          <input
            type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-accent"
          />
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "signup" ? "Créer mon compte" : "Se connecter"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        {mode === "signup" ? "Déjà un compte ?" : "Pas encore de compte ?"}{" "}
        <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="underline underline-offset-4">
          {mode === "signup" ? "Se connecter" : "Créer un compte"}
        </button>
      </p>
    </Centered>
  );
}

function Centered({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className={`text-center ${wide ? "max-w-sm w-full" : "max-w-sm"}`}>{children}</div>
    </div>
  );
}
