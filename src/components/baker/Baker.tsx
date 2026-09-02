import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { clamp01, damp, easeInOutCubic, easeOutBack, easeOutCubic, lerp, seg } from "./anim";

/**
 * Boulanger 3D — gréement procédural (pas de modèle externe : la chorégraphie
 * est entièrement sur mesure). Tout le mouvement est piloté par une horloge
 * unique et des poses cibles amorties (jamais d'interpolation linéaire brute).
 *
 * Chronologie d'arrivée :
 *   0.00–1.80  marche depuis la gauche
 *   1.80–2.15  arrêt avec inertie
 *   2.15–2.60  il découvre la carte, puis regarde l'utilisateur
 *   2.60–3.20  il désigne le formulaire avec sa baguette
 *   3.20–3.70  il se place à côté de la carte, posture détendue
 *   3.70–4.80  il croque une fois dans la baguette et mâche
 *   4.80–5.40  seconde indication, plus expressive
 *   5.40–∞     idle (respiration, poids qui change de jambe, clignements)
 *
 * Au départ de l'avion (`flying`) : il suit l'avion des yeux, réalise que la
 * carte est partie, perd l'équilibre, se rattrape, trébuche et tombe.
 */

const T = {
  walk: 1.8,
  settle: 2.15,
  discover: 2.6,
  point1End: 3.2,
  shiftEnd: 3.7,
  biteStart: 3.75,
  biteEnd: 4.85,
  point2End: 5.45,
};

type Pose = {
  // Torse / tête
  headY: number;
  headX: number;
  headZ: number;
  torsoZ: number;
  torsoX: number;
  // Bras droit (celui qui tient la baguette)
  shR: { x: number; y: number; z: number };
  elbR: number;
  bagZ: number;
  bagX: number;
  // Bras gauche
  shL: { x: number; y: number; z: number };
  elbL: number;
  // Jambes
  hipL: number;
  hipR: number;
  hipLz: number;
  hipRz: number;
  kneeL: number;
  kneeR: number;
  // Global
  rootY: number;
  rootZ: number;
  mouth: number;
};

const basePose = (): Pose => ({
  headY: 0,
  headX: 0,
  headZ: 0,
  torsoZ: 0,
  torsoX: 0,
  shR: { x: 0.05, y: 0, z: 0.16 },
  elbR: -0.45,
  bagZ: -1.15,
  bagX: 0,
  shL: { x: 0.05, y: 0, z: -0.14 },
  elbL: -0.35,
  hipL: 0,
  hipR: 0,
  hipLz: 0,
  hipRz: 0,
  kneeL: 0,
  kneeR: 0,
  rootY: 0,
  rootZ: 0,
  mouth: 0,
});

export function Baker({
  standX,
  scale = 1,
  flying,
  reduced = false,
}: {
  /** Position au sol (x monde) où il vient se placer, à gauche de la carte. */
  standX: number;
  scale?: number;
  /** true dès que la carte s'envole. */
  flying: boolean;
  reduced?: boolean;
}) {
  const root = useRef<THREE.Group>(null!);
  const torso = useRef<THREE.Group>(null!);
  const belly = useRef<THREE.Mesh>(null!);
  const head = useRef<THREE.Group>(null!);
  const toque = useRef<THREE.Group>(null!);
  const mouth = useRef<THREE.Mesh>(null!);
  const eyeL = useRef<THREE.Mesh>(null!);
  const eyeR = useRef<THREE.Mesh>(null!);
  const shR = useRef<THREE.Group>(null!);
  const elbR = useRef<THREE.Group>(null!);
  const shL = useRef<THREE.Group>(null!);
  const elbL = useRef<THREE.Group>(null!);
  const hipL = useRef<THREE.Group>(null!);
  const hipR = useRef<THREE.Group>(null!);
  const kneeL = useRef<THREE.Group>(null!);
  const kneeR = useRef<THREE.Group>(null!);
  const bag = useRef<THREE.Group>(null!);

  const state = useRef({
    t: 0,
    f: -1, // horloge de la chute (démarre au clic)
    cur: basePose(),
    walkPhase: 0,
    x: standX - 5.2,
    blink: 2.4,
    blinkT: 0,
  });

  const mats = useMemo(
    () => ({
      skin: new THREE.MeshStandardMaterial({ color: "#e6b184", roughness: 0.72 }),
      coat: new THREE.MeshStandardMaterial({ color: "#f6f1e6", roughness: 0.62 }),
      coatShade: new THREE.MeshStandardMaterial({ color: "#e6ded0", roughness: 0.65 }),
      hat: new THREE.MeshStandardMaterial({ color: "#fdfaf3", roughness: 0.55 }),
      pants: new THREE.MeshStandardMaterial({ color: "#5b4a3c", roughness: 0.8 }),
      shoe: new THREE.MeshStandardMaterial({ color: "#3a2f27", roughness: 0.6 }),
      crust: new THREE.MeshStandardMaterial({ color: "#c98243", roughness: 0.68 }),
      dark: new THREE.MeshStandardMaterial({ color: "#2f2620", roughness: 0.5 }),
      band: new THREE.MeshStandardMaterial({ color: "#c97c3d", roughness: 0.6 }),
    }),
    []
  );

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const s = state.current;
    s.t += dt;
    if (flying && s.f < 0) s.f = 0;
    if (s.f >= 0) s.f += dt;

    const p = basePose();
    const t = reduced ? 99 : s.t;
    const finalX = standX - 0.62;

    // ── Idle de base (respiration + oscillation du poids) ────────────────────
    const breathe = Math.sin(s.t * 1.35) * 0.5 + 0.5;
    const sway = Math.sin(s.t * 0.55);

    // ── 1. Marche ────────────────────────────────────────────────────────────
    if (t < T.settle) {
      const w = easeInOutCubic(seg(t, 0, T.walk));
      s.x = lerp(standX - 5.2, finalX, w);
      const speed = Math.sin(Math.PI * clamp01(seg(t, 0, T.walk))); // accélère puis freine
      s.walkPhase += dt * 9.2 * (0.35 + speed);
      const ph = s.walkPhase;
      const stride = 0.55 * (0.3 + speed);
      p.hipL = Math.sin(ph) * stride;
      p.hipR = Math.sin(ph + Math.PI) * stride;
      p.kneeL = -Math.max(0, -Math.sin(ph - 0.6)) * 0.9 * (0.3 + speed);
      p.kneeR = -Math.max(0, -Math.sin(ph + Math.PI - 0.6)) * 0.9 * (0.3 + speed);
      p.shR.x = Math.sin(ph + Math.PI) * 0.34 * (0.3 + speed);
      p.shL.x = Math.sin(ph) * 0.42 * (0.3 + speed);
      p.rootY = Math.abs(Math.sin(ph)) * 0.045 * (0.3 + speed);
      p.torsoZ = Math.sin(ph) * 0.05;
      p.torsoX = 0.06 * speed;
      p.headY = 0.12;
      p.bagZ = -1.05 + Math.sin(ph) * 0.12;
      if (t > T.walk) {
        // Inertie de l'arrêt : le corps continue légèrement puis se replace.
        const k = 1 - easeOutBack(seg(t, T.walk, T.settle - T.walk));
        p.torsoX = 0.16 * k;
        p.rootZ = -0.05 * k;
      }
    } else {
      // ── 2/3/4/5. Séquence devant la carte ─────────────────────────────────
      const relaxed = t > T.shiftEnd;
      s.x = damp(s.x, relaxed ? standX - 0.78 : finalX, 4.5, dt);

      // Regard : d'abord la carte, puis l'utilisateur.
      const disc = seg(t, T.settle, 0.28);
      const toUser = seg(t, T.settle + 0.3, 0.3);
      p.headY = lerp(0, 0.5, easeOutCubic(disc)) - lerp(0, 0.38, easeOutCubic(toUser));
      p.headX = 0.04 * easeOutCubic(disc);

      // Posture détendue : poids sur une jambe, jambes légèrement croisées.
      if (relaxed) {
        const r = easeOutCubic(seg(t, T.shiftEnd, 0.5));
        p.hipLz = 0.14 * r;
        p.hipRz = -0.2 * r;
        p.hipR = 0.1 * r;
        p.kneeR = -0.16 * r;
        p.torsoZ = -0.05 * r + sway * 0.018;
        p.rootY = -0.02 * r;
      }

      // Geste 1 : « c'est ici ».
      if (t > T.settle + 0.4 && t < T.shiftEnd + 0.2) {
        const g = seg(t, T.settle + 0.45, 0.4);
        const back = 1 - easeInOutCubic(seg(t, T.point1End, 0.45));
        const amp = easeOutBack(g) * back;
        p.shR.z = lerp(0.16, 1.02, amp);
        p.shR.x = -0.18 * amp;
        p.elbR = lerp(-0.45, -0.12, amp);
        p.bagZ = lerp(-1.15, -0.05, amp);
        p.headY = lerp(p.headY, 0.42, amp * 0.8);
        p.torsoZ += 0.05 * amp;
      }

      // Croc dans la baguette.
      if (t > T.biteStart && t < T.biteEnd + 0.3) {
        const raise = easeInOutCubic(seg(t, T.biteStart, 0.42));
        const lower = easeInOutCubic(seg(t, T.biteStart + 0.78, 0.35));
        const a = raise - lower;
        p.shR.z = lerp(p.shR.z, 0.62, a);
        p.shR.x = lerp(p.shR.x, -0.5, a);
        p.shR.y = lerp(0, -0.5, a);
        p.elbR = lerp(p.elbR, -1.62, a);
        p.bagZ = lerp(p.bagZ, -1.75, a);
        p.bagX = lerp(0, 0.25, a);
        p.headY = lerp(p.headY, 0.16, a);
        p.headX = lerp(p.headX, 0.14, a);
        // Bouche : ouverture courte, croc, puis petite mastication.
        const open = seg(t, T.biteStart + 0.36, 0.16) - seg(t, T.biteStart + 0.6, 0.12);
        const chew = t > T.biteStart + 0.72 && t < T.biteEnd ? Math.abs(Math.sin((t - 0.72) * 11)) * 0.35 : 0;
        p.mouth = Math.max(open, chew);
        if (chew > 0) p.headX = lerp(p.headX, 0.1 + chew * 0.04, 0.6);
      }

      // Geste 2 : « allez, connecte-toi » (plus expressif).
      if (t > T.biteEnd + 0.15 && t < T.point2End + 0.5) {
        const g = seg(t, T.biteEnd + 0.18, 0.34);
        const back = 1 - easeInOutCubic(seg(t, T.point2End, 0.45));
        const amp = easeOutBack(g) * back;
        const insist = Math.sin((t - T.biteEnd) * 9) * 0.07 * amp;
        p.shR.z = lerp(p.shR.z, 1.18 + insist, amp);
        p.shR.x = lerp(p.shR.x, -0.26, amp);
        p.elbR = lerp(p.elbR, -0.08, amp);
        p.bagZ = lerp(p.bagZ, 0.02 + insist, amp);
        p.headY = lerp(p.headY, 0.34, amp * 0.7);
        p.shL.z = lerp(p.shL.z, -0.3, amp);
        p.torsoZ += 0.06 * amp;
      }

      // Idle permanent (très subtil).
      if (t > T.point2End + 0.5) {
        p.torsoX += breathe * 0.022;
        p.headY += Math.sin(s.t * 0.42) * 0.09;
        p.headZ += Math.sin(s.t * 0.31) * 0.03;
        p.shR.x += Math.sin(s.t * 0.9) * 0.03;
        p.shL.x += Math.sin(s.t * 0.9 + 1.2) * 0.035;
        p.bagZ += Math.sin(s.t * 0.75) * 0.06;
        p.hipLz += sway * 0.03;
        p.hipRz += -sway * 0.03;
        p.rootY += breathe * 0.012;
      }
    }

    // ── Chute (déclenchée par le départ de l'avion) ─────────────────────────
    const f = s.f;
    if (f >= 0) {
      // 1) il suit l'avion des yeux
      const follow = seg(f, 0, 0.5);
      p.headY = lerp(p.headY, 0.55, easeOutCubic(follow));
      p.headX = lerp(p.headX, -0.42, easeOutCubic(follow));
      p.torsoX = lerp(p.torsoX, -0.14, easeOutCubic(follow));
      // 2) il regarde l'emplacement vide et réalise
      const realize = seg(f, 0.55, 0.3);
      p.headX = lerp(p.headX, 0.2, easeInOutCubic(realize));
      p.headY = lerp(p.headY, 0.42, easeInOutCubic(realize));
      // 3) déséquilibre : le ventre entraîne le corps
      const tip = seg(f, 0.85, 0.32);
      p.rootZ += lerp(0, 0.3, easeInOutCubic(tip));
      p.torsoZ += lerp(0, 0.14, easeInOutCubic(tip));
      // 4) il tente de se rattraper (bras qui battent l'air)
      const save = seg(f, 1.05, 0.35);
      const flail = Math.sin((f - 1.05) * 16) * 0.5 * save;
      p.shL.z = lerp(p.shL.z, -1.5 + flail, save);
      p.shR.z = lerp(p.shR.z, 1.3 - flail, save);
      p.rootZ += lerp(0, -0.12, save) + flail * 0.05;
      p.hipR = lerp(p.hipR, 0.5, save);
      p.kneeR = lerp(p.kneeR, -0.6, save);
      // 5) il trébuche et tombe sur les fesses, avec du poids
      const fall = easeInCubicSoft(seg(f, 1.4, 0.55));
      p.rootZ = lerp(p.rootZ, 0.62, fall);
      p.rootY = lerp(p.rootY, -0.52, fall);
      p.hipL = lerp(p.hipL, 1.35, fall);
      p.hipR = lerp(p.hipR, 1.1, fall);
      p.kneeL = lerp(p.kneeL, -0.85, fall);
      p.kneeR = lerp(p.kneeR, -1.05, fall);
      p.torsoZ = lerp(p.torsoZ, -0.2, fall);
      p.torsoX = lerp(p.torsoX, -0.22, fall);
      p.shL.z = lerp(p.shL.z, -1.15, fall);
      p.shR.z = lerp(p.shR.z, 0.95, fall);
      p.elbR = lerp(p.elbR, -0.5, fall);
      p.headX = lerp(p.headX, -0.18, fall);
      p.headY = lerp(p.headY, 0.1, fall);
      p.mouth = Math.max(p.mouth, 0.7 * clamp01(seg(f, 0.9, 0.4)) * (1 - seg(f, 2.6, 0.6)));
      p.bagZ = lerp(p.bagZ, -1.35, fall);
      // Rebond au contact du sol (petit, sans violence) + baguette qui ballotte
      if (f > 1.9) {
        const b = Math.exp(-(f - 1.9) * 5.5) * Math.sin((f - 1.9) * 15);
        p.rootY += b * 0.05;
        p.torsoZ += b * 0.09;
        p.bagZ += b * 0.35;
        p.headX += b * 0.1;
      }
    }

    // ── Application amortie des poses ───────────────────────────────────────
    const c = s.cur;
    const k = s.f >= 0 ? 16 : 11;
    const ap = (key: keyof Pose, val: number) => {
      (c as any)[key] = damp((c as any)[key], val, k, dt);
      return (c as any)[key] as number;
    };

    root.current.position.x = s.x;
    root.current.position.y = ap("rootY", p.rootY);
    root.current.rotation.z = ap("rootZ", p.rootZ);

    torso.current.rotation.z = ap("torsoZ", p.torsoZ);
    torso.current.rotation.x = ap("torsoX", p.torsoX);

    head.current.rotation.y = ap("headY", p.headY);
    head.current.rotation.x = ap("headX", p.headX);
    head.current.rotation.z = ap("headZ", p.headZ);

    // Ventre : léger ballottement retardé sur le mouvement du torse.
    const bellyWob = Math.sin(s.walkPhase * 2) * 0.016 + breathe * 0.016;
    belly.current.scale.set(0.385 + bellyWob, 0.36 + bellyWob * 0.6, 0.35);
    belly.current.position.y = 0.26 - bellyWob * 0.25;


    // Toque : petit retard élastique sur la tête.
    toque.current.rotation.z = damp(toque.current.rotation.z, -head.current.rotation.y * 0.22 + c.rootZ * -0.25, 7, dt);
    toque.current.rotation.x = damp(toque.current.rotation.x, head.current.rotation.x * 0.3, 7, dt);

    c.shR.x = damp(c.shR.x, p.shR.x, k, dt);
    c.shR.y = damp(c.shR.y, p.shR.y, k, dt);
    c.shR.z = damp(c.shR.z, p.shR.z, k, dt);
    shR.current.rotation.set(c.shR.x, c.shR.y, c.shR.z);
    elbR.current.rotation.x = ap("elbR", p.elbR);

    c.shL.x = damp(c.shL.x, p.shL.x, k, dt);
    c.shL.z = damp(c.shL.z, p.shL.z, k, dt);
    shL.current.rotation.set(c.shL.x, 0, c.shL.z);
    elbL.current.rotation.x = ap("elbL", p.elbL);

    hipL.current.rotation.x = ap("hipL", p.hipL);
    hipR.current.rotation.x = ap("hipR", p.hipR);
    hipL.current.rotation.z = ap("hipLz", p.hipLz);
    hipR.current.rotation.z = ap("hipRz", p.hipRz);
    kneeL.current.rotation.x = ap("kneeL", p.kneeL);
    kneeR.current.rotation.x = ap("kneeR", p.kneeR);

    c.bagZ = damp(c.bagZ, p.bagZ, k, dt);
    c.bagX = damp(c.bagX, p.bagX, k, dt);
    bag.current.rotation.set(c.bagX, 0, c.bagZ);

    const m = ap("mouth", p.mouth);
    mouth.current.scale.set(1, 0.35 + m * 2.6, 1);
    mouth.current.position.y = -0.085 - m * 0.02;

    // Clignements occasionnels.
    s.blinkT += dt;
    if (s.blinkT > s.blink) {
      s.blinkT = 0;
      s.blink = 2.6 + Math.random() * 3.4;
    }
    const bl = s.blinkT < 0.13 ? 1 - Math.abs(s.blinkT / 0.065 - 1) : 0;
    const lid = 1 - bl * 0.92;
    eyeL.current.scale.set(0.024, 0.03 * lid, 0.014);
    eyeR.current.scale.set(0.024, 0.03 * lid, 0.014);

  });

  return (
    <group ref={root} scale={scale} position={[standX - 5.2, 0, 0]}>
      {/* Jambes */}
      <group ref={hipL} position={[-0.17, 0.84, 0.01]}>
        <mesh material={mats.pants} position={[0, -0.2, 0]} castShadow>
          <capsuleGeometry args={[0.115, 0.28, 4, 12]} />
        </mesh>
        <group ref={kneeL} position={[0, -0.42, 0]}>
          <mesh material={mats.pants} position={[0, -0.19, 0]} castShadow>
            <capsuleGeometry args={[0.098, 0.26, 4, 12]} />
          </mesh>
          <mesh material={mats.shoe} position={[0, -0.38, 0.055]} castShadow>
            <boxGeometry args={[0.19, 0.1, 0.3]} />
          </mesh>
        </group>
      </group>
      <group ref={hipR} position={[0.17, 0.84, -0.01]}>
        <mesh material={mats.pants} position={[0, -0.2, 0]} castShadow>
          <capsuleGeometry args={[0.115, 0.28, 4, 12]} />
        </mesh>
        <group ref={kneeR} position={[0, -0.42, 0]}>
          <mesh material={mats.pants} position={[0, -0.19, 0]} castShadow>
            <capsuleGeometry args={[0.098, 0.26, 4, 12]} />
          </mesh>
          <mesh material={mats.shoe} position={[0, -0.38, 0.055]} castShadow>
            <boxGeometry args={[0.19, 0.1, 0.3]} />
          </mesh>
        </group>
      </group>

      {/* Torse */}
      <group ref={torso} position={[0, 0.84, 0]}>
        {/* Ventre rebondi */}
        <mesh ref={belly} material={mats.coat} position={[0, 0.26, 0.02]} castShadow>
          <sphereGeometry args={[1, 26, 20]} />
        </mesh>
        {/* Poitrine / épaules */}
        <mesh material={mats.coat} position={[0, 0.63, 0]} scale={[0.335, 0.28, 0.27]} castShadow>
          <sphereGeometry args={[1, 24, 18]} />
        </mesh>
        {/* Cou */}
        <mesh material={mats.skin} position={[0, 0.82, 0.005]} castShadow>
          <cylinderGeometry args={[0.072, 0.082, 0.13, 14]} />
        </mesh>
        {/* Col croisé de la blouse */}
        <mesh material={mats.coatShade} position={[0, 0.6, 0.2]} rotation={[0.22, 0, 0.78]}>
          <boxGeometry args={[0.075, 0.3, 0.03]} />
        </mesh>
        <mesh material={mats.coatShade} position={[0, 0.6, 0.2]} rotation={[0.22, 0, -0.78]}>
          <boxGeometry args={[0.075, 0.3, 0.03]} />
        </mesh>
        {/* Boutons */}
        {[0.46, 0.32, 0.18].map((y) => (
          <mesh key={y} material={mats.coatShade} position={[0.1, y, 0.29]}>
            <sphereGeometry args={[0.018, 8, 8]} />
          </mesh>
        ))}
        {/* Tablier / ceinture */}
        <mesh material={mats.band} position={[0, 0.02, 0.02]} scale={[0.37, 0.05, 0.35]}>
          <sphereGeometry args={[1, 22, 14]} />
        </mesh>

        {/* Tête */}
        <group ref={head} position={[0, 0.94, 0]}>

          <mesh material={mats.skin} scale={[0.2, 0.215, 0.195]} castShadow>
            <sphereGeometry args={[1, 26, 22]} />
          </mesh>
          {/* Joues */}
          <mesh material={mats.skin} position={[-0.115, -0.055, 0.115]} scale={0.062}>
            <sphereGeometry args={[1, 14, 12]} />
          </mesh>
          <mesh material={mats.skin} position={[0.115, -0.055, 0.115]} scale={0.062}>
            <sphereGeometry args={[1, 14, 12]} />
          </mesh>
          {/* Nez */}
          <mesh material={mats.skin} position={[0, 0.005, 0.185]} scale={[0.042, 0.036, 0.05]}>
            <sphereGeometry args={[1, 14, 12]} />
          </mesh>
          {/* Yeux */}
          <mesh ref={eyeL} material={mats.dark} position={[-0.068, 0.058, 0.172]} scale={[0.024, 0.03, 0.014]}>
            <sphereGeometry args={[1, 14, 12]} />
          </mesh>
          <mesh ref={eyeR} material={mats.dark} position={[0.068, 0.058, 0.172]} scale={[0.024, 0.03, 0.014]}>
            <sphereGeometry args={[1, 14, 12]} />
          </mesh>
          {/* Sourcils */}
          <mesh material={mats.dark} position={[-0.07, 0.105, 0.168]} rotation={[0, 0, 0.12]}>
            <boxGeometry args={[0.055, 0.011, 0.01]} />
          </mesh>
          <mesh material={mats.dark} position={[0.07, 0.105, 0.168]} rotation={[0, 0, -0.12]}>
            <boxGeometry args={[0.055, 0.011, 0.01]} />
          </mesh>
          {/* Bouche (s'ouvre au croc) */}
          <mesh ref={mouth} material={mats.dark} position={[0, -0.085, 0.172]} scale={[1, 0.35, 1]}>
            <sphereGeometry args={[0.038, 14, 12]} />
          </mesh>
          {/* Moustache discrète */}
          <mesh material={mats.dark} position={[0, -0.042, 0.178]} scale={[1, 0.32, 0.4]}>
            <boxGeometry args={[0.088, 0.03, 0.03]} />
          </mesh>

          {/* Toque */}
          <group ref={toque} position={[0, 0.19, 0]}>
            <mesh material={mats.hat} position={[0, 0.01, 0]} scale={[0.195, 0.05, 0.19]} castShadow>
              <cylinderGeometry args={[1, 1, 1, 20]} />
            </mesh>
            <mesh material={mats.hat} position={[0, 0.13, 0]} scale={[0.2, 0.15, 0.195]} castShadow>
              <sphereGeometry args={[1, 22, 16]} />
            </mesh>
            <mesh material={mats.hat} position={[0.07, 0.2, 0.05]} scale={0.075} castShadow>
              <sphereGeometry args={[1, 16, 14]} />
            </mesh>
            <mesh material={mats.hat} position={[-0.09, 0.17, -0.03]} scale={0.065} castShadow>
              <sphereGeometry args={[1, 16, 14]} />
            </mesh>
          </group>
        </group>

        {/* Bras droit (tient la baguette) */}
        <group ref={shR} position={[0.36, 0.63, 0.02]}>
          <mesh material={mats.coat} position={[0, -0.16, 0]} castShadow>
            <capsuleGeometry args={[0.078, 0.22, 4, 12]} />
          </mesh>
          <group ref={elbR} position={[0, -0.34, 0]}>
            <mesh material={mats.coat} position={[0, -0.13, 0]} castShadow>
              <capsuleGeometry args={[0.068, 0.18, 4, 12]} />
            </mesh>
            <mesh material={mats.skin} position={[0, -0.27, 0]} scale={0.075} castShadow>
              <sphereGeometry args={[1, 16, 14]} />
            </mesh>
            {/* Baguette tenue dans la main */}
            <group ref={bag} position={[0, -0.28, 0.01]} rotation={[0, 0, -1.15]}>
              <group position={[0.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <mesh material={mats.crust} castShadow>
                  <capsuleGeometry args={[0.055, 0.6, 6, 14]} />
                </mesh>
                {[-0.2, -0.07, 0.06, 0.19].map((y) => (
                  <mesh key={y} material={mats.dark} position={[0, y, 0.05]} rotation={[0, 0, 0.5]} scale={[1, 1, 1]}>
                    <boxGeometry args={[0.012, 0.075, 0.012]} />
                  </mesh>
                ))}
              </group>
            </group>
          </group>
        </group>

        {/* Bras gauche */}
        <group ref={shL} position={[-0.36, 0.63, 0.02]}>
          <mesh material={mats.coat} position={[0, -0.16, 0]} castShadow>
            <capsuleGeometry args={[0.078, 0.22, 4, 12]} />
          </mesh>
          <group ref={elbL} position={[0, -0.34, 0]}>
            <mesh material={mats.coat} position={[0, -0.13, 0]} castShadow>
              <capsuleGeometry args={[0.068, 0.18, 4, 12]} />
            </mesh>
            <mesh material={mats.skin} position={[0, -0.27, 0]} scale={0.075} castShadow>
              <sphereGeometry args={[1, 16, 14]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}

/** Chute : accélération type gravité, adoucie à l'impact. */
function easeInCubicSoft(t: number) {
  const x = clamp01(t);
  return x < 0.82 ? Math.pow(x / 0.82, 2.1) * 0.97 : 0.97 + (1 - 0.97) * easeOutCubic((x - 0.82) / 0.18);
}
