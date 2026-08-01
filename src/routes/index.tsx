import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Wheat,
  Package2,
  Flame,
  ShoppingBag,
  LineChart,
  ShieldCheck,
  Scale,
  EyeOff,
  TrendingUp,
  Sunrise,
  Sun,
  Moon,
} from "lucide-react";
import { Reveal, TiltGlowCard, AnimatedNumber, useReducedMotion } from "@/components/motion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MonStock — L'employé de votre boulangerie qui ne dort jamais" },
      {
        name: "description",
        content:
          "MonStock est l'employé dévoué de votre boulangerie : il compte chaque gramme, surveille les pertes, calcule vos marges et vous rend des comptes chaque soir.",
      },
      { property: "og:title", content: "MonStock — L'employé de votre boulangerie qui ne dort jamais" },
      {
        property: "og:description",
        content: "Il compte, il surveille, il calcule. Jamais fatigué, jamais distrait, jamais malhonnête.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

// ─────────────────────────────────────────────────────────────────────────────
// useScrollY — position de scroll lissée via requestAnimationFrame, pour le
// parallaxe. Retourne 0 en cas de prefers-reduced-motion (fond figé).
// ─────────────────────────────────────────────────────────────────────────────
function useScrollY(enabled: boolean) {
  const [y, setY] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    if (!enabled) return;
    const onScroll = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => setY(window.scrollY));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf.current);
    };
  }, [enabled]);
  return y;
}

// ─────────────────────────────────────────────────────────────────────────────
// FlourScene — scène de fond en couches : nappes chaudes qui dérivent lentement
// + particules de farine à trois profondeurs (loin/floues, médianes, proches/nettes).
// Le tout se déplace plus lentement que le contenu au scroll (parallaxe).
// Volontairement très discret : jamais au détriment de la lisibilité du texte.
// ─────────────────────────────────────────────────────────────────────────────
type Particle = { x: number; y: number; r: number; dur: number; delay: number; drift: number; op: number };

function makeParticles(count: number, seed: number, rMin: number, rMax: number): Particle[] {
  // Génération déterministe (pas de Math.random) pour éviter tout écart SSR/hydratation.
  const rand = (i: number, k: number) => {
    const v = Math.sin((i + 1) * (12.9898 + seed) + k * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };
  return Array.from({ length: count }).map((_, i) => ({
    x: rand(i, 1) * 100,
    y: rand(i, 2) * 100,
    r: rMin + rand(i, 3) * (rMax - rMin),
    dur: 14 + rand(i, 4) * 16,
    delay: -rand(i, 5) * 20,
    drift: -18 - rand(i, 6) * 26,
    op: 0.25 + rand(i, 7) * 0.45,
  }));
}

function ParticleLayer({
  particles,
  blur,
  offset,
  color,
}: {
  particles: Particle[];
  blur: number;
  offset: number;
  color: string;
}) {
  return (
    <div
      className="absolute inset-0"
      style={{ filter: blur ? `blur(${blur}px)` : undefined, transform: `translate3d(0, ${offset}px, 0)` }}
    >
      {particles.map((p, i) => (
        <span
          key={i}
          className="ms-flour absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.r,
            height: p.r,
            background: color,
            opacity: p.op,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
            ["--drift" as any]: `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

function FlourScene({ scrollY }: { scrollY: number }) {
  const far = useMemo(() => makeParticles(26, 1.7, 2, 4), []);
  const mid = useMemo(() => makeParticles(18, 5.3, 3, 5.5), []);
  const near = useMemo(() => makeParticles(10, 9.1, 4, 7), []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes ms-hero-blob-a {
          0%, 100% { transform: translate(-6%, -6%) scale(1); }
          50%      { transform: translate(4%, 5%) scale(1.12); }
        }
        @keyframes ms-hero-blob-b {
          0%, 100% { transform: translate(5%, 4%) scale(1); }
          50%      { transform: translate(-5%, -4%) scale(1.08); }
        }
        @keyframes ms-hero-blob-c {
          0%, 100% { transform: translate(2%, 6%) scale(1); }
          50%      { transform: translate(-3%, -5%) scale(1.15); }
        }
        @keyframes ms-flour-float {
          0%   { transform: translate3d(0, 0, 0); opacity: 0; }
          12%  { opacity: 1; }
          88%  { opacity: 1; }
          100% { transform: translate3d(var(--drift), -110px, 0); opacity: 0; }
        }
        .ms-hero-blob-a { animation: ms-hero-blob-a 16s ease-in-out infinite; }
        .ms-hero-blob-b { animation: ms-hero-blob-b 20s ease-in-out infinite; }
        .ms-hero-blob-c { animation: ms-hero-blob-c 18s ease-in-out infinite; }
        .ms-flour { animation-name: ms-flour-float; animation-timing-function: linear; animation-iteration-count: infinite; }
      `}</style>

      {/* Couche 1 — nappes de couleur chaude, les plus lointaines */}
      <div style={{ transform: `translate3d(0, ${scrollY * 0.12}px, 0)` }}>
        <div
          className="ms-hero-blob-a absolute -top-1/3 -left-1/4 h-[50vmax] w-[50vmax] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, #e8b06b4d 0%, transparent 70%)" }}
        />
        <div
          className="ms-hero-blob-b absolute -bottom-1/3 right-0 h-[45vmax] w-[45vmax] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, #a8541f33 0%, transparent 70%)" }}
        />
        <div
          className="ms-hero-blob-c absolute top-0 right-1/4 h-[32vmax] w-[32vmax] rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, #c97c3d2e 0%, transparent 70%)" }}
        />
      </div>

      {/* Couches 2 à 4 — farine, du plus flou/lointain au plus net/proche */}
      <ParticleLayer particles={far} blur={3} offset={scrollY * 0.06} color="#c97c3d55" />
      <ParticleLayer particles={mid} blur={1.2} offset={scrollY * 0.14} color="#a8541f4d" />
      <ParticleLayer particles={near} blur={0} offset={scrollY * 0.24} color="#7d3c1433" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Header flottant : devient flouté et posé sur une carte translucide au scroll.
// ─────────────────────────────────────────────────────────────────────────────
function Header({ scrolled }: { scrolled: boolean }) {
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-4 py-3 transition-all duration-300 ${
          scrolled
            ? "border border-border bg-card/70 backdrop-blur-xl shadow-[var(--shadow-soft)]"
            : "border border-transparent bg-transparent"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Wheat className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-base leading-none">MonStock</p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Pour les boulangeries</p>
          </div>
        </div>
        <Link
          to="/auth"
          className="btn-press rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-secondary"
        >
          Se connecter
        </Link>
      </div>
    </header>
  );
}

const DAY = [
  {
    icon: Sunrise,
    time: "05 h 00 — Le fournil s'allume",
    title: "Il prépare la fournée avant vous",
    text: "Vous choisissez un modèle de fournée, il rappelle la recette, vérifie que la farine, le beurre et la levure sont bien là, et refuse de vous laisser lancer une production qui viderait un bac à sec.",
  },
  {
    icon: Sun,
    time: "12 h 30 — La boutique tourne",
    title: "Il compte à votre place, sans se tromper",
    text: "Chaque sortie de baguette, chaque croissant vendu passe par lui. Vous n'entrez que le stock de départ et les invendus : il en déduit les quantités vendues et le chiffre d'affaires, au centime.",
  },
  {
    icon: Moon,
    time: "19 h 45 — Rideau baissé",
    title: "Il vous rend des comptes",
    text: "Invendus, casse, écarts inexpliqués, coût matière de la journée, bénéfice brut réel : tout est posé noir sur blanc. Rien n'est effaçable, tout est daté et signé.",
  },
];

const NUMBERS = [
  { value: 100, suffix: " %", label: "des mouvements de stock tracés et non modifiables" },
  { value: 3, suffix: " min", label: "pour clôturer une journée de vente" },
  { value: 0, suffix: "", label: "gramme de farine qui disparaît sans laisser de trace" },
  { value: 24, suffix: " h/24", label: "un employé qui ne prend jamais de pause" },
];

function Landing() {
  const reduced = useReducedMotion();
  const scrollY = useScrollY(!reduced);

  return (
    <div className="min-h-screen bg-background">
      <Header scrolled={scrollY > 12} />

      {/* ── Accroche ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <FlourScene scrollY={scrollY} />
        <div className="relative z-10 mx-auto max-w-6xl px-6 pt-12 pb-16 sm:pt-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur-sm animate-fade-up">
              Le collaborateur invisible de votre fournil
            </span>
            <h1 className="mt-6 text-balance font-display text-[2.6rem] leading-[1.04] text-foreground sm:text-6xl animate-fade-up">
              L'employé qui ne dort jamais,
              <br />
              ne se trompe <span className="italic text-accent">jamais</span>,
              <br />
              ne vole jamais.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground animate-fade-up" style={{ animationDelay: "90ms" }}>
              MonStock n'est pas un logiciel de plus : c'est la personne de confiance que vous auriez aimé embaucher.
              Il pèse la farine, surveille les invendus, calcule vos marges et vous dit, chaque soir, où est passé
              chaque franc de votre boulangerie.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 animate-fade-up" style={{ animationDelay: "160ms" }}>
              <Link
                to="/auth"
                className="btn-press btn-shimmer group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-lift)]"
              >
                Embaucher MonStock
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#journee"
                className="btn-press inline-flex items-center rounded-full border border-border bg-card px-6 py-3 text-sm hover:bg-secondary"
              >
                Une journée avec lui
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sa fiche de poste ───────────────────────────────────────────────── */}
      <section id="poste" className="mx-auto max-w-6xl px-6 pb-20">
        <Reveal className="mb-10">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Sa fiche de poste</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">Trois choses qu'il fait mieux que n'importe qui</h2>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              i: Scale,
              t: "Il compte chaque gramme, sans jamais estimer",
              d: "Farine, sucre, beurre, levure : il connaît la quantité exacte qui reste, ce qu'elle vous a coûté, et vous prévient avant la rupture.",
            },
            {
              i: EyeOff,
              t: "Il voit ce que personne ne voit",
              d: "Invendus, casse, écarts entre le stock théorique et le réel : il met les pertes silencieuses sur la table. Ce qui se voit se corrige.",
            },
            {
              i: TrendingUp,
              t: "Il vous dit la vérité sur vos marges",
              d: "Coût matière réel, chiffre d'affaires, pertes, bénéfice brut : la rentabilité de votre fournil, pas celle du carnet de notes.",
            },
          ].map((f, i) => (
            <Reveal key={f.t} delay={i * 90}>
              <TiltGlowCard className="card-elegant grain h-full p-8">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <f.i className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-xl leading-snug">{f.t}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{f.d}</p>
              </TiltGlowCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Une journée avec MonStock ───────────────────────────────────────── */}
      <section id="journee" className="relative overflow-hidden border-y border-border bg-secondary/30 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <Reveal className="mb-12">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Une journée avec MonStock</p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">
              Du premier pétrissage au rideau baissé, il est déjà au travail.
            </h2>
          </Reveal>

          <ol className="relative space-y-10 border-l border-border pl-8 sm:pl-10">
            {DAY.map((step, i) => (
              <Reveal as="li" key={step.time} delay={i * 120} className="relative">
                <span
                  className="absolute -left-[2.55rem] grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-accent shadow-[var(--shadow-soft)] sm:-left-[3.05rem]"
                  aria-hidden="true"
                >
                  <step.icon className="h-4.5 w-4.5" />
                </span>
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{step.time}</p>
                <h3 className="mt-1.5 font-display text-2xl">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Chiffres clés (comptage au scroll) ──────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {NUMBERS.map((n, i) => (
            <Reveal key={n.label} delay={i * 80}>
              <div className="card-elegant card-elegant-hover grain h-full p-6">
                <p className="font-display text-4xl text-accent">
                  <AnimatedNumber value={n.value} format={(v) => `${Math.round(v)}${n.suffix}`} />
                </p>
                <p className="mt-3 text-sm text-muted-foreground">{n.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Ses outils de travail ───────────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-6xl px-6 pb-20">
        <Reveal className="mb-10">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Ses outils de travail</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">Tout votre atelier tient dans son carnet</h2>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              i: Package2,
              t: "Il tient l'inventaire",
              d: "Quantités, prix d'achat, coût moyen pondéré, seuils d'alerte : il vous tape sur l'épaule avant la rupture.",
            },
            {
              i: Flame,
              t: "Il prépare les fournées",
              d: "Vos modèles rappellent les recettes, il vérifie les stocks disponibles et enregistre ce qui a réellement été consommé.",
            },
            {
              i: ShoppingBag,
              t: "Il tient la caisse du jour",
              d: "Stock de départ, invendus, décision de les conserver ou non : il en déduit seul les quantités vendues.",
            },
            {
              i: LineChart,
              t: "Il fait vos comptes",
              d: "Chiffre d'affaires, valeur du stock, coût matière, pertes et bénéfice brut estimé, sur 7, 30 ou 90 jours.",
            },
            {
              i: ShieldCheck,
              t: "Il a une mémoire incorruptible",
              d: "Chaque mouvement est daté, attribué et impossible à réécrire. Personne ne peut effacer une sortie de stock.",
            },
            {
              i: Wheat,
              t: "Il travaille dans votre poche",
              d: "Installable comme une application sur le téléphone du fournil, pensée pour des mains enfarinées.",
            },
          ].map((f, i) => (
            <Reveal key={f.t} delay={(i % 3) * 90}>
              <TiltGlowCard className="card-elegant grain h-full p-8">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-accent">
                  <f.i className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-2xl">{f.t}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{f.d}</p>
              </TiltGlowCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Appel à l'action ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <Reveal>
          <div className="card-elegant grain p-10 text-center sm:p-14">
            <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Prêt à l'embaucher ?</p>
            <h2 className="mx-auto mt-3 max-w-2xl font-display text-3xl sm:text-4xl">
              Il commence ce matin, il ne demandera jamais de congés.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Quelques minutes pour lui présenter vos matières, vos recettes et vos produits. Ensuite, il ne vous
              quitte plus : il compte, il surveille, il calcule.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                to="/auth"
                className="btn-press btn-shimmer group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-lift)]"
              >
                Embaucher MonStock
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} MonStock · Gestion pour boulangeries artisanales
      </footer>
    </div>
  );
}
