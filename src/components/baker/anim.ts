// Utilitaires d'animation partagés par la scène du boulanger.
// Easings naturels (anticipation → mouvement → décélération → stabilisation).

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export const easeInOutCubic = (t: number) => {
  const x = clamp01(t);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInCubic = (t: number) => Math.pow(clamp01(t), 3);

/** Décélération avec un léger dépassement (inertie du corps qui s'arrête). */
export const easeOutBack = (t: number) => {
  const x = clamp01(t);
  const c1 = 1.15;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Amortissement indépendant du framerate. */
export const damp = (current: number, target: number, k: number, dt: number) =>
  target + (current - target) * Math.exp(-k * dt);

/** Progression 0→1 d'un segment [start, start+dur] sur une horloge globale. */
export const seg = (t: number, start: number, dur: number) => clamp01((t - start) / dur);
