import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Wheat } from "lucide-react";
import hero from "@/assets/hero-bakery.jpg";

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
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Wheat className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-base leading-none">MAYGA & Frères</p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Boulangerie</p>
          </div>
        </div>
        <Link to="/auth" className="rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-secondary transition-colors">
          Se connecter
        </Link>
      </header>

      <section className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 pb-16 pt-8 lg:grid-cols-2 lg:pb-24">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Gestion d'inventaire
          </span>
          <h1 className="mt-6 text-balance font-display text-5xl leading-[1.05] text-foreground sm:text-6xl lg:text-7xl">
            Un stock <span className="italic text-accent">soigné</span>,
            comme votre pain.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            La plateforme discrète et élégante conçue pour la Boulangerie MAYGA & Frères — suivez farine, levure, baguettes et croissants avec une précision d'artisan.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-[var(--shadow-lift)] transition-transform hover:-translate-y-0.5"
            >
              Commencer
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a href="#features" className="inline-flex items-center rounded-full border border-border bg-card px-6 py-3 text-sm hover:bg-secondary">
              Découvrir
            </a>
          </div>
          <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-border pt-8 max-w-md">
            {[
              { k: "∞", v: "produits" },
              { k: "kg · g · L", v: "unités" },
              { k: "temps réel", v: "alertes" },
            ].map((s) => (
              <div key={s.v}>
                <dt className="font-display text-2xl text-foreground">{s.k}</dt>
                <dd className="text-xs uppercase tracking-widest text-muted-foreground">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative">
          <div className="grain overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-lift)]">
            <img src={hero} alt="Intérieur chaleureux d'une boulangerie artisanale" width={1600} height={1000} className="h-full w-full object-cover" />
          </div>
          <div className="absolute -bottom-6 -left-6 hidden sm:block rounded-2xl border border-border bg-card px-5 py-4 shadow-[var(--shadow-lift)] animate-fade-up">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Stock faible</p>
            <p className="mt-1 font-display text-xl">Levure fraîche · 2 kg</p>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { t: "Entrées & sorties", d: "Enregistrez chaque mouvement avec la précision d'un carnet de fournil." },
            { t: "Alertes discrètes", d: "Recevez un signal dès qu'un ingrédient approche du seuil critique." },
            { t: "Statistiques claires", d: "Visualisez la santé de votre stock en un regard, sans tableau surchargé." },
          ].map((f, i) => (
            <div key={f.t} className="card-elegant card-elegant-hover grain p-8 animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <p className="font-display text-[11px] uppercase tracking-[0.24em] text-accent">0{i + 1}</p>
              <h3 className="mt-3 font-display text-2xl">{f.t}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Boulangerie MAYGA & Frères
      </footer>
    </div>
  );
}
