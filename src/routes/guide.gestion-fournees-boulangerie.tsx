import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Wheat, Clock, Flame, ClipboardList, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/guide/gestion-fournees-boulangerie")({ 
  head: () => ({
    meta: [
      { title: "Gestion des fournées en boulangerie : planification et suivi — MonStock" },
      { name: "description", content: "Comment planifier, suivre et optimiser vos fournées en boulangerie ? Modèles, consommation matières, coûts de production : le guide complet." },
      { name: "robots", content: "index, follow" },
      { tagName: "link", rel: "canonical", href: "https://monstock-mali.netlify.app/guide/gestion-fournees-boulangerie" },
      { property: "og:title", content: "Gestion des fournées en boulangerie : planification et suivi" },
      { property: "og:description", content: "Planifiez, suivez et optimisez vos fournées pour réduire les coûts et améliorer votre rentabilité." },
      { property: "og:url", content: "https://monstock-mali.netlify.app/guide/gestion-fournees-boulangerie" },
      { property: "og:type", content: "article" },
    ],
  }),
  component: GuideGestionFournees,
});

function GuideGestionFournees() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Wheat className="h-4 w-4" />
            </span>
            <span className="font-display text-base">MonStock</span>
          </Link>
          <Link to="/auth" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            Essai gratuit <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Gestion des fournées en boulangerie : planification et suivi",
          "description": "Comment planifier, suivre et optimiser vos fournées en boulangerie.",
          "author": { "@type": "Organization", "name": "MonStock" },
          "publisher": { "@type": "Organization", "name": "MonStock", "url": "https://monstock-mali.netlify.app" },
          "url": "https://monstock-mali.netlify.app/guide/gestion-fournees-boulangerie",
          "inLanguage": "fr",
          "datePublished": "2026-09-05",
          "dateModified": "2026-09-05",
        })}} />

        <nav aria-label="Fil d'Ariane" className="mb-8 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Accueil</Link>
          <span className="mx-2">/</span>
          <span>Guides</span>
          <span className="mx-2">/</span>
          <span className="text-foreground">Gestion des fournées</span>
        </nav>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/8 px-3 py-1 text-xs font-medium text-accent">
          Guide production
        </div>

        <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
          Gestion des fournées :<br />planification et suivi
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
          Une fournée mal planifiée, c'est du stock gaspillé, des matières consommées sans traçabilité et une rentabilité impossible à mesurer. Voici comment structurer la gestion de vos fournées pour produire mieux, au bon coût.
        </p>

        <div className="my-10 grid gap-4 sm:grid-cols-3">
          {[
            { icon: ClipboardList, label: "Modèles de fournée", desc: "Standardisez vos recettes et quantités" },
            { icon: Flame, label: "Suivi de production", desc: "Consommation matières en temps réel" },
            { icon: Clock, label: "Analyse des coûts", desc: "Coût réel de chaque fournée" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-card p-4">
              <item.icon className="h-5 w-5 text-accent" />
              <p className="mt-2 font-medium">{item.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>

        <article className="space-y-10">
          <section>
            <h2 className="font-display text-2xl">1. Qu'est-ce qu'une fournée en boulangerie ?</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Une fournée désigne un cycle complet de production : les matières premières entrent, sont transformées, et des produits finis en sortent. Chaque fournée consomme du stock et crée du stock. C'est l'unité de base du contrôle de production en boulangerie.
            </p>
            <div className="mt-5 rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-medium">Une fournée comprend :</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {[
                  "Les matières premières consommées (farine, eau, levure, beurre...)",
                  "Les quantités produites par produit (baguettes, pains, viennoiseries)",
                  "L'heure et la date de production",
                  "Les éventuelles pertes ou défauts de production",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl">2. Les modèles de fournée : standardisez pour gagner du temps</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Un modèle de fournée est une fiche de production prédéfinie qui liste les matières à utiliser et les quantités à produire. Il évite les erreurs, accélère la saisie et rend les coûts comparables d'une fournée à l'autre.
            </p>
            <div className="mt-5 overflow-hidden rounded-xl border border-border">
              <div className="bg-secondary px-5 py-3">
                <p className="text-sm font-semibold">Exemple : Modèle "Fournée baguettes standard (50 pièces)"</p>
              </div>
              <div className="divide-y divide-border">
                {[
                  ["Farine T65", "12,5 kg", "Matière"],
                  ["Eau", "8 L", "Matière"],
                  ["Levure fraîche", "125 g", "Matière"],
                  ["Sel", "250 g", "Matière"],
                  ["Baguettes 250g", "50 pièces", "Production"],
                ].map(([item, qte, type]) => (
                  <div key={item} className="flex items-center justify-between bg-card px-5 py-3 text-sm">
                    <span>{item}</span>
                    <span className="font-medium">{qte}</span>
                    <span className={`text-xs ${type === "Production" ? "text-accent" : "text-muted-foreground"}`}>{type}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl">3. Comment calculer le coût d'une fournée</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Le coût d'une fournée est la somme des coûts de toutes les matières premières consommées, valorisées au coût moyen pondéré.
            </p>
            <div className="mt-5 rounded-xl border border-accent/25 bg-accent/5 p-5">
              <p className="text-sm font-semibold">Calcul pour la fournée baguettes :</p>
              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                <p>Farine 12,5 kg × 517 F/kg = 6 463 F</p>
                <p>Levure 125 g × 4 000 F/kg = 500 F</p>
                <p>Sel 250 g × 300 F/kg = 75 F</p>
                <div className="mt-3 border-t border-border pt-3">
                  <p className="font-semibold text-foreground">Coût total fournée = 7 038 F</p>
                  <p className="font-semibold text-accent">Coût par baguette = 7 038 / 50 = 140,76 F</p>
                  <p className="mt-1 text-xs">Prix de vente baguette : 200 F → Marge = 29,6 %</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl">4. Suivre les écarts de production</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              La production réelle est rarement identique à la production prévue. Suivre les écarts permet de détecter les problèmes récurrents.
            </p>
            <div className="mt-4 space-y-3">
              {[
                [AlertTriangle, "Pièces défectueuses", "Pains mal levés, brûlés ou cassés. À enregistrer comme perte pour avoir des chiffres justes."],
                [AlertTriangle, "Surconsommation de matières", "Si une fournée consomme 15 % de farine de plus que prévu, la recette ou le grammage doit être revu."],
                [AlertTriangle, "Invendus en fin de journée", "Les produits non vendus réduisent la marge réelle. Ajustez les quantités produites par période."],
              ].map(([Icon, titre, texte]) => (
                <div key={titre} className="flex gap-4 rounded-xl border border-border bg-card p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium">{titre}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{texte}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl">5. Fréquence et organisation des fournées</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              La bonne fréquence de fournée dépend de vos ventes. Produire trop génère des invendus ; produire trop peu crée des ruptures et des clients déçus.
            </p>
            <div className="mt-5 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Moment</th>
                    <th className="px-4 py-3 text-left font-medium">Fournée recommandée</th>
                    <th className="px-4 py-3 text-left font-medium">Objectif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    ["3h - 5h du matin", "Pains, baguettes", "Ouvrir avec stock frais"],
                    ["7h - 8h", "Viennoiseries", "Rush petit-déjeuner"],
                    ["10h - 11h", "Complément baguettes", "Anticiper le déjeuner"],
                    ["14h - 15h", "Pains spéciaux", "Après-midi et soirée"],
                  ].map(([moment, fournee, obj]) => (
                    <tr key={moment} className="bg-card">
                      <td className="px-4 py-3 font-medium">{moment}</td>
                      <td className="px-4 py-3 text-muted-foreground">{fournee}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{obj}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </article>

        <div className="mt-16 rounded-2xl bg-primary p-8 text-primary-foreground">
          <h2 className="font-display text-2xl">Suivez chaque fournée avec MonStock</h2>
          <p className="mt-3 text-sm text-primary-foreground/75">Modèles de fournée, consommation automatique des stocks, coût réel par fournée — essai gratuit 7 jours.</p>
          <Link to="/auth" className="mt-5 inline-flex items-center gap-2 rounded-full bg-background px-5 py-2.5 text-sm font-semibold text-foreground">
            Commencer gratuitement <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-12">
          <h3 className="font-display text-xl">Guides liés</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link to="/guide/gestion-stock-boulangerie" className="rounded-xl border border-border bg-card p-4 hover:border-accent transition-colors">
              <p className="font-medium">Gestion de stock boulangerie</p>
              <p className="mt-1 text-xs text-muted-foreground">Matières, seuils, coût moyen →</p>
            </Link>
            <Link to="/guide/calculer-marge-boulangerie" className="rounded-xl border border-border bg-card p-4 hover:border-accent transition-colors">
              <p className="font-medium">Calculer la marge de votre boulangerie</p>
              <p className="mt-1 text-xs text-muted-foreground">Marge brute, rentabilité →</p>
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t border-border px-6 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} MonStock · <Link to="/" className="hover:text-foreground">Retour à l'accueil</Link>
      </footer>
    </div>
  );
}
