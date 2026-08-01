import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wheat, Loader2, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: AuthPage,
});

const WA_LINK = "https://wa.me/22360673302?text=Bonjour%2C%20je%20souhaite%20obtenir%20un%20code%20d%27inscription%20pour%20Ma%20Boulangerie";

// Quelques indicatifs pays courants pour la zone d'usage ; l'utilisateur peut aussi taper le sien.
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

function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [bakeryName, setBakeryName] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [countryCode, setCountryCode] = useState("+223");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const phone = phoneNumber.trim() ? `${countryCode} ${phoneNumber.trim()}` : null;
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              bakery_name: bakeryName,
              invitation_code: invitationCode,
              phone,
            },
          },
        });
        if (error) throw error;
        toast.success("Compte créé. Vous pouvez vous connecter.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenue !");
        const pending = typeof window !== "undefined" ? sessionStorage.getItem("pending_join_token") : null;
        if (pending) {
          sessionStorage.removeItem("pending_join_token");
          router.navigate({ to: "/join/$token", params: { token: pending } });
        } else {
          router.navigate({ to: "/dashboard" });
        }
      }
    } catch (err: any) {
      toast.error(err.message ?? "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
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
            Un fournil<br/>en <em className="not-italic italic text-accent">bon ordre</em>.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Matières, recettes, fournées, ventes — connectez-vous à votre atelier numérique.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} MonStock</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm animate-fade-up">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            {mode === "signin" ? "Connexion" : "Créer un compte"}
          </p>
          <h1 className="mt-2 font-display text-4xl">
            {mode === "signin" ? "Bon retour" : "Bienvenue"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin" ? "Accédez à votre boulangerie." : "Ouvrez votre espace en une minute."}
          </p>

          <BaguetteFlourish />

          <form onSubmit={handleEmail} className="mt-8 space-y-3">
            {mode === "signup" && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground">Nom de la boulangerie</label>
                  <input
                    type="text" required value={bakeryName} onChange={(e) => setBakeryName(e.target.value)}
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
                <div>
                  <label className="text-xs text-muted-foreground">Code d'inscription</label>
                  <input
                    type="text" required value={invitationCode}
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
                <a
                  href={WA_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-press flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-medium hover:bg-secondary transition-colors"
                >
                  <WhatsAppIcon />
                  Contacter sur WhatsApp
                </a>
              </>
            )}
            <div>
              <label className="text-xs text-muted-foreground">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-accent transition-colors"
                placeholder="vous@boulangerie.fr"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Mot de passe</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
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
              type="submit" disabled={loading}
              className="btn-press btn-shimmer w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-60 transition-opacity"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Se connecter" : "Créer un compte"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "Nouveau sur MonStock ?" : "Déjà inscrit ?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-foreground underline underline-offset-4 hover:text-accent"
            >
              {mode === "signin" ? "Créer un compte" : "Se connecter"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BaguetteFlourish — remplace l'ancien bouton "Continuer avec Google" (retiré,
// plus utilisé). Des morceaux de pâte pâle convergent, un éclat de farine
// marque le moment où ils se rejoignent, puis une baguette se forme (couleur
// croûte orange foncé) avec ses grignes, un halo chaud qui pulse et un peu de
// vapeur — puis elle s'efface et le cycle recommence, en boucle continue.
// ─────────────────────────────────────────────────────────────────────────────
function BaguetteFlourish() {
  return (
    <div className="relative mt-8 flex flex-col items-center select-none" aria-hidden="true">
      <style>{`
        .ms-bag {
          --dough: #f3e6c8;
          --crust: #a8541f;
          --crust-dark: #7d3c14;
          --accent: #c97c3d;
          --glow: #e8b06b;
        }
        @keyframes ms-piece-move {
          0%   { transform: translate(var(--dx0), var(--dy0)); }
          30%  { transform: translate(0, 0); }
          46%  { transform: translate(0, 0); }
          90%  { transform: translate(0, 0); }
          100% { transform: translate(var(--dx0), var(--dy0)); }
        }
        @keyframes ms-piece-fade {
          0%   { opacity: 1; }
          36%  { opacity: 1; }
          46%  { opacity: 0; }
          90%  { opacity: 0; }
          100% { opacity: 1; }
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
          0%, 50%  { fill: var(--dough); }
          64%      { fill: var(--crust); }
          100%     { fill: var(--crust); }
        }
        .ms-baguette-wrap { animation: ms-baguette-in 6.5s ease-in-out infinite; transform-origin: 62px 66px; }
        .ms-baguette-body { animation: ms-baguette-color 6.5s ease-in-out infinite; }

        @keyframes ms-glow-pulse {
          0%, 48%  { opacity: 0; }
          60%      { opacity: 0.5; }
          70%      { opacity: 0.25; }
          80%      { opacity: 0.45; }
          88%      { opacity: 0; }
          100%     { opacity: 0; }
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
          <path
            className="ms-baguette-body"
            d="M18 66c0-7 8-11 15-11h84c7 0 15 4 15 11s-8 11-15 11H33c-7 0-15-4-15-11z"
            fill="var(--dough)"
          />
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
