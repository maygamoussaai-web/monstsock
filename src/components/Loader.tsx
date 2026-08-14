import type { ReactNode } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// BaguetteLoader — loader unique de l'application. Une baguette (couleur croûte)
// tourne en orbite autour d'un halo chaud, avec une traînée de farine.
// Couleurs locales, indépendantes des tokens oklch du thème.
// ─────────────────────────────────────────────────────────────────────────────
export function BaguetteLoader({ size = 56 }: { size?: number }) {
  return (
    <div className="relative" aria-hidden="true">
      <style>{`
        .ms-loader {
          --crust: #a8541f;
          --crust-dark: #7d3c14;
          --accent: #c97c3d;
          --glow: #e8b06b;
        }
        @keyframes ms-orbit-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes ms-glow-breathe {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50%      { opacity: 0.6;  transform: scale(1.08); }
        }
        .ms-orbit { animation: ms-orbit-spin 1.6s linear infinite; transform-origin: 50px 50px; }
        .ms-loader-glow { animation: ms-glow-breathe 1.6s ease-in-out infinite; transform-origin: 50px 50px; }
      `}</style>
      <svg className="ms-loader" width={size} height={size} viewBox="0 0 100 100" fill="none">
        <circle className="ms-loader-glow" cx="50" cy="50" r="34" fill="var(--glow)" opacity={0.4} />
        <g className="ms-orbit">
          <circle cx="50" cy="20" r="2.4" fill="var(--accent)" opacity={0.15} transform="rotate(24 50 50)" />
          <circle cx="50" cy="20" r="2.8" fill="var(--accent)" opacity={0.3} transform="rotate(14 50 50)" />
          <circle cx="50" cy="20" r="3.2" fill="var(--accent)" opacity={0.5} transform="rotate(7 50 50)" />
          <g transform="translate(50 16) rotate(90)">
            <rect x="-11" y="-3.4" width="22" height="6.8" rx="3.4" fill="var(--crust)" />
            <line x1="-6" y1="-2" x2="-4" y2="2" stroke="var(--crust-dark)" strokeWidth="1.1" strokeLinecap="round" />
            <line x1="-1.5" y1="-2.2" x2="0.5" y2="2.2" stroke="var(--crust-dark)" strokeWidth="1.1" strokeLinecap="round" />
            <line x1="3" y1="-2" x2="5" y2="2" stroke="var(--crust-dark)" strokeWidth="1.1" strokeLinecap="round" />
          </g>
        </g>
      </svg>
    </div>
  );
}

/** Loader centré avec libellé — remplace les spinners génériques. */
export function InlineLoader({ label, size = 40 }: { label?: string; size?: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <BaguetteLoader size={size} />
      {label && <p className="text-xs text-muted-foreground animate-pulse">{label}</p>}
    </div>
  );
}

/** Bloc squelette générique. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** Squelette de liste (lignes avec avatar + deux lignes de texte). */
export function SkeletonRows({ rows = 4, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`} aria-busy="true" aria-label="Chargement">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3" style={{ animationDelay: `${i * 80}ms` }}>
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
          <Skeleton className="h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

/** Squelette de grille de cartes. */
export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-elegant p-5 space-y-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-3.5 w-3/5" />
          <Skeleton className="h-2.5 w-2/5" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState — état vide avec icône animée discrète (flottement lent).
// ─────────────────────────────────────────────────────────────────────────────
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: {
  icon: any;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
      <div className="relative">
        <span className="absolute inset-0 rounded-full bg-accent/10 blur-xl" aria-hidden="true" />
        <div className="animate-float-soft relative grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-accent">
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <p className="mt-5 font-display text-lg">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
/** Étiquette de statut colorée (stock bas, archivé, en attente...). */
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "warning" | "accent" | "neutral" | "success";
}) {
  const cls = { warning: "badge-warning", accent: "badge-accent", neutral: "badge-neutral", success: "badge-success" }[tone];
  return <span className={`badge-pill ${cls}`}>{children}</span>;
}

/** Squelette de tableau — remplace un spinner générique pendant le premier
 * chargement d'une liste (matières, produits, ventes...). columns définit la
 * largeur relative de chaque colonne pour ressembler au tableau réel. */
export function SkeletonTable({
  rows = 5,
  columns = ["2fr", "1fr", "1fr"],
}: {
  rows?: number;
  columns?: string[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border" aria-busy="true" aria-label="Chargement">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid items-center gap-4 border-b border-border/60 px-4 py-3.5 last:border-0"
          style={{ gridTemplateColumns: columns.join(" "), animationDelay: `${i * 70}ms` }}
        >
          {columns.map((_, c) => (
            <Skeleton key={c} className={`h-3.5 ${c === 0 ? "w-3/5" : "w-2/5 justify-self-end"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}
