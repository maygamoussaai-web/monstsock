// Fond chaud discret pour les pages internes de l'app : deux nappes de couleur
// fixes + une poignée de grains qui dérivent doucement, en CSS pur (aucun
// scroll, aucun calcul JS par frame) — contrairement à la scène de la page
// d'accueil, pensée pour rester fluide sur toutes les pages, même chargées.
const GRAINS = [
  { left: "6%", top: "14%", size: 4, delay: "-2s", dur: "24s" },
  { left: "18%", top: "62%", size: 3, delay: "-9s", dur: "20s" },
  { left: "32%", top: "28%", size: 5, delay: "-4s", dur: "27s" },
  { left: "47%", top: "78%", size: 3, delay: "-14s", dur: "22s" },
  { left: "61%", top: "10%", size: 4, delay: "-6s", dur: "25s" },
  { left: "74%", top: "48%", size: 3, delay: "-11s", dur: "19s" },
  { left: "85%", top: "22%", size: 5, delay: "-1s", dur: "26s" },
  { left: "91%", top: "70%", size: 3, delay: "-16s", dur: "21s" },
  { left: "12%", top: "88%", size: 4, delay: "-8s", dur: "23s" },
  { left: "55%", top: "55%", size: 3, delay: "-13s", dur: "18s" },
];

export function AppBackground() {
  return (
    <div className="app-grain-bg" aria-hidden="true">
      <div
        className="absolute -top-1/4 -left-1/4 h-[55vmax] w-[55vmax] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, oklch(0.62 0.11 55 / 0.16), transparent 70%)" }}
      />
      <div
        className="absolute -bottom-1/4 -right-1/4 h-[50vmax] w-[50vmax] rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, oklch(0.45 0.08 40 / 0.11), transparent 70%)" }}
      />
      {GRAINS.map((g, i) => (
        <span
          key={i}
          className="ms-flour absolute rounded-full"
          style={{
            left: g.left,
            top: g.top,
            width: g.size,
            height: g.size,
            background: "oklch(0.55 0.1 55 / 0.4)",
            animationDuration: g.dur,
            animationDelay: g.delay,
            ["--drift" as any]: "-16px",
          }}
        />
      ))}
    </div>
  );
}