/**
 * BaguetteFlourish — animation SVG améliorée de la page de connexion.
 *
 * Améliorations vs l'originale :
 *  • 7 grains de pâte (au lieu de 5) avec trajectoires plus variées
 *  • Forme de baguette plus réaliste : légèrement bombée, extrémités effilées
 *  • 6 incisions au lieu de 5, mieux espacées et plus naturelles
 *  • Reflet de croûte dorée supplémentaire
 *  • Halo de chaleur plus doux avec double pulse
 *  • 4 filets de vapeur (au lieu de 3) avec délais et courbes différentes
 *  • Particules d'éclat plus nombreuses (8) et mieux distribuées
 *  • Éasing cubic-bezier sur les grains pour un effet magnétique naturel
 *  • Timing légèrement allongé (7.2 s) pour plus de respiration
 *  • prefers-reduced-motion : baguette cuite affichée statiquement
 */
export function BaguetteFlourish() {
  return (
    <div className="relative mt-8 flex flex-col items-center select-none" aria-hidden="true">
      <style>{`
        .bf {
          --dough:      #f3e6c8;
          --dough-warm: #edd9a8;
          --crust:      #b85c20;
          --crust-tip:  #8b3d10;
          --crust-dark: #7d3c14;
          --accent:     #c97c3d;
          --shine:      #f5c96a;
          --glow:       #e8b06b;
        }

        /* ── Grains de pâte ── */
        @keyframes bf-piece-move {
          0%   { transform: translate(var(--dx), var(--dy)); opacity: 0.9; }
          8%   { opacity: 1; }
          32%  { transform: translate(0, 0); }
          48%  { transform: translate(0, 0); opacity: 1; }
          50%  { opacity: 0; }
          92%  { opacity: 0; transform: translate(var(--dx), var(--dy)); }
          100% { transform: translate(var(--dx), var(--dy)); opacity: 0.9; }
        }
        .bf-piece {
          animation: bf-piece-move 7.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        /* ── Éclat de fusion ── */
        @keyframes bf-burst {
          0%, 44%  { opacity: 0; transform: scale(0.3); }
          49%      { opacity: 1; transform: scale(1.1); }
          56%      { opacity: 0; transform: scale(1.7); }
          100%     { opacity: 0; }
        }
        .bf-burst { animation: bf-burst 7.2s ease-out infinite; transform-origin: center; }

        /* ── Anneau d'éclat ── */
        @keyframes bf-ring {
          0%, 44%  { opacity: 0; r: 8; stroke-width: 2; }
          48%      { opacity: 0.6; r: 8; stroke-width: 2; }
          58%      { opacity: 0; r: 22; stroke-width: 0.5; }
          100%     { opacity: 0; }
        }
        .bf-ring { animation: bf-ring 7.2s ease-out infinite; transform-origin: center; }

        /* ── Baguette apparition ── */
        @keyframes bf-baguette-in {
          0%, 46%   { opacity: 0; transform: scale(0.7) translateX(-6px); }
          54%       { opacity: 1; transform: scale(1.04) translateX(0); }
          60%       { transform: scale(1); }
          84%       { opacity: 1; transform: scale(1); }
          94%       { opacity: 0; transform: scale(0.82) translateX(4px); }
          100%      { opacity: 0; transform: scale(0.7) translateX(-6px); }
        }
        .bf-baguette-wrap {
          animation: bf-baguette-in 7.2s cubic-bezier(0.34, 1.18, 0.64, 1) infinite;
          transform-origin: 75px 66px;
        }

        /* Croûte qui dore */
        @keyframes bf-crust {
          0%, 52%  { fill: var(--dough); }
          68%      { fill: var(--crust); }
          100%     { fill: var(--crust); }
        }
        .bf-body { animation: bf-crust 7.2s ease-in-out infinite; }

        @keyframes bf-tip {
          0%, 52%  { fill: var(--dough-warm); }
          68%      { fill: var(--crust-tip); }
          100%     { fill: var(--crust-tip); }
        }
        .bf-tip { animation: bf-tip 7.2s ease-in-out infinite; }

        /* ── Halo de chaleur ── */
        @keyframes bf-glow {
          0%, 50%  { opacity: 0; rx: 48; ry: 22; }
          62%      { opacity: 0.45; rx: 54; ry: 26; }
          72%      { opacity: 0.18; }
          80%      { opacity: 0.38; }
          90%      { opacity: 0; }
          100%     { opacity: 0; }
        }
        .bf-glow { animation: bf-glow 7.2s ease-in-out infinite; }

        /* ── Reflet de croûte ── */
        @keyframes bf-shine {
          0%, 56%  { opacity: 0; }
          66%      { opacity: 0.38; }
          82%      { opacity: 0.18; }
          90%      { opacity: 0; }
          100%     { opacity: 0; }
        }
        .bf-shine { animation: bf-shine 7.2s ease-in-out infinite; }

        /* ── Vapeur ── */
        @keyframes bf-steam {
          0%, 57%  { opacity: 0; transform: translateY(0) scaleX(1); }
          64%      { opacity: 0.55; }
          87%      { opacity: 0; transform: translateY(-20px) scaleX(1.4); }
          100%     { opacity: 0; }
        }
        .bf-steam { animation: bf-steam 7.2s ease-in infinite; }

        /* ── prefers-reduced-motion ── */
        @media (prefers-reduced-motion: reduce) {
          .bf-piece, .bf-burst, .bf-ring,
          .bf-glow, .bf-shine, .bf-steam { animation: none !important; opacity: 0 !important; }
          .bf-baguette-wrap { animation: none !important; opacity: 1 !important; transform: none !important; }
          .bf-body { animation: none !important; fill: var(--crust) !important; }
          .bf-tip  { animation: none !important; fill: var(--crust-tip) !important; }
        }
      `}</style>

      <svg className="bf" width="160" height="130" viewBox="0 0 160 130" fill="none"
           style={{ overflow: "visible" }}>

        {/* Halo de chaleur */}
        <ellipse className="bf-glow" cx="80" cy="68" rx="48" ry="22"
                 fill="var(--glow)" opacity={0} />

        {/* Vapeur — 4 filets */}
        <path className="bf-steam" d="M52 42c-5-7 5-10 0-18"
              stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <path className="bf-steam" d="M70 37c-4-7 4-10 0-18"
              stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" fill="none"
              style={{ animationDelay: "0.4s" }} />
        <path className="bf-steam" d="M90 37c-4-7 4-10 0-18"
              stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" fill="none"
              style={{ animationDelay: "0.9s" }} />
        <path className="bf-steam" d="M108 42c-5-7 5-10 0-18"
              stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" fill="none"
              style={{ animationDelay: "0.65s" }} />

        {/* Anneau d'éclat */}
        <circle className="bf-ring" cx="80" cy="66" r="8"
                fill="none" stroke="#fffbe8" strokeWidth="2" opacity={0} />

        {/* Particules d'éclat — 8 points */}
        {([
          [64, 57, 2.2, "0s"],
          [92, 59, 1.8, "0.04s"],
          [78, 46, 2.0, "0.09s"],
          [72, 80, 1.7, "0.07s"],
          [98, 78, 1.5, "0.14s"],
          [56, 74, 1.5, "0.11s"],
          [85, 50, 1.6, "0.06s"],
          [62, 82, 1.4, "0.16s"],
        ] as [number, number, number, string][]).map(([cx, cy, r, delay], i) => (
          <circle key={i} className="bf-burst" cx={cx} cy={cy} r={r}
                  fill="#fffbe8" opacity={0}
                  style={{ animationDelay: delay }} />
        ))}

        {/* ── Grains de pâte — 7 morceaux ── */}
        {([
          [62, 66, 10, 8,  "-38px", "-16px", "0s"],
          [91, 65, 9,  8,  "38px",  "-12px", "0.05s"],
          [70, 67, 8,  7,  "-24px", "24px",  "0.1s"],
          [84, 67, 8,  7,  "26px",  "26px",  "0.08s"],
          [77, 65, 8,  7,  "0px",   "-32px", "0.03s"],
          [55, 68, 7,  6,  "-48px", "4px",   "0.14s"],
          [99, 65, 7,  6,  "50px",  "6px",   "0.12s"],
        ] as [number, number, number, number, string, string, string][]).map(
          ([cx, cy, rx, ry, dx, dy, delay], i) => (
            <ellipse key={i} className="bf-piece" cx={cx} cy={cy} rx={rx} ry={ry}
                     fill="var(--dough)"
                     style={{
                       ["--dx" as string]: dx,
                       ["--dy" as string]: dy,
                       animationDelay: delay,
                     } as React.CSSProperties} />
          )
        )}

        {/* ── Baguette ── */}
        <g className="bf-baguette-wrap">
          {/* Corps principal — forme bombée naturelle */}
          <path
            className="bf-body"
            d="M20 66 C20 57 30 55 38 55 L122 55 C130 55 140 57 140 66
               C140 75 130 77 122 77 L38 77 C30 77 20 75 20 66 Z"
            fill="var(--dough)"
          />
          {/* Extrémité gauche effilée */}
          <path className="bf-tip"
                d="M20 66 C20 60 24 57 30 56 C26 58 22 62 22 66 C22 70 26 74 30 76 C24 75 20 72 20 66 Z"
                fill="var(--dough-warm)" />
          {/* Extrémité droite effilée */}
          <path className="bf-tip"
                d="M140 66 C140 60 136 57 130 56 C134 58 138 62 138 66 C138 70 134 74 130 76 C136 75 140 72 140 66 Z"
                fill="var(--dough-warm)" />

          {/* 6 incisions diagonales */}
          {[
            ["M46 58 C48 62 46 70 44 74", "0.55"],
            ["M60 56 C62 61 60 71 58 75", "0.6"],
            ["M74 56 C76 61 74 71 72 75", "0.6"],
            ["M88 56 C90 61 88 71 86 75", "0.6"],
            ["M102 56 C104 61 102 71 100 75", "0.6"],
            ["M116 58 C118 62 116 70 114 74", "0.55"],
          ].map(([d, op], i) => (
            <path key={i} d={d} stroke="var(--crust-dark)" strokeWidth="1.8"
                  strokeLinecap="round" fill="none" opacity={Number(op)} />
          ))}

          {/* Reflet de croûte dorée */}
          <path className="bf-shine"
                d="M32 59 C50 56 110 56 128 59"
                stroke="var(--shine)" strokeWidth="1.6"
                strokeLinecap="round" fill="none" opacity={0} />
          {/* Second reflet plus fin */}
          <path className="bf-shine"
                d="M38 61 C55 58 105 58 122 61"
                stroke="#fff8e0" strokeWidth="0.8"
                strokeLinecap="round" fill="none" opacity={0}
                style={{ animationDelay: "0.15s" }} />
        </g>
      </svg>

      <p className="mt-2 text-[11px] italic text-muted-foreground text-center max-w-[220px]">
        Chaque grain compte, jusqu’à la dernière baguette.
      </p>
    </div>
  );
}
