/**
 * src/routes/auth.tsx — MonStock auth page
 *
 *  ✓ Boulanger 3D (desktop: panneau gauche | mobile: dessus du formulaire)
 *  ✓ Avion en papier au clic "Se connecter"
 *  ✓ Mot de passe oublié + réinitialisation
 *  ✓ Essai gratuit 7 jours direct (sans code)
 *  ✓ Responsive : mobile / tablette / desktop
 */

import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState, useEffect, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hasLocalSession } from "@/lib/auth-local";
import { toast } from "sonner";
import { Wheat, Loader2, Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react";

const BakerScene = lazy(() =>
  import("@/components/baker/BakerScene").then((m) => ({ default: m.BakerScene }))
);

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    if (hasLocalSession()) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

const WA_LINK =
  "https://wa.me/22360673302?text=Bonjour%2C%20je%20souhaite%20obtenir%20un%20code%20d%27inscription%20pour%20Ma%20Boulangerie";

const COUNTRY_CODES = [
  { code: "+223", label: "🇲🇱 +223 (Mali)" },
  { code: "+225", label: "🇨🇮 +225 (Côte d'Ivoire)" },
  { code: "+221", label: "🇸🇳 +221 (Sénégal)" },
  { code: "+226", label: "🇧🇫 +226 (Burkina Faso)" },
  { code: "+228", label: "🇹🇬 +228 (Togo)" },
  { code: "+229", label: "🇧🇯 +229 (Bénin)" },
  { code: "+227", label: "🇳🇪 +227 (Niger)" },
  { code: "+224", label: "🇬🇳 +224 (Guinée)" },
  { code: "+33",  label: "🇫🇷 +33 (France)" },
];

type AuthMode   = "signin" | "signup" | "forgot" | "reset";
type SignupPath = "trial" | "code";

function firstNameOf(s?: string | null) {
  if (!s) return null;
  const t = s.trim();
  return t ? t.split(/\s+/)[0] : null;
}

function isNetworkIssue(err: any) {
  return (
    (typeof navigator !== "undefined" && !navigator.onLine) ||
    err instanceof TypeError ||
    /network|fetch|failed to fetch/i.test(String(err?.message ?? ""))
  );
}

function AuthPage() {
  const router = useRouter();

  const [mode, setMode]               = useState<AuthMode>("signin");
  const [signupPath, setSignupPath]   = useState<SignupPath>("trial");
  const [fullName, setFullName]       = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPwd, setShowPwd]         = useState(false);
  const [showNewPwd, setShowNewPwd]   = useState(false);
  const [bakeryName, setBakeryName]   = useState("");
  const [invCode, setInvCode]         = useState("");
  const [countryCode, setCC]          = useState("+223");
  const [phone, setPhone]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [forgotSent, setForgotSent]   = useState(false);
  const [flying, setFlying]           = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash.includes("type=recovery")) setMode("reset");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const tel  = phone.trim() ? `${countryCode} ${phone.trim()}` : null;
        const code = signupPath === "code" ? invCode : "";
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { bakery_name: bakeryName, invitation_code: code, phone: tel, full_name: fullName.trim() || null },
          },
        });
        if (error) throw error;
        toast.success(
          signupPath === "trial"
            ? "Votre essai gratuit de 7 jours est activé. Vous pouvez à présent vous connecter."
            : "Votre compte a été créé. Vous pouvez à présent vous connecter."
        );
        setMode("signin");

      } else if (mode === "signin") {
        setFlying(true);
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setTimeout(() => setFlying(false), 380);
          throw error;
        }
        let greeting = "Bienvenue, ravi de vous revoir.";
        try {
          const { data: member } = await supabase
            .from("bakery_members").select("full_name, role")
            .eq("user_id", data.user!.id).maybeSingle();
          const first = firstNameOf(member?.full_name);
          if (first)
            greeting = `Bienvenue, ${member?.role === "owner" ? "M./Mme " : ""}${first} ! Ravi de vous revoir.`
              .replace(/\s+/g, " ").trim();
        } catch { /* salut générique */ }
        toast.success(greeting);

      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        setForgotSent(true);

      } else if (mode === "reset") {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        toast.success("Mot de passe mis à jour. Vous êtes maintenant connecté.");
        router.navigate({ to: "/dashboard" });
      }

    } catch (err: any) {
      const raw = typeof err?.message === "string" ? err.message : "";
      if (mode === "signup") {
        if (isNetworkIssue(err))
          toast.error("Impossible de créer le compte — vérifiez votre connexion internet.");
        else if (raw.includes("essai gratuit"))
          toast.error("Cette adresse e-mail a déjà bénéficié de l'essai gratuit. Contactez-nous sur WhatsApp.");
        else
          toast.error("Impossible de créer ce compte. Vérifiez les informations saisies.");
      } else if (mode === "signin") {
        if (isNetworkIssue(err))
          toast.error("Impossible de vous connecter — vérifiez votre connexion internet.");
        else
          toast.error("Ces identifiants ne sont pas reconnus. Vérifiez l'e-mail et le mot de passe.");
      } else if (mode === "forgot") {
        toast.error("L'envoi du lien a échoué. Vérifiez l'adresse e-mail saisie.");
      } else if (mode === "reset") {
        toast.error("La mise à jour a échoué. Le lien a peut-être expiré — demandez-en un nouveau.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleFlown() {
    const pending = sessionStorage.getItem("pending_join_token");
    if (pending) {
      sessionStorage.removeItem("pending_join_token");
      router.navigate({ to: "/join/$token", params: { token: pending } });
    } else {
      router.navigate({ to: "/dashboard" });
    }
  }

  const labels: Record<AuthMode, { eyebrow: string; title: string; subtitle: string }> = {
    signin: { eyebrow: "Connexion",            title: "Bon retour",               subtitle: "Accédez à votre boulangerie." },
    signup: { eyebrow: "Créer un compte",      title: "Bienvenue",                subtitle: signupPath === "trial" ? "7 jours pour essayer, sans engagement." : "Ouvrez votre espace en une minute." },
    forgot: { eyebrow: "Mot de passe oublié",  title: "Réinitialiser",            subtitle: "Nous vous enverrons un lien par e-mail." },
    reset:  { eyebrow: "Nouveau mot de passe", title: "Choisissez-en un nouveau", subtitle: "Il doit faire au moins 8 caractères." },
  };
  const { eyebrow, title, subtitle } = labels[mode];

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">

      {/* ── Panneau gauche desktop ── */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-[var(--gradient-warm)] grain">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Wheat className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-base leading-none">MonStock</p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Pour les boulangeries</p>
          </div>
        </div>

        <div className="max-w-md">
          <h2 className="font-display text-5xl leading-tight text-foreground">
            Un fournil<br />en <em className="not-italic italic text-accent">bon ordre</em>.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Matières, recettes, fournées, ventes — connectez-vous à votre atelier numérique.
          </p>
        </div>

        {/* Boulanger desktop — flex-1 pour occuper l'espace restant */}
        <div style={{ flex: 1, minHeight: 280, marginTop: 24, position: "relative" }}>
          <Suspense fallback={null}>
            <BakerScene flying={flying} onFlown={handleFlown} compact={false} />
          </Suspense>
        </div>

        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} MonStock</p>
      </div>

      {/* ── Panneau droit — formulaire ── */}
      <div className="flex flex-col items-center justify-start min-h-screen lg:justify-center p-6 sm:p-10 lg:p-12 overflow-y-auto">

        {/* Boulanger mobile — hauteur fixe, ne repousse pas le formulaire */}
        <div className="lg:hidden w-full mb-2" style={{ height: 200, maxWidth: 480, position: "relative" }}>
          <Suspense fallback={null}>
            <BakerScene flying={flying} onFlown={handleFlown} compact />
          </Suspense>
        </div>

        {/* Logo mobile */}
        <div className="lg:hidden flex items-center gap-2 mb-5 self-start w-full max-w-sm">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Wheat className="h-4 w-4" />
          </div>
          <p className="font-display text-sm leading-none">MonStock</p>
        </div>

        <div className="w-full max-w-sm animate-fade-up">

          {(mode === "forgot" || mode === "reset") && (
            <button
              type="button"
              onClick={() => { setMode("signin"); setForgotSent(false); }}
              className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour à la connexion
            </button>
          )}

          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{eyebrow}</p>
          <h1 className="mt-2 font-display text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

          {mode === "signup" && <TrialPitch active={signupPath === "trial"} />}

          {mode === "signup" && (
            <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1 text-xs font-medium">
              {(["trial", "code"] as SignupPath[]).map((p) => (
                <button key={p} type="button" onClick={() => setSignupPath(p)}
                  className={`rounded-lg px-3 py-2 transition-colors ${
                    signupPath === p ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  {p === "trial" ? "Essai gratuit 7 jours" : "J'ai un code d'inscription"}
                </button>
              ))}
            </div>
          )}

          {/* Mot de passe oublié */}
          {mode === "forgot" && (
            forgotSent ? (
              <div className="mt-8 rounded-2xl border border-accent/30 bg-accent/10 px-5 py-6 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-accent" />
                <p className="mt-3 font-display text-lg">Lien envoyé !</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Si cette adresse est associée à un compte MonStock, vous recevrez un e-mail
                  avec un lien de réinitialisation. Vérifiez aussi vos spams.
                </p>
                <button type="button" onClick={() => { setMode("signin"); setForgotSent(false); }}
                  className="mt-5 text-sm text-accent underline underline-offset-4 hover:opacity-80">
                  Retour à la connexion
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-3">
                <Field label="Votre adresse e-mail">
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-accent transition-colors"
                    placeholder="vous@boulangerie.fr" />
                </Field>
                <SubmitButton loading={loading} label="Envoyer le lien de réinitialisation" />
              </form>
            )
          )}

          {/* Nouveau mot de passe */}
          {mode === "reset" && (
            <form onSubmit={handleSubmit} className="mt-8 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Nouveau mot de passe</label>
                <div className="relative mt-1">
                  <input type={showNewPwd ? "text" : "password"} required minLength={8} value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-4 py-3 pr-11 text-sm outline-none focus:border-accent transition-colors"
                    placeholder="••••••••" />
                  <EyeToggle show={showNewPwd} onToggle={() => setShowNewPwd((v) => !v)} />
                </div>
              </div>
              <SubmitButton loading={loading} label="Enregistrer le nouveau mot de passe" />
            </form>
          )}

          {/* Connexion / inscription */}
          {(mode === "signin" || mode === "signup") && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              {mode === "signup" && (
                <>
                  <Field label="Votre nom complet">
                    <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-accent transition-colors"
                      placeholder="Aïcha Traoré" />
                  </Field>
                  <Field label="Nom de la boulangerie">
                    <input type="text" required value={bakeryName} onChange={(e) => setBakeryName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-accent transition-colors"
                      placeholder="Ma Boulangerie" />
                  </Field>
                  <Field label="Téléphone du gérant">
                    <div className="mt-1 flex gap-2">
                      <select value={countryCode} onChange={(e) => setCC(e.target.value)}
                        className="rounded-xl border border-input bg-card px-2 py-3 text-sm outline-none focus:border-accent transition-colors">
                        {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                      </select>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="flex-1 rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-accent transition-colors"
                        placeholder="70 00 00 00" />
                    </div>
                  </Field>
                  {signupPath === "code" && (
                    <Field label="Code d'inscription">
                      <input type="text" required value={invCode} onChange={(e) => setInvCode(e.target.value.trim())}
                        className="mt-1 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-accent transition-colors uppercase tracking-widest"
                        placeholder="XXXXXX" />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Vous n'en avez pas ?{" "}
                        <button type="button" onClick={() => setSignupPath("trial")}
                          className="text-accent underline underline-offset-2">
                          Démarrez l'essai gratuit de 7 jours
                        </button>
                      </p>
                    </Field>
                  )}
                  <a href={WA_LINK} target="_blank" rel="noreferrer"
                    className="btn-press flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-medium hover:bg-secondary transition-colors">
                    <WhatsAppIcon /> Contacter sur WhatsApp
                  </a>
                </>
              )}

              <Field label="Email">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-accent transition-colors"
                  placeholder="vous@boulangerie.fr" />
              </Field>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Mot de passe</label>
                  {mode === "signin" && (
                    <button type="button" onClick={() => setMode("forgot")}
                      className="text-[11px] text-accent hover:underline underline-offset-2 transition-colors">
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>
                <div className="relative mt-1">
                  <input type={showPwd ? "text" : "password"} required minLength={8} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-4 py-3 pr-11 text-sm outline-none focus:border-accent transition-colors"
                    placeholder="••••••••" />
                  <EyeToggle show={showPwd} onToggle={() => setShowPwd((v) => !v)} />
                </div>
              </div>

              <SubmitButton
                loading={loading}
                label={mode === "signin" ? "Se connecter" : signupPath === "trial" ? "Démarrer mon essai gratuit" : "Créer un compte"}
              />

              {mode === "signup" && signupPath === "trial" && (
                <p className="text-center text-[11px] text-muted-foreground">
                  Sans carte bancaire. Un seul essai gratuit par boulangerie.
                </p>
              )}
            </form>
          )}

          {(mode === "signin" || mode === "signup") && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signin" ? "Nouveau sur MonStock ?" : "Déjà inscrit ?"}{" "}
              <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="text-foreground underline underline-offset-4 hover:text-accent">
                {mode === "signin" ? "Créer un compte" : "Se connecter"}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-xs text-muted-foreground">{label}</label>{children}</div>;
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button type="submit" disabled={loading}
      className="btn-press btn-shimmer w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-60 transition-opacity">
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </button>
  );
}

function EyeToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} tabIndex={-1}
      aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors">
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

function TrialPitch({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="mt-4 rounded-2xl border border-accent/25 bg-accent/5 p-4">
      <p className="text-sm font-medium text-foreground">
        7 jours pour tester MonStock en conditions réelles, gratuitement.
      </p>
      <ul className="mt-2 space-y-1.5">
        {[
          "Suivez vos matières premières et vos recettes dès aujourd'hui",
          "Enregistrez vos fournées et vos ventes en quelques secondes",
          "Aucune carte bancaire, aucun engagement",
        ].map((p) => (
          <li key={p} className="flex items-start gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884z"/>
    </svg>
  );
}
