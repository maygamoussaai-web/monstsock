import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Primitives de mouvement partagées. Toutes respectent prefers-reduced-motion :
// dans ce cas, le contenu est affiché immédiatement, sans animation.
// ─────────────────────────────────────────────────────────────────────────────

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/** Vrai dès que l'élément est entré dans le viewport (une seule fois). */
export function useInView<T extends HTMLElement>(rootMargin = "-10% 0px -10% 0px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return { ref, inView };
}

/** Apparition douce (fade + translation) au scroll. */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: any;
}) {
  const reduced = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>();
  const show = reduced || inView;
  return (
    <Tag
      ref={ref}
      className={`reveal ${show ? "reveal-in" : ""} ${className}`}
      style={{ transitionDelay: show && !reduced ? `${delay}ms` : undefined }}
    >
      {children}
    </Tag>
  );
}

/** Délai en cascade pour les listes/grilles (stagger). */
export function stagger(i: number, step = 45, max = 8): CSSProperties {
  return { animationDelay: `${Math.min(i, max) * step}ms` };
}

// ─────────────────────────────────────────────────────────────────────────────
// AnimatedNumber — comptage 0 → valeur quand l'élément entre dans le viewport.
// ─────────────────────────────────────────────────────────────────────────────
export function AnimatedNumber({
  value,
  format,
  duration = 900,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const { ref, inView } = useInView<HTMLSpanElement>("0px");
  const [display, setDisplay] = useState(0);
  const fmt = format ?? ((n: number) => String(Math.round(n)));

  useEffect(() => {
    if (!inView) return;
    if (reduced || !Number.isFinite(value)) {
      setDisplay(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (value - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {fmt(display)}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TiltGlowCard — inclinaison 3D très douce + lueur qui suit le curseur.
// Désactivé si prefers-reduced-motion ou sur appareil tactile (pas de survol).
// ─────────────────────────────────────────────────────────────────────────────
export function TiltGlowCard({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || reduced) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--tilt-x", `${(0.5 - py) * 5}deg`);
    el.style.setProperty("--tilt-y", `${(px - 0.5) * 5}deg`);
    el.style.setProperty("--glow-x", `${px * 100}%`);
    el.style.setProperty("--glow-y", `${py * 100}%`);
    el.style.setProperty("--glow-op", "1");
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
    el.style.setProperty("--glow-op", "0");
  };

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className={`tilt-glow ${className}`} style={style}>
      <span className="tilt-glow-light" aria-hidden="true" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
