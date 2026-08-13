import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hasLocalSession } from "@/lib/auth-local";
import { toast } from "sonner";
import { Wheat, Loader2, Eye, EyeOff, Gift, CheckCircle2, ArrowLeft } from "lucide-react";

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
  { code: "+33", label: "🇫🇷 +33 (France)" },
];

function TrialBanner() {
  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/10 px-5 py-4 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-2">
        <Gift className="h-4 w-4 text-accent shrink-0" />
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Essai gratuit · 7 jours
        </p>
      </div>
      <p className="text-sm leading-relaxed text-foreground/80">
        Prenez le temps de découvrir MonStock sans engagement.{" "}
        <strong className="text-foreground">7 jours complets</strong>, toutes les fonctionnalités
        incluses — stocks, fournées, ventes, rapports. Aucune carte bancaire requise.
      </p>
      <ul className="mt-3 space-y-1.5">
        {[
          "Accès immédiat à l'application complète",
          "Données sauvegardées et sécurisées",
          "Résiliation libre, sans pénalité",
        ].map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs text-foreground/70">
            <CheckCircle2 className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrialFormInfo() {
  return (
    <div className="rounded-xl border border-accent/25 bg-accent/8 px-4 py-3">
      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4 text-accent shrink-0" />
        <p className="text-xs font-medium text-accent">7 jours d'essai gratuit inclus</p>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
        Votre compte bénéficie automatiquement d'un accès complet pendant 7 jours. Aucun code
        requis pour commencer.
      </p>
    </div>
  );
}

type Mode = "signin" | "signup" | "forgot" | "reset";

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [signupMode, setSignupMode] = useState<"trial" | "code">("trial");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [bakeryName, setBakeryName] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [countryCode, setCountryCode] = useState("+223");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  // Détection du token de réinitialisation dans l'URL (Supabase redirige vers /#access_token=…&type=recovery)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setMode("reset");
      // Supabase parse lui-même le hash et restaure la session automatiquement via onAuthStateChange
    }
  }, []);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const phone = phoneNumber.trim() ? `${countryCode} ${phoneNumber.trim()}` : null;
        const codeToSend = signupMode === "code" ? invitationCode.trim() : undefined;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/auth",
            data: {
              bakery_name: bakeryName,
              ...(codeToSend ? { invitation_code: codeToSend } : {}),
              phone,
            },
          },
        });
        if (error) {
          if (
            error.message?.includes("essai gratuit a déjà été activé") ||
            error.message?.toLowerCase().includes("trial")
          ) {
            toast.error(
              "Un essai gratuit a déjà été utilisé avec cette adresse e-mail. Contactez-nous sur WhatsApp pour souscrire."
            );
            return;
          }
          throw error;
        }
        toast.success("Votre compte a été créé avec plaisir. Vous pouvez à présent vous connecter.");
        setMode("signin");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenue, ravi de vous revoir.");
        const pending =
          typeof window !== "undefined" ? sessionStorage.getItem("pending_join_token") : null;
        if (pending) {
          sessionStorage.removeItem("pending_join_token");
          router.navigate({ to: "/join/$token", params: { token: pending } });
        } else {
          router.navigate({ to: "/dashboard" });
        }
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/auth",
        });
        if (error) throw error;
        setForgotSent(true);
      } else if (mode === "reset") {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        toast.success("Mot de passe mis à jour avec succès. Vous êtes maintenant connecté.");
        router.navigate({ to: "/dashboard" });
      }
    } catch (err: any) {
      if (mode === "signup") {
        toast.error(
          "Je ne suis pas parvenu à créer ce compte pour le moment. Veuillez vérifier les informations saisies, puis réessayer."
        );
      } else if (mode === "signin") {
        toast.error(
          "Ces identifiants ne me sont malheureusement pas familiers. Vérifions ensemble l'adresse e-mail et le mot de passe, puis réessayons."
        );
      } else if (mode === "forgot") {
        toast.error(
          "L'envoi du lien a échoué. Vérifiez l'adresse e-mail saisie et réessayez."
        );
      } else if (mode === "reset") {
        toast.error(
          "La mise à jour du mot de passe a échoué. Le lien a peut-être expiré — demandez-en un nouveau."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // ─── Libellés dynamiques selon le mode ────────────────────────────────────
  const modeLabel: Record<Mode, { eyebrow: string; title: string; subtitle: string }> = {
    signin: {
      eyebrow: "Connexion",
      title: "Bon retour",
      subtitle: "Accédez à votre boulangerie.",
    },
    signup: {
      eyebrow: "Créer un compte",
      title: "Bienvenue",
      subtitle: "Ouvrez votre espace en une minute.",
    },
    forgot: {
      eyebrow: "Mot de passe oublié",
      title: "Réinitialiser",
      subtitle: "Nous vous enverrons un lien par e-mail.",
    },
    reset: {
      eyebrow: "Nouveau mot de passe",
      title: "Choisissez-en un nouveau",
      subtitle: "Il doit faire au moins 8 caractères.",
    },
  };

  const { eyebrow, title, subtitle } = modeLabel[mode];

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Panneau gauche */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-[var(--gradient-warm)] grain">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Wheat className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-base leading-none">MonStock</p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Pour les boulangeries
            </p>
          </div>
        </div>
        <div className="max-w-md space-y-6">
          <h2 className="font-display text-5xl leading-tight text-foreground">
            Un fournil
            <br />
            en <em className="not-italic italic text-accent">bon ordre</em>.
          </h2>
          <p className="text-muted-foreground">
            Matières, recettes, fournées, ventes — connectez-vous à votre atelier numérique.
          </p>
          <TrialBanner />
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} MonStock</p>
      </div>

      {/* Panneau droit */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm animate-fade-up">

          {/* Bouton retour pour forgot / reset */}
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

          <BaguetteFlourish />

          {/* ── Mode : mot de passe oublié ── */}
          {mode === "forgot" && (
            forgotSent ? (
              <div className="mt-8 rounded-2xl border border-accent/30 bg-accent/10 px-5 py-6 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-accent" />
                <p className="mt-3 font-display text-lg">Lien envoyé !</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Si cette adresse est associée à un compte MonStock, vous recevrez un e-mail
                  avec un lien de réinitialisation. Vérifiez aussi vos spams.
                </p>
                <button
                  type="button"
                  onClick={() => { setMode("signin"); setForgotSent(false); }}
                  className="mt-5 text-sm text-accent underline underline-offset-4 hover:opacity-80"
                >
                  Retour à la connexion
                </button>
              </div>
            ) : (
              <form onSubmit={handleEmail} className="mt-8 space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Votre adresse e-mail</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-accent transition-colors"
                    placeholder="vous@boulangerie.fr"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-press btn-shimmer w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-60 transition-opacity"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Envoyer le lien de réinitialisation
                </button>
              </form>
            )
          )}

          {/* ── Mode : nouveau mot de passe ── */}
          {mode === "reset" && (
            <form onSubmit={handleEmail} className="mt-8 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Nouveau mot de passe</label>
                <div className="relative mt-1">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-4 py-3 pr-11 text-sm outline-none focus:border-accent transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showNewPassword ? "Masquer" : "Afficher"}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-press btn-shimmer w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-60 transition-opacity"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Enregistrer le nouveau mot de passe
              </button>
            </form>
          )}

          {/* ── Mode : connexion / inscription ── */}
          {(mode === "signin" || mode === "signup") && (
            <form onSubmit={handleEmail} className="mt-8 space-y-3">
              {mode === "signup" && (
                <>
                  <div className="flex rounded-xl overflow-hidden border border-input text-sm">
                    <button
                      type="button"
                      onClick={() => setSignupMode("trial")}
                      className={`flex-1 px-3 py-2.5 transition-colors font-medium ${
                        signupMode === "trial"
                          ? "bg-accent text-white"
                          : "bg-card text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      Essai gratuit
                    </button>
                    <button
                      type="button"
                      onClick={() => setSignupMode("code")}
                      className={`flex-1 px-3 py-2.5 transition-colors font-medium ${
                        signupMode === "code"
                          ? "bg-accent text-white"
                          : "bg-card text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      J'ai un code
                    </button>
                  </div>

                  {signupMode === "trial" ? (
                    <TrialFormInfo />
                  ) : (
                    <div>
                      <label className="text-xs text-muted-foreground">Code d'inscription</label>
                      <input
                        type="text"
                        required
                        value={invitationCode}
                        onChange={(e) => setInvitationCode(e.target.value.trim())}
                        className="mt-1 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-accent transition-colors uppercase tracking-widest"
                        placeholder="XXXXXX"
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Vous n'en avez pas ?{" "}
                        <a
                          href={WA_LINK}
                          target="_blank"
                          rel="noreferrer"
                          className="text-accent underline underline-offset-2"
                        >
                          Cliquez ici pour l'obtenir
                        </a>
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-muted-foreground">Nom de la boulangerie</label>
                    <input
                      type="text"
                      required
                      value={bakeryName}
                      onChange={(e) => setBakeryName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-accent transition-colors"
                      placeholder="Ma Boulangerie"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Téléphone du gérant</label>
                    <div className="mt-1 flex gap-2">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="rounded-xl border border-input bg-card px-2 py-3 text-sm outline-none focus:border-accent transition-colors"
                      >
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>{c.label}</option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="flex-1 rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-accent transition-colors"
                        placeholder="70 00 00 00"
                      />
                    </div>
                  </div>
                  {signupMode === "code" && (
                    <a
                      href={WA_LINK}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-press flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-medium hover:bg-secondary transition-colors"
                    >
                      <WhatsAppIcon />
                      Contacter sur WhatsApp
                    </a>
                  )}
                </>
              )}

              <div>
                <label className="text-xs text-muted-foreground">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-accent transition-colors"
                  placeholder="vous@boulangerie.fr"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Mot de passe</label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-[11px] text-accent hover:underline underline-offset-2 transition-colors"
                    >
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-input bg-card px-4 py-3 pr-11 text-sm outline-none focus:border-accent transition-colors"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-press btn-shimmer w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-60 transition-opacity"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "signin"
                  ? "Se connecter"
                  : signupMode === "trial"
                  ? "Démarrer l'essai gratuit"
                  : "Créer un compte"}
              </button>
            </form>
          )}

          {/* Toggle connexion / inscription */}
          {(mode === "signin" || mode === "signup") && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signin" ? "Nouveau sur MonStock ?" : "Déjà inscrit ?"}{" "}
              <button
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="text-foreground underline underline-offset-4 hover:text-accent"
              >
                {mode === "signin" ? "Créer un compte" : "Se connecter"}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BaguetteFlourish — inchangée ────────────────────────────────────────────
function BaguetteFlourish() {
  return (
    <div className="relative mt-8 flex flex-col items-center select-none" aria-hidden="true">
      <style>{`
        .ms-bag {
          --dough: #f3e6c8; --crust: #a8541f; --crust-dark: #7d3c14;
          --accent: #c97c3d; --glow: #e8b06b;
        }
        @keyframes ms-piece-move {
          0%   { transform: translate(var(--dx0), var(--dy0)); }
          30%  { transform: translate(0, 0); }
          46%  { transform: translate(0, 0); }
          90%  { transform: translate(0, 0); }
          100% { transform: translate(var(--dx0), var(--dy0)); }
        }
        @keyframes ms-piece-fade {
          0%   { opacity: 1; } 36%  { opacity: 1; } 46%  { opacity: 0; }
          90%  { opacity: 0; } 100% { opacity: 1; }
        }
        .ms-piece { animation: ms-piece-move 6.5s ease-in-out infinite, ms-piece-fade 6.5s ease-in-out infinite; }
        @keyframes ms-burst {
          0%, 42% { opacity: 0; transform: scale(0.4); }
          47%     { opacity: 0.9; transform: scale(1); }
          58%     { opacity: 0; transform: scale(1.5); }
          100%    { opacity: 0; transform: scale(0.4); }
        }
        .ms-burst-dot { animation: ms-burst 6.5s ease-out infinite; transform-origin: center; }
        @keyframes ms-baguette-in {
          0%, 44%  { opacity: 0; transform: scale(0.75); }
          52%      { opacity: 1; transform: scale(1.03); }
          58%      { opacity: 1; transform: scale(1); }
          82%      { opacity: 1; transform: scale(1); }
          92%      { opacity: 0; transform: scale(0.8); }
          100%     { opacity: 0; transform: scale(0.75); }
        }
        @keyframes ms-baguette-color {
          0%, 50%  { fill: var(--dough); } 64% { fill: var(--crust); } 100% { fill: var(--crust); }
        }
        .ms-baguette-wrap { animation: ms-baguette-in 6.5s ease-in-out infinite; transform-origin: 62px 66px; }
        .ms-baguette-body { animation: ms-baguette-color 6.5s ease-in-out infinite; }
        @keyframes ms-glow-pulse {
          0%, 48% { opacity: 0; } 60% { opacity: 0.5; } 70% { opacity: 0.25; }
          80% { opacity: 0.45; } 88% { opacity: 0; } 100% { opacity: 0; }
        }
        .ms-glow { animation: ms-glow-pulse 6.5s ease-in-out infinite; }
        @keyframes ms-steam-rise {
          0%, 55%  { opacity: 0; transform: translateY(0) scaleX(1); }
          62%      { opacity: 0.5; }
          85%      { opacity: 0; transform: translateY(-16px) scaleX(1.3); }
          100%     { opacity: 0; }
        }
        .ms-steam { animation: ms-steam-rise 6.5s ease-in infinite; }
      `}</style>
      <svg className="ms-bag" width="150" height="130" viewBox="0 0 150 130" fill="none">
        <ellipse className="ms-glow" cx="75" cy="66" rx="52" ry="26" fill="var(--glow)" opacity={0} />
        <path className="ms-steam" d="M55 40c-4-6 4-9 0-15" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path className="ms-steam" d="M75 36c-4-6 4-9 0-15" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" fill="none" style={{ animationDelay: "0.5s" }} />
        <path className="ms-steam" d="M95 40c-4-6 4-9 0-15" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" fill="none" style={{ animationDelay: "1s" }} />
        <circle className="ms-burst-dot" cx="62" cy="58" r="2" fill="#fff8ea" />
        <circle className="ms-burst-dot" cx="88" cy="60" r="1.6" fill="#fff8ea" style={{ animationDelay: "0.05s" }} />
        <circle className="ms-burst-dot" cx="75" cy="48" r="1.8" fill="#fff8ea" style={{ animationDelay: "0.1s" }} />
        <circle className="ms-burst-dot" cx="70" cy="80" r="1.6" fill="#fff8ea" style={{ animationDelay: "0.08s" }} />
        <circle className="ms-burst-dot" cx="95" cy="76" r="1.4" fill="#fff8ea" style={{ animationDelay: "0.15s" }} />
        <circle className="ms-burst-dot" cx="55" cy="72" r="1.4" fill="#fff8ea" style={{ animationDelay: "0.12s" }} />
        <ellipse className="ms-piece" style={{ ["--dx0" as any]: "-34px", ["--dy0" as any]: "-14px" }} cx="62" cy="66" rx="9" ry="8" fill="var(--dough)" />
        <ellipse className="ms-piece" style={{ ["--dx0" as any]: "34px", ["--dy0" as any]: "-10px" }} cx="88" cy="66" rx="9" ry="8" fill="var(--dough)" />
        <ellipse className="ms-piece" style={{ ["--dx0" as any]: "-22px", ["--dy0" as any]: "22px" }} cx="68" cy="66" rx="8" ry="7" fill="var(--dough)" />
        <ellipse className="ms-piece" style={{ ["--dx0" as any]: "24px", ["--dy0" as any]: "24px" }} cx="82" cy="66" rx="8" ry="7" fill="var(--dough)" />
        <ellipse className="ms-piece" style={{ ["--dx0" as any]: "0px", ["--dy0" as any]: "-30px" }} cx="75" cy="66" rx="8" ry="7" fill="var(--dough)" />
        <g className="ms-baguette-wrap">
          <path className="ms-baguette-body" d="M18 66c0-7 8-11 15-11h84c7 0 15 4 15 11s-8 11-15 11H33c-7 0-15-4-15-11z" fill="var(--dough)" />
          <path d="M40 58c4 5 4 11 0 16" stroke="var(--crust-dark)" strokeWidth="2" strokeLinecap="round" fill="none" opacity={0.65} />
          <path d="M58 56c4 6 4 12 0 20" stroke="var(--crust-dark)" strokeWidth="2" strokeLinecap="round" fill="none" opacity={0.65} />
          <path d="M76 56c4 6 4 12 0 20" stroke="var(--crust-dark)" strokeWidth="2" strokeLinecap="round" fill="none" opacity={0.65} />
          <path d="M94 56c4 6 4 12 0 20" stroke="var(--crust-dark)" strokeWidth="2" strokeLinecap="round" fill="none" opacity={0.65} />
          <path d="M110 58c4 5 4 11 0 16" stroke="var(--crust-dark)" strokeWidth="2" strokeLinecap="round" fill="none" opacity={0.65} />
          <path d="M28 60c20-6 74-6 94 0" stroke="#ffe6b8" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity={0.4} />
        </g>
      </svg>
      <p className="mt-1 text-[11px] italic text-muted-foreground text-center max-w-[220px]">
        Chaque grain compte, jusqu'à la dernière baguette.
      </p>
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