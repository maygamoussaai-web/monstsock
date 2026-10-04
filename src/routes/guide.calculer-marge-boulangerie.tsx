import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Wheat, TrendingUp, TrendingDown, Calculator, PieChart } from "lucide-react";

export const Route = createFileRoute("/guide/calculer-marge-boulangerie")({ 
  head: () => ({
    meta: [
      { title: "Comment calculer la marge de votre boulangerie — MonStock" },
      { name: "description", content: "Marge brute, marge nette, seuil de rentabilité : apprenez à calculer et piloter la rentabilité de votre boulangerie artisanale étape par étape." },
      { name: "robots", content: "index, follow" },
      { tagName: "link", rel: "canonical", href: "https://monstock-mali.netlify.app/guide/calculer-marge-boulangerie" },
      { property: "og:title", content: "Comment calculer la marge de votre boulangerie — MonStock" },
      { property: "og:description", content: "Marge brute, marge nette, seuil de rentabilité : pilotez la rentabilité de votre boulangerie." },
      { property: "og:url", content: "https://monstock-mali.netlify.app/guide/calculer-marge-boulangerie" },
      { property: "og:type", content: "article" },
    ],
  }),
  component: GuideMargeCalcul,
});

function GuideMargeCalcul() {
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
          "headline": "Comment calculer la marge de votre boulangerie",
          "description": "Marge brute, marge nette, seuil de rentabilité : pilotez la rentabilité de votre boulangerie artisanale.",
          "author": { "@type": "Organization", "name": "MonStock" },
          "publisher": { "@type": "Organization", "name": "MonStock", "url": "https://monstock-mali.netlify.app" },
          "url": "https://monstock-mali.netlify.app/guide/calculer-marge-boulangerie",
          "inLanguage": "fr",
          "datePublished": "2026-09-05",
          "dateModified": "2026-09-05",
        })}} />

        <nav aria-label="Fil d'Ariane" className="mb-8 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Accueil</Link>
          <span className="mx-2">/</span>
          <span>Guides</span>
          <span className="mx-2">/</span>
          <span className="text-foreground">Calculer la marge boulangerie</span>
        </nav>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/8 px-3 py-1 text-xs font-medium text-accent">
          Guide financier
        </div>

        <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
          Comment calculer la marge<br />de votre boulangerie
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
          Savoir si votre boulangerie est rentable ne se résume pas au montant en caisse en fin de journée. La marge, c'est ce qui reste une fois les matières et les charges payées. Ce guide vous explique comment la calculer et surtout comment l'améliorer.
        </p>

        <div className="my-10 grid gap-4 sm:grid-cols-3">
          {[
            { icon: TrendingUp, label: "Marge brute", desc: "CA − Coût des matières" },
            { icon: Calculator, label: "Marge nette", desc: "Marge brute − Charges fixes" },
            { icon: PieChart, label: "Seuil de rentabilité", desc: "À partir de quand vous gagnez" },
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
            <h2 className="font-display text-2xl">1. La marge brute : votre premier indicateur</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              La marge brute mesure ce qui reste après avoir payé uniquement les matières premières utilisées pour produire ce que vous avez vendu.
            </p>
            <div className="mt-5 rounded-xl border border-accent/25 bg-accent/5 p-5">
              <p className="text-sm font-semibold">Formule marge brute :</p>
              <p className="mt-2 font-display text-xl text-accent">Marge brute = Chiffre d'affaires − Coût des matières consommées</p>
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-sm font-medium">Exemple :</p>
                <p className="mt-1 text-sm text-muted-foreground">CA du mois : 1 500 000 F</p>
                <p className="text-sm text-muted-foreground">Coût matières : 525 000 F (35 %)</p>
                <p className="mt-1 text-sm font-semibold text-accent">Marge brute = 975 000 F (65 %)</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              En boulangerie artisanale, une marge brute saine se situe entre 60 % et 72 %. En dessous de 55 %, vos prix de vente sont trop bas ou vos achats trop coûteux.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl">2. Le taux de marge et le taux de marque</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="font-medium">Taux de marge</p>
                <p className="mt-2 font-display text-lg text-accent">(Prix vente − Coût) / Coût × 100</p>
                <p className="mt-2 text-xs text-muted-foreground">Exprime le bénéfice par rapport au coût de revient. Utile pour fixer un prix à partir d'un coût.</p>
                <p className="mt-3 text-xs">Exemple : coût 200 F, prix 600 F → taux de marge = 200 %</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <p className="font-medium">Taux de marque</p>
                <p className="mt-2 font-display text-lg text-accent">(Prix vente − Coût) / Prix vente × 100</p>
                <p className="mt-2 text-xs text-muted-foreground">Exprime la marge par rapport au prix de vente. C'est l'indicateur utilisé par MonStock.</p>
                <p className="mt-3 text-xs">Exemple : coût 200 F, prix 600 F → taux de marque = 66,7 %</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl">3. Les produits qui tirent votre marge vers le bas</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Tous les produits ne se valent pas. Un produit vendu en grande quantité avec une faible marge peut nuire à votre résultat global. Identifiez-les :
            </p>
            <div className="mt-5 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Produit</th>
                    <th className="px-4 py-3 text-left font-medium">Prix vente</th>
                    <th className="px-4 py-3 text-left font-medium">Coût matière</th>
                    <th className="px-4 py-3 text-left font-medium">Marge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    ["Baguette standard", "200 F", "62 F", "69 %", "positive"],
                    ["Pain de mie", "500 F", "175 F", "65 %", "positive"],
                    ["Croissant beurre", "300 F", "138 F", "54 %", "warning"],
                    ["Gâteau spécial", "2 500 F", "1 250 F", "50 %", "warning"],
                  ].map(([prod, pv, cm, marge, tone]) => (
                    <tr key={prod} className="bg-card">
                      <td className="px-4 py-3 font-medium">{prod}</td>
                      <td className="px-4 py-3 text-muted-foreground">{pv}</td>
                      <td className="px-4 py-3 text-muted-foreground">{cm}</td>
                      <td className={`px-4 py-3 font-semibold ${tone === "warning" ? "text-destructive" : "text-accent"}`}>{marge}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl">4. Calculer votre seuil de rentabilité</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Le seuil de rentabilité est le chiffre d'affaires minimum à atteindre pour couvrir toutes vos charges. En dessous, vous perdez de l'argent.
            </p>
            <div className="mt-5 rounded-xl border border-accent/25 bg-accent/5 p-5">
              <p className="text-sm font-semibold">Formule :</p>
              <p className="mt-2 font-display text-lg text-accent">Seuil = Charges fixes / Taux de marge sur coût variable</p>
              <div className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">
                <p>Charges fixes mensuelles : 400 000 F (loyer, salaires, électricité...)</p>
                <p>Taux de marge brute : 65 %</p>
                <p className="mt-2 font-semibold text-foreground">Seuil = 400 000 / 0,65 = 615 385 F/mois</p>
                <p className="mt-1 text-xs">→ Vous devez faire au moins 615 385 F de CA pour ne pas perdre d'argent.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl">5. Comment améliorer votre marge</h2>
            <div className="mt-4 space-y-3">
              {[
                [TrendingUp, "Négocier les prix fournisseurs", "Une réduction de 5 % sur la farine peut représenter plusieurs dizaines de milliers de francs par an."],
                [TrendingDown, "Réduire les pertes", "Chaque pain invendu ou raté est une perte directe. Suivre et analyser les pertes permet d'ajuster la production."],
                [Calculator, "Revoir les prix de vente", "Si votre marge sur un produit est inférieure à 55 %, soit vous augmentez le prix, soit vous reformulez la recette."],
                [PieChart, "Mettre en avant les produits rentables", "Boostez les ventes de vos produits à forte marge en les positionnant mieux en vitrine."],
              ].map(([Icon, titre, texte]) => (
                <div key={titre} className="flex gap-4 rounded-xl border border-border bg-card p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-accent">
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
        </article>

        <div className="mt-16 rounded-2xl bg-primary p-8 text-primary-foreground">
          <h2 className="font-display text-2xl">Suivez votre marge en temps réel avec MonStock</h2>
          <p className="mt-3 text-sm text-primary-foreground/75">CA, coût matière, marge brute estimée, pertes — tout est calculé automatiquement. Essai gratuit 7 jours.</p>
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
            <Link to="/guide/gestion-fournees-boulangerie" className="rounded-xl border border-border bg-card p-4 hover:border-accent transition-colors">
              <p className="font-medium">Optimiser la gestion des fournées</p>
              <p className="mt-1 text-xs text-muted-foreground">Planification, coûts, suivi →</p>
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
