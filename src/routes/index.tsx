import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Wheat, Package2, Flame, ShoppingBag, LineChart, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
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

      <section className="mx-auto max-w-6xl px-6 pt-12 pb-20">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Boulangeries artisanales & PME
          </span>
          <h1 className="mt-6 text-balance font-display text-5xl leading-[1.05] text-foreground sm:text-6xl">
            La gestion, <span className="italic text-accent">enfin taillée</span><br/>pour le fournil.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            MonStock relie vos matières premières, vos recettes, vos fournées et vos ventes en un seul outil clair — pour piloter marges, pertes et réapprovisionnements sans tableur.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-lift)] transition-transform hover:-translate-y-0.5"
            >
              Ouvrir mon compte
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a href="#features" className="inline-flex items-center rounded-full border border-border bg-card px-6 py-3 text-sm hover:bg-secondary">
              Voir les fonctionnalités
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
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

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} MonStock · Gestion pour boulangeries artisanales
      </footer>
    </div>
  );
}
