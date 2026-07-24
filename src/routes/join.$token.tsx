import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAcceptInvitation } from "@/lib/queries";
import { Loader2, CheckCircle2, XCircle, Wheat } from "lucide-react";

export const Route = createFileRoute("/join/$token")({
  ssr: false,
  component: JoinPage,
});

function JoinPage() {
  const { token } = Route.useParams();
  const router = useRouter();
  const accept = useAcceptInvitation();
  const [status, setStatus] = useState<"checking" | "joining" | "success" | "error">("checking");
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        sessionStorage.setItem("pending_join_token", token);
        router.navigate({ to: "/auth" });
        return;
      }
      setStatus("joining");
      try {
        await accept.mutateAsync(token);
        setStatus("success");
        setTimeout(() => router.navigate({ to: "/dashboard" }), 1200);
      } catch (e: any) {
        setError(e?.message ?? "Lien invalide ou expiré");
        setStatus("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen bg-background grid place-items-center px-6">
      <div className="w-full max-w-md card-elegant p-8 text-center animate-fade-up">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Wheat className="h-6 w-6" />
        </div>
        <h1 className="mt-5 font-display text-2xl">Rejoindre la boulangerie</h1>

        {status === "checking" && (
          <p className="mt-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Vérification…
          </p>
        )}
        {status === "joining" && (
          <p className="mt-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Ajout de votre compte…
          </p>
        )}
        {status === "success" && (
          <div className="mt-4 text-sm text-foreground flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-accent" />
            Vous avez rejoint la boulangerie. Redirection…
          </div>
        )}
        {status === "error" && (
          <div className="mt-4 space-y-4">
            <div className="text-sm text-destructive flex items-center justify-center gap-2">
              <XCircle className="h-4 w-4" />
              {error ?? "Lien invalide ou expiré"}
            </div>
            <button
              onClick={() => router.navigate({ to: "/dashboard" })}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs hover:bg-secondary"
            >
              Retour
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
