/**
 * BaguetteFlourish — animation d'origine de la page de connexion.
 * Des grains de pâte se rejoignent, un éclat marque la fusion, puis une
 * baguette se forme et prend sa couleur de croûte. 100 % SVG + CSS.
 */
export function BaguetteFlourish() {
  return (
    <div className="relative mt-8 flex flex-col items-center select-none" aria-hidden="true">
      <style>{`
        .ms-bag {
          --dough: #f3e6c8;
          --crust: #a8541f;
          --crust-dark: #7d3c14;
          --accent: #c97c3d;
          --glow: #e8b06b;
        }
        @keyframes ms-piece-move {
          0%   { transform: translate(var(--dx0), var(--dy0)); }
          30%  { transform: translate(0, 0); }
          46%  { transform: translate(0, 0); }
          90%  { transform: translate(0, 0); }
          100% { transform: translate(var(--dx0), var(--dy0)); }
        }
        @keyframes ms-piece-fade {
          0%   { opacity: 1; }
          36%  { opacity: 1; }
          46%  { opacity: 0; }
          90%  { opacity: 0; }
          100% { opacity: 1; }
        }
        .ms-piece { animation: ms-piece-move 6.5s ease-in-out infinite, ms-piece-fade 6.5s ease-in-out infinite; }

        @keyframes ms-burst {
          0%, 42% { opacity: 0; transform: scale(0.4); }
          47%     { opacity: 0.9; transform: scale(1); }
          58%     { opacity: 0; transform: scale(1.5); }
          100%    { opacity: 0; transform: scale(0.4); }
        }
        .ms-burst-dot { animation: ms-burst 6.5s ease-out infinite; transform-origin: center; }

        @keyframes ms-baguette-in {
          0%, 44%  { opacity: 0; transform: scale(0.75); }
          52%      { opacity: 1; transform: scale(1.03); }
          58%      { opacity: 1; transform: scale(1); }
          82%      { opacity: 1; transform: scale(1); }
          92%      { opacity: 0; transform: scale(0.8); }
          100%     { opacity: 0; transform: scale(0.75); }
        }
        @keyframes ms-baguette-color {
          0%, 50%  { fill: var(--dough); }
          64%      { fill: var(--crust); }
          100%     { fill: var(--crust); }
        }
        .ms-baguette-wrap { animation: ms-baguette-in 6.5s ease-in-out infinite; transform-origin: 62px 66px; }
        .ms-baguette-body { animation: ms-baguette-color 6.5s ease-in-out infinite; }

        @keyframes ms-glow-pulse {
          0%, 48%  { opacity: 0; }
          60%      { opacity: 0.5; }
          70%      { opacity: 0.25; }
          80%      { opacity: 0.45; }
          88%      { opacity: 0; }
          100%     { opacity: 0; }
        }
        .ms-glow { animation: ms-glow-pulse 6.5s ease-in-out infinite; }

        @keyframes ms-steam-rise {
          0%, 55%  { opacity: 0; transform: translateY(0) scaleX(1); }
          62%      { opacity: 0.5; }
          85%      { opacity: 0; transform: translateY(-16px) scaleX(1.3); }
          100%     { opacity: 0; }
        }
        .ms-steam { animation: ms-steam-rise 6.5s ease-in infinite; }

        @media (prefers-reduced-motion: reduce) {
          .ms-piece, .ms-burst-dot, .ms-baguette-wrap,
          .ms-baguette-body, .ms-glow, .ms-steam { animation: none !important; }
          .ms-piece { opacity: 0; }
          .ms-baguette-wrap { opacity: 1; }
          .ms-baguette-body { fill: var(--crust); }
        }
      `}</style>

      <svg className="ms-bag" width="150" height="130" viewBox="0 0 150 130" fill="none">
        <ellipse className="ms-glow" cx="75" cy="66" rx="52" ry="26" fill="var(--glow)" opacity={0} />

        <path className="ms-steam" d="M55 40c-4-6 4-9 0-15" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path className="ms-steam" d="M75 36c-4-6 4-9 0-15" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" fill="none" style={{ animationDelay: "0.5s" }} />
        <path className="ms-steam" d="M95 40c-4-6 4-9 0-15" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" fill="none" style={{ animationDelay: "1s" }} />

        <circle className="ms-burst-dot" cx="62" cy="58" r="2" fill="#fff8ea" />
        <circle className="ms-burst-dot" cx="88" cy="60" r="1.6" fill="#fff8ea" style={{ animationDelay: "0.05s" }} />
        <circle className="ms-burst-dot" cx="75" cy="48" r="1.8" fill="#fff8ea" style={{ animationDelay: "0.1s" }} />
        <circle className="ms-burst-dot" cx="70" cy="80" r="1.6" fill="#fff8ea" style={{ animationDelay: "0.08s" }} />
        <circle className="ms-burst-dot" cx="95" cy="76" r="1.4" fill="#fff8ea" style={{ animationDelay: "0.15s" }} />
        <circle className="ms-burst-dot" cx="55" cy="72" r="1.4" fill="#fff8ea" style={{ animationDelay: "0.12s" }} />

        <ellipse className="ms-piece" style={{ ["--dx0" as string]: "-34px", ["--dy0" as string]: "-14px" } as React.CSSProperties} cx="62" cy="66" rx="9" ry="8" fill="var(--dough)" />
        <ellipse className="ms-piece" style={{ ["--dx0" as string]: "34px", ["--dy0" as string]: "-10px" } as React.CSSProperties} cx="88" cy="66" rx="9" ry="8" fill="var(--dough)" />
        <ellipse className="ms-piece" style={{ ["--dx0" as string]: "-22px", ["--dy0" as string]: "22px" } as React.CSSProperties} cx="68" cy="66" rx="8" ry="7" fill="var(--dough)" />
        <ellipse className="ms-piece" style={{ ["--dx0" as string]: "24px", ["--dy0" as string]: "24px" } as React.CSSProperties} cx="82" cy="66" rx="8" ry="7" fill="var(--dough)" />
        <ellipse className="ms-piece" style={{ ["--dx0" as string]: "0px", ["--dy0" as string]: "-30px" } as React.CSSProperties} cx="75" cy="66" rx="8" ry="7" fill="var(--dough)" />

        <g className="ms-baguette-wrap">
          <path
            className="ms-baguette-body"
            d="M18 66c0-7 8-11 15-11h84c7 0 15 4 15 11s-8 11-15 11H33c-7 0-15-4-15-11z"
            fill="var(--dough)"
          />
          <path d="M40 58c4 5 4 11 0 16" stroke="var(--crust-dark)" strokeWidth="2" strokeLinecap="round" fill="none" opacity={0.65} />
          <path d="M58 56c4 6 4 12 0 20" stroke="var(--crust-dark)" strokeWidth="2" strokeLinecap="round" fill="none" opacity={0.65} />
          <path d="M76 56c4 6 4 12 0 20" stroke="var(--crust-dark)" strokeWidth="2" strokeLinecap="round" fill="none" opacity={0.65} />
          <path d="M94 56c4 6 4 12 0 20" stroke="var(--crust-dark)" strokeWidth="2" strokeLinecap="round" fill="none" opacity={0.65} />
          <path d="M110 58c4 5 4 11 0 16" stroke="var(--crust-dark)" strokeWidth="2" strokeLinecap="round" fill="none" opacity={0.65} />
          <path d="M28 60c20-6 74-6 94 0" stroke="#ffe6b8" strokeWidth="1.4" strokeLinecap="round" fill="none" opacity={0.4} />
        </g>
      </svg>

      <p className="mt-1 text-[11px] italic text-muted-foreground text-center max-w-[220px]">
        Chaque grain compte, jusqu'à la dernière baguette.
      </p>
    </div>
  );
}
