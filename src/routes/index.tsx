import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { hasLocalSession } from "@/lib/auth-local";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Boxes,
  Calculator,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  Wheat,
} from "lucide-react";
import { Reveal, AnimatedNumber } from "@/components/motion";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MonStock — Pilotez la rentabilité de votre boulangerie" },
      {
        name: "description",
        content:
          "Suivez chiffre d’affaires, coût matière, marge brute estimée, pertes, stocks et production dans un outil conçu pour les boulangeries.",
      },
      { property: "og:title", content: "MonStock — Pilotez la rentabilité de votre boulangerie" },
      {
        property: "og:description",
        content: "Des chiffres clairs pour mieux acheter, mieux produire et protéger la marge de votre boulangerie.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    if (hasLocalSession()) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

const financeSignals = [
  { label: "Chiffre d’affaires", value: "1 847 500 F", tone: "positive" },
  { label: "Coût des matières", value: "684 200 F", tone: "neutral" },
  { label: "Marge brute estimée", value: "1 163 300 F", tone: "positive" },
  { label: "Pertes identifiées", value: "42 750 F", tone: "warning" },
];

const financeBenefits = [
  {
    icon: CircleDollarSign,
    index: "01",
    title: "Connaître ce que chaque produit vous rapporte",
    text: "MonStock rapproche recettes, coût réel des matières et ventes enregistrées. Vous distinguez les produits qui soutiennent votre marge de ceux qui la réduisent.",
  },
  {
    icon: TrendingDown,
    index: "02",
    title: "Transformer les pertes en décisions",
    text: "Invendus, casse et écarts de stock ne restent plus invisibles. Ils sont chiffrés, datés et classés pour vous aider à agir là où l’argent se perd.",
  },
  {
    icon: ReceiptText,
    index: "03",
    title: "Présenter des comptes mieux préparés",
    text: "Achats, ventes, mouvements et coûts restent réunis dans un historique clair. Vous gagnez du temps dans votre suivi quotidien et préparez une base propre pour votre comptabilité.",
  },
  {
    icon: BarChart3,
    index: "04",
    title: "Décider avec les chiffres du jour",
    text: "Suivez les tendances sur 7, 30 ou 90 jours. Ajustez vos prix, vos quantités et vos achats sans attendre la fin du mois pour découvrir un problème.",
  },
];

const operations = [
  {
    icon: Boxes,
    title: "Matières sous contrôle",
    text: "Farine, levure, beurre ou emballages : quantités, prix d’achat, coût moyen et seuils d’alerte restent à jour.",
  },
  {
    icon: PackageCheck,
    title: "Production reliée aux coûts",
    text: "Les recettes et fournées déduisent les matières consommées pour montrer le coût réel de ce qui sort du fournil.",
  },
  {
    icon: Wheat,
    title: "Ventes et invendus rapprochés",
    text: "Les quantités produites, vendues et restantes se répondent, pour une lecture cohérente du stock jusqu’à la marge.",
  },
];

const trustPoints = [
  { icon: Users, title: "Votre équipe, avec les bons accès", text: "Invitez le personnel et gardez la gestion sensible sous votre contrôle." },
  { icon: BookOpenCheck, title: "Une trace qui ne s’efface pas", text: "Chaque action importante est datée et attribuée pour faciliter les vérifications." },
  { icon: Clock3, title: "Disponible même sans réseau", text: "Le travail continue hors connexion, puis se synchronise lorsque le réseau revient." },
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
        <Wheat className="h-5 w-5" aria-hidden="true" />
      </span>
      <span>
        <span className="block font-display text-lg leading-none">MonStock</span>
        <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Gestion pour boulangeries</span>
      </span>
    </div>
  );
}

function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-40 px-4 pt-4 sm:px-6 sm:pt-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between border-b border-border/70 pb-4">
        <Brand />
        <nav className="flex items-center gap-2" aria-label="Navigation principale">
          <a href="#solutions" className="hidden px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground sm:block">Solutions</a>
          <Link to="/auth" className="btn-press inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground sm:px-5">
            Se connecter <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </header>
  );
}

function FinancePreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl animate-fade-up lg:ml-auto" style={{ animationDelay: "120ms" }}>
      <div className="ledger-panel relative overflow-hidden border border-border bg-card p-5 shadow-[var(--shadow-lift)] sm:p-7">
        <div className="flex items-start justify-between border-b border-border pb-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Vue financière</p>
            <p className="mt-1 font-display text-2xl">Ce mois-ci</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> À jour
          </span>
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden border-b border-border bg-border">
          {financeSignals.map((item) => (
            <div key={item.label} className="bg-card px-3 py-5 sm:px-5">
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{item.label}</p>
              <p className={`mt-2 font-display text-xl sm:text-2xl ${item.tone === "warning" ? "text-destructive" : item.tone === "positive" ? "text-accent" : "text-foreground"}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="pt-5">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Marge brute estimée</p>
              <p className="mt-1 text-sm font-medium">Évolution sur 7 jours</p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent"><TrendingUp className="h-4 w-4" /> +8,4 %</span>
          </div>
          <div className="flex h-24 items-end gap-2" aria-label="Graphique décoratif de progression">
            {[42, 54, 47, 68, 61, 76, 88].map((height, index) => (
              <span key={height + index} className="finance-bar flex-1 rounded-t-sm bg-accent/25" style={{ "--bar-height": `${height}%`, animationDelay: `${220 + index * 70}ms` } as React.CSSProperties} />
            ))}
          </div>
          <div className="mt-3 flex justify-between text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
            <span>Lun.</span><span>Mar.</span><span>Mer.</span><span>Jeu.</span><span>Ven.</span><span>Sam.</span><span>Dim.</span>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-5 -left-3 hidden w-56 border border-border bg-background p-4 shadow-[var(--shadow-lift)] sm:block">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-accent"><Check className="h-4 w-4" /></span>
          <div><p className="text-xs text-muted-foreground">Écart repéré</p><p className="text-sm font-semibold">Huile · 12 500 F</p></div>
        </div>
      </div>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <Header />

      <main>
        <section className="landing-hero relative flex min-h-[92svh] items-center border-b border-border pt-28">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="finance-grid absolute inset-0 opacity-45" />
            <div className="landing-ray absolute -right-24 top-0 h-full w-2/3" />
          </div>
          <div className="relative mx-auto grid w-full max-w-7xl gap-14 px-6 py-14 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:py-20">
            <div className="max-w-3xl">
              <div className="animate-fade-up inline-flex items-center gap-2 border-l-2 border-accent pl-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Le pilotage financier de votre fournil
              </div>
              <h1 className="mt-6 text-balance font-display text-[clamp(2.8rem,6.4vw,6.5rem)] leading-[.96]">
                Voyez ce que votre boulangerie <span className="text-accent">vous rapporte vraiment.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                MonStock relie vos achats, vos recettes, vos fournées et vos ventes pour rendre votre chiffre d’affaires, vos coûts, vos pertes et votre marge brute estimée enfin lisibles.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/auth" className="btn-press btn-shimmer group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-lift)]">
                  Essayer MonStock pendant 7 jours
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <a href="#finance" className="btn-press inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card/70 px-6 py-3.5 text-sm font-medium backdrop-blur-sm hover:bg-card">
                  Découvrir le suivi financier <ChevronRight className="h-4 w-4" />
                </a>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-accent" /> Sans carte bancaire</span>
                <span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-accent" /> Pensé pour le Mali</span>
                <span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-accent" /> Fonctionne hors connexion</span>
              </div>
            </div>
            <FinancePreview />
          </div>
        </section>

        <section className="bg-primary py-8 text-primary-foreground">
          <div className="mx-auto grid max-w-7xl gap-6 px-6 sm:grid-cols-3 sm:divide-x sm:divide-primary-foreground/15">
            <div><p className="font-display text-3xl"><AnimatedNumber value={4} /> vues</p><p className="mt-1 text-xs text-primary-foreground/65">chiffre d’affaires, coûts, marge et pertes</p></div>
            <div className="sm:pl-8"><p className="font-display text-3xl"><AnimatedNumber value={1} /> historique</p><p className="mt-1 text-xs text-primary-foreground/65">pour retrouver chaque mouvement important</p></div>
            <div className="sm:pl-8"><p className="font-display text-3xl"><AnimatedNumber value={24} format={(n) => `${Math.round(n)} h`} /></p><p className="mt-1 text-xs text-primary-foreground/65">vos données restent consultables chaque jour</p></div>
          </div>
        </section>

        <section id="finance" className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <Reveal className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">Votre argent devient visible</p>
              <h2 className="mt-4 max-w-xl font-display text-4xl leading-tight sm:text-5xl">La rentabilité ne doit plus être une impression.</h2>
            </div>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground lg:ml-auto">
              Vous travaillez tôt, vous produisez beaucoup, vous vendez toute la journée. MonStock transforme ces opérations en indicateurs simples pour savoir où vous gagnez, où vous perdez et quoi corriger en priorité.
            </p>
          </Reveal>

          <div className="mt-16 border-y border-border">
            {financeBenefits.map((benefit, index) => (
              <Reveal key={benefit.title} delay={index * 60} className="group grid gap-5 border-b border-border py-9 last:border-b-0 md:grid-cols-[80px_1fr_1fr] md:items-start">
                <span className="font-display text-2xl text-accent/70">{benefit.index}</span>
                <div className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-secondary text-accent transition-transform duration-300 group-hover:-translate-y-1"><benefit.icon className="h-5 w-5" /></span>
                  <h3 className="font-display text-2xl leading-snug">{benefit.title}</h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground md:pl-8">{benefit.text}</p>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12 border-l-2 border-accent bg-secondary/45 px-6 py-5 sm:flex sm:items-center sm:justify-between sm:gap-8">
            <p className="text-sm leading-relaxed"><strong>Un suivi sérieux, sans fausse promesse.</strong> Les calculs reflètent les opérations enregistrées. MonStock vous aide à tenir des chiffres clairs et peut préparer le travail comptable, sans se substituer aux obligations d’un professionnel agréé.</p>
            <Calculator className="mt-4 h-8 w-8 shrink-0 text-accent sm:mt-0" aria-hidden="true" />
          </Reveal>
        </section>

        <section id="solutions" className="border-y border-border bg-secondary/30 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-6">
            <Reveal className="max-w-3xl">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">De la matière à la marge</p>
              <h2 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">Chaque sac acheté doit servir une production rentable.</h2>
              <p className="mt-5 text-muted-foreground">Le contrôle opérationnel représente la base de chiffres financiers fiables. MonStock suit ce qui entre, ce qui est transformé et ce qui est réellement vendu.</p>
            </Reveal>
            <div className="mt-14 grid gap-px overflow-hidden border border-border bg-border lg:grid-cols-3">
              {operations.map((item, index) => (
                <Reveal key={item.title} delay={index * 90} className="group bg-background p-7 sm:p-9">
                  <item.icon className="h-7 w-7 text-accent transition-transform duration-300 group-hover:scale-110" />
                  <h3 className="mt-8 font-display text-2xl">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="grid gap-14 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
            <Reveal>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">Diriger avec confiance</p>
              <h2 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">Une boulangerie moderne, sans perdre votre manière de travailler.</h2>
              <p className="mt-5 text-muted-foreground">Adoptez les mêmes réflexes de contrôle que les grandes maisons internationales, avec un outil simple, adapté à votre quotidien et accessible depuis le Mali.</p>
            </Reveal>
            <div className="space-y-4">
              {trustPoints.map((item, index) => (
                <Reveal key={item.title} delay={index * 80} className="flex gap-5 border-b border-border pb-6">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"><item.icon className="h-5 w-5" /></span>
                  <div><h3 className="font-display text-xl">{item.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p></div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-6 sm:px-6 sm:pb-8">
          <Reveal className="cta-ledger relative mx-auto max-w-7xl overflow-hidden bg-primary px-6 py-16 text-primary-foreground sm:px-12 sm:py-20">
            <div className="finance-grid pointer-events-none absolute inset-0 opacity-10" aria-hidden="true" />
            <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="max-w-3xl">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/60">Passez du doute au contrôle</p>
                <h2 className="mt-4 font-display text-4xl leading-tight sm:text-6xl">Dès ce soir, regardez votre boulangerie avec des chiffres plus clairs.</h2>
                <p className="mt-5 max-w-2xl text-sm leading-relaxed text-primary-foreground/70">Commencez avec vos matières et vos produits. MonStock construit progressivement la vue financière qui vous aide à protéger chaque franc investi.</p>
              </div>
              <Link to="/auth" className="btn-press group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-background px-6 py-3 text-sm font-semibold text-foreground">
                Commencer gratuitement <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-10 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <Brand />
        <p>© {new Date().getFullYear()} MonStock · Conçu pour les boulangeries artisanales et industrielles.</p>
      </footer>
    </div>
  );
}
