import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Wheat, Package2, Flame, ShoppingBag, LineChart, ShieldCheck, Scale, EyeOff, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MonStock — Reprenez le contrôle du stock de votre boulangerie" },
      { name: "description", content: "MonStock aide les boulangeries à contrôler leur stock, éliminer les pertes (vols, invendus, erreurs) et augmenter leurs bénéfices, fournée après fournée." },
      { property: "og:title", content: "MonStock — Reprenez le contrôle du stock de votre boulangerie" },
      { property: "og:description", content: "Contrôlez chaque gramme, tuez les pertes invisibles, faites grimper vos marges." },
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

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Wheat className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-base leading-none">MonStock</p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Pour les boulangeries</p>
          </div>
        </div>
        <Link to="/auth" className="rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-secondary transition-colors">
          Se connecter
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-12 pb-16">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Conçu pour les boulangeries artisanales
          </span>
          <h1 className="mt-6 text-balance font-display text-5xl leading-[1.05] text-foreground sm:text-6xl">
            Reprenez le <span className="italic text-accent">contrôle</span><br/>de votre fournil.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Chaque sac de farine, chaque baguette, chaque invendu compte. MonStock traque chaque mouvement du stock,
            démasque les pertes silencieuses et transforme votre boulangerie en une machine à marges nettes.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-lift)] transition-transform hover:-translate-y-0.5"
            >
              Ouvrir mon compte
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a href="#pourquoi" className="inline-flex items-center rounded-full border border-border bg-card px-6 py-3 text-sm hover:bg-secondary">
              Pourquoi MonStock
            </a>
          </div>
        </div>
      </section>

      <section id="pourquoi" className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-10">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Pourquoi MonStock</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">Trois vérités que MonStock change chez vous</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              i: Scale,
              t: "Chaque gramme de farine compté, chaque perte visible",
              d: "Fini les estimations à la louche. Vous savez, à tout moment, combien il vous reste et combien ça vous coûte.",
            },
            {
              i: EyeOff,
              t: "Fini les vols et les invendus qui rongent la marge en silence",
              d: "Écarts de stock, invendus, casse : tout apparaît noir sur blanc. Ce qui se voit se corrige.",
            },
            {
              i: TrendingUp,
              t: "Voyez vos bénéfices progresser, fournée après fournée",
              d: "Coût matière, ventes, pertes, bénéfice brut : votre rentabilité réelle, pas celle du carnet.",
            },
          ].map((f, i) => (
            <div key={f.t} className="card-elegant card-elegant-hover grain p-8 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
                <f.i className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-xl leading-snug">{f.t}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-10">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Fonctionnalités</p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">Tout votre atelier, dans une seule application</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { i: Package2, t: "Matières premières", d: "Suivi précis des quantités, prix d'achat, coût moyen pondéré et seuils d'alerte." },
            { i: Flame, t: "Fournées & recettes", d: "Modèles réutilisables, consommations réelles saisies, coût matière calculé automatiquement." },
            { i: ShoppingBag, t: "Ventes & invendus", d: "Ouvrez une session, saisissez stocks et invendus, vos ventes se calculent seules." },
            { i: LineChart, t: "Tableau de bord financier", d: "Chiffre d'affaires, valeur du stock, coût matière, pertes et bénéfice brut estimé." },
            { i: ShieldCheck, t: "Historique immuable", d: "Chaque mouvement de stock est tracé et non modifiable pour une traçabilité totale." },
            { i: Wheat, t: "Pensé pour l'artisan", d: "Interface claire, prête pour le mobile — installez MonStock comme une application." },
          ].map((f, i) => (
            <div key={f.t} className="card-elegant card-elegant-hover grain p-8 animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-accent">
                <f.i className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-2xl">{f.t}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="card-elegant grain p-10 sm:p-14 text-center animate-fade-up">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Prêt à démarrer ?</p>
          <h2 className="mt-3 font-display text-3xl sm:text-4xl max-w-2xl mx-auto">
            Rejoignez les boulangeries qui ont repris le contrôle de leur stock.
          </h2>
          <p className="mt-4 max-w-xl mx-auto text-muted-foreground">
            En quelques minutes, votre atelier est en ligne. Vos matières, vos recettes et vos ventes travaillent enfin pour vous.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              to="/auth"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-lift)] transition-transform hover:-translate-y-0.5"
            >
              Ouvrir mon compte
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} MonStock · Gestion pour boulangeries artisanales
      </footer>
    </div>
  );
}
