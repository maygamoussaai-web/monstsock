import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Wheat, CheckCircle2, AlertTriangle, TrendingUp, Package, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/guide/gestion-stock-boulangerie")({ 
  head: () => ({
    meta: [
      { title: "Gestion de stock boulangerie : le guide complet 2026 — MonStock" },
      { name: "description", content: "Comment gérer efficacement le stock d'une boulangerie artisanale ? Matières premières, seuils d'alerte, coût moyen pondéré : tout ce qu'il faut savoir." },
      { name: "robots", content: "index, follow" },
      { tagName: "link", rel: "canonical", href: "https://monstock-mali.netlify.app/guide/gestion-stock-boulangerie" },
      { property: "og:title", content: "Gestion de stock boulangerie : le guide complet 2026" },
      { property: "og:description", content: "Matières premières, seuils d'alerte, coût moyen : gérez le stock de votre boulangerie comme un professionnel." },
      { property: "og:url", content: "https://monstock-mali.netlify.app/guide/gestion-stock-boulangerie" },
      { property: "og:type", content: "article" },
    ],
  }),
  component: GuideGestionStock,
});

function GuideGestionStock() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
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
        {/* JSON-LD Article */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Gestion de stock boulangerie : le guide complet 2026",
          "description": "Comment gérer efficacement le stock d'une boulangerie artisanale : matières premières, seuils d'alerte, coût moyen pondéré.",
          "author": { "@type": "Organization", "name": "MonStock" },
          "publisher": { "@type": "Organization", "name": "MonStock", "url": "https://monstock-mali.netlify.app" },
          "url": "https://monstock-mali.netlify.app/guide/gestion-stock-boulangerie",
          "inLanguage": "fr",
          "datePublished": "2026-09-05",
          "dateModified": "2026-09-05",
        })}} />

        {/* Fil d'Ariane */}
        <nav aria-label="Fil d'Ariane" className="mb-8 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Accueil</Link>
          <span className="mx-2">/</span>
          <span>Guides</span>
          <span className="mx-2">/</span>
          <span className="text-foreground">Gestion de stock boulangerie</span>
        </nav>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/8 px-3 py-1 text-xs font-medium text-accent">
          Guide pratique
        </div>

        <h1 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
          Gestion de stock boulangerie :<br />le guide complet
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
          Un stock mal géré, c'est de l'argent perdu chaque jour : farine périmée, rupture de beurre en pleine fournée, invendus qui s'accumulent. Ce guide vous explique comment maîtriser le stock de votre boulangerie, du suivi des matières premières au calcul du coût moyen pondéré.
        </p>

        <div className="my-10 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Package, label: "Matières premières", desc: "Farine, levure, beurre, sucre, emballages" },
            { icon: AlertTriangle, label: "Seuils d'alerte", desc: "Ne jamais tomber en rupture" },
            { icon: TrendingUp, label: "Coût moyen pondéré", desc: "Connaître le vrai coût de chaque produit" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-card p-4">
              <item.icon className="h-5 w-5 text-accent" />
              <p className="mt-2 font-medium">{item.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>

        <article className="prose-custom space-y-10">
          <section>
            <h2 className="font-display text-2xl">1. Pourquoi la gestion de stock est cruciale en boulangerie</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              En boulangerie artisanale, le stock représente entre 25 % et 40 % du chiffre d'affaires sous forme de coût matière. Une mauvaise gestion se traduit directement par une marge réduite. Trois problèmes reviennent systématiquement :
            </p>
            <ul className="mt-4 space-y-3">
              {[
                "Les ruptures de stock qui arrêtent la production en pleine journée",
                "Le surstockage qui génère des pertes par péremption",
                "L'absence de traçabilité qui rend impossible le calcul du coût réel",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl">2. Les matières premières à suivre en priorité</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Toutes les matières ne méritent pas le même niveau d'attention. Classez-les par importance selon leur coût et leur criticité pour la production :
            </p>
            <div className="mt-6 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Matière</th>
                    <th className="px-4 py-3 text-left font-medium">Criticité</th>
                    <th className="px-4 py-3 text-left font-medium">Stock minimum conseillé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[
                    ["Farine", "Très élevée", "50 kg minimum"],
                    ["Levure", "Élevée", "2 kg (fraîche)"],
                    ["Beurre", "Élevée", "5 kg"],
                    ["Sucre", "Moyenne", "10 kg"],
                    ["Sel", "Faible", "3 kg"],
                    ["Emballages", "Moyenne", "200 unités"],
                  ].map(([mat, crit, stock]) => (
                    <tr key={mat} className="bg-card">
                      <td className="px-4 py-3 font-medium">{mat}</td>
                      <td className="px-4 py-3 text-muted-foreground">{crit}</td>
                      <td className="px-4 py-3 text-muted-foreground">{stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl">3. Le coût moyen pondéré (CMP) expliqué</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Le coût moyen pondéré permet de connaître le coût réel d'une matière quand vous l'achetez à des prix variables. Par exemple, si vous achetez de la farine à des prix différents :
            </p>
            <div className="mt-5 rounded-xl border border-accent/25 bg-accent/5 p-5">
              <p className="text-sm font-medium">Exemple de calcul CMP :</p>
              <p className="mt-2 text-sm text-muted-foreground">Achat 1 : 100 kg à 500 F/kg = 50 000 F</p>
              <p className="text-sm text-muted-foreground">Achat 2 : 50 kg à 550 F/kg = 27 500 F</p>
              <p className="mt-2 text-sm font-semibold text-accent">CMP = (50 000 + 27 500) / (100 + 50) = 516,67 F/kg</p>
              <p className="mt-2 text-xs text-muted-foreground">MonStock calcule ce coût automatiquement à chaque réapprovisionnement.</p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl">4. Mettre en place des seuils d'alerte</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Un seuil d'alerte est une quantité minimale en dessous de laquelle vous devez commander. Il se calcule en tenant compte de votre consommation journalière et de votre délai de livraison fournisseur.
            </p>
            <div className="mt-4 rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-medium">Formule :</p>
              <p className="mt-2 font-display text-lg text-accent">Seuil = Consommation journalière × (Délai livraison + Jours de sécurité)</p>
              <p className="mt-2 text-xs text-muted-foreground">Exemple : Farine 10 kg/jour, délai 2 jours, 1 jour sécurité → seuil = 30 kg</p>
            </div>
          </section>

          <section>
            <h2 className="font-display text-2xl">5. Les erreurs à éviter</h2>
            <div className="mt-4 space-y-3">
              {[
                ["Ne pas distinguer stock réel et stock théorique", "Pesez et comptez régulièrement pour détecter les écarts."],
                ["Ignorer les pertes de production", "Une pâte ratée ou un pain brûlé doit être enregistré pour avoir des chiffres justes."],
                ["Gérer le stock de tête", "Ce qui n'est pas écrit n'existe pas. Chaque mouvement doit être tracé."],
                ["Négliger la rotation des stocks", "Utilisez les matières dans l'ordre d'achat (FIFO) pour éviter les périmés."],
              ].map(([err, sol]) => (
                <div key={err} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm font-medium text-destructive">✗ {err}</p>
                  <p className="mt-1 text-xs text-muted-foreground">→ {sol}</p>
                </div>
              ))}
            </div>
          </section>
        </article>

        {/* CTA */}
        <div className="mt-16 rounded-2xl bg-primary p-8 text-primary-foreground">
          <h2 className="font-display text-2xl">Gérez le stock de votre boulangerie avec MonStock</h2>
          <p className="mt-3 text-sm text-primary-foreground/75">Matières premières, seuils d'alerte, coût moyen pondéré — tout est automatisé. Essai gratuit 7 jours, sans carte bancaire.</p>
          <Link to="/auth" className="mt-5 inline-flex items-center gap-2 rounded-full bg-background px-5 py-2.5 text-sm font-semibold text-foreground">
            Commencer gratuitement <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Articles liés */}
        <div className="mt-12">
          <h3 className="font-display text-xl">Guides liés</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link to="/guide/calculer-marge-boulangerie" className="rounded-xl border border-border bg-card p-4 hover:border-accent transition-colors">
              <p className="font-medium">Comment calculer la marge de votre boulangerie</p>
              <p className="mt-1 text-xs text-muted-foreground">Marge brute, marge nette, seuil de rentabilité →</p>
            </Link>
            <Link to="/guide/gestion-fournees-boulangerie" className="rounded-xl border border-border bg-card p-4 hover:border-accent transition-colors">
              <p className="font-medium">Optimiser la gestion des fournées</p>
              <p className="mt-1 text-xs text-muted-foreground">Planification, coûts, suivi de production →</p>
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
