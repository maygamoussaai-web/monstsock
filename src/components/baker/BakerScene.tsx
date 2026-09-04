/**
 * src/components/baker/BakerScene.tsx
 * ─────────────────────────────────────────────────────────────
 * Scène Three.js qui enveloppe Baker.tsx + avion en papier SVG.
 *
 * Props :
 *  flying   – true dès que l'utilisateur clique sur "Se connecter"
 *             (déclenche la chute du boulanger et l'envol de l'avion)
 *  onFlown  – appelé ~1.5 s après l'envol (navigation vers /dashboard)
 */

import { Suspense, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { Baker } from "./Baker";

interface Props {
  flying: boolean;
  onFlown?: () => void;
}

export function BakerScene({ flying, onFlown }: Props) {
  const onFlownRef = useRef(onFlown);
  onFlownRef.current = onFlown;

  /* Déclenche onFlown 1.5 s après l'envol */
  useEffect(() => {
    if (!flying) return;
    const t = setTimeout(() => onFlownRef.current?.(), 1500);
    return () => clearTimeout(t);
  }, [flying]);

  return (
    <div className="baker-scene-root" aria-hidden="true">
      {/* ── Canvas Three.js — boulanger ── */}
      <Canvas
        className="baker-canvas"
        camera={{ position: [-0.55, 1.6, 12.5], fov: 26 }}
        shadows="soft"
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
        onCreated={({ camera }) => camera.lookAt(-0.6, 1.0, 0)}
      >

        <ambientLight intensity={0.42} />
        {/* Clé : douce, chaude, projette les ombres */}
        <directionalLight
          position={[3.2, 6, 4.2]}
          intensity={1.25}
          color="#fff3e0"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0004}
        />
        {/* Contre-jour froid pour détacher la silhouette */}
        <directionalLight position={[-3, 3.4, -2.4]} intensity={0.5} color="#dfe7f2" />
        {/* Rebond chaud venant du sol */}
        <pointLight position={[0.4, 0.25, 1.8]} intensity={0.35} color="#e8c49a" distance={6} />

        <Suspense fallback={null}>
          {/* Éclairage d'environnement local (aucun CDN) — reflets doux */}
          <Environment resolution={128} frames={1}>
            <Lightformer intensity={1.6} color="#fff6ea" position={[0, 4.5, 1]} scale={[8, 8, 1]} />
            <Lightformer
              intensity={0.7}
              color="#e9d7c0"
              position={[-4, 1.2, 1]}
              rotation-y={Math.PI / 2}
              scale={[10, 3, 1]}
            />
            <Lightformer
              intensity={0.5}
              color="#cdd8e6"
              position={[4, 1.6, -1]}
              rotation-y={-Math.PI / 2}
              scale={[10, 3, 1]}
            />
          </Environment>

          <Baker standX={0.15} scale={1.06} flying={flying} />
        </Suspense>


        {/* Ombre de contact douce sous les pieds */}
        <ContactShadows
          position={[0, 0.002, 0]}
          scale={6}
          blur={2.4}
          opacity={0.45}
          far={2.2}
          resolution={512}
          color="#5a4632"
        />

        {/* Sol receveur d'ombres (ombre portée de la lumière clé) */}
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[24, 24]} />
          <shadowMaterial opacity={0.16} color="#4a3728" />
        </mesh>

      </Canvas>


      {/* ── Avion en papier SVG — s'envole au clic ── */}
      <PaperPlane active={flying} />

      <style>{SCENE_CSS}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Avion en papier — SVG + CSS animations uniquement
   ───────────────────────────────────────────────────────────── */
function PaperPlane({ active }: { active: boolean }) {
  return (
    <div className="plane-root" data-active={active ? "true" : "false"}>
      <svg
        viewBox="0 0 120 80"
        xmlns="http://www.w3.org/2000/svg"
        className="plane-svg"
      >
        {/* Corps */}
        <polygon className="plane-body"     points="0,40 120,20 80,50 70,78" />
        {/* Aile supérieure */}
        <polygon className="plane-wing-top" points="0,40 120,20 80,40" />
        {/* Aile inférieure */}
        <polygon className="plane-wing-bot" points="0,40 80,40 70,78" />
        {/* Pli central */}
        <line   className="plane-fold"  x1="0" y1="40" x2="80" y2="40" strokeWidth="1" strokeLinecap="round" />
        {/* Reflet */}
        <line   className="plane-shine" x1="10" y1="38" x2="75" y2="22" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
        {/* Sillage */}
        <g className="plane-trail">
          <line x1="-20" y1="40" x2="-60" y2="42" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
          <line x1="-20" y1="44" x2="-50" y2="46" strokeWidth="1"   strokeLinecap="round" opacity="0.2" />
          <line x1="-20" y1="36" x2="-45" y2="37" strokeWidth="1"   strokeLinecap="round" opacity="0.15" />
        </g>
      </svg>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CSS
   ───────────────────────────────────────────────────────────── */
const SCENE_CSS = `
/* ── Conteneur scène ── */
.baker-scene-root {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 280px;
  pointer-events: none;
}

/* ── Canvas Three.js ── */
.baker-canvas {
  width: 100% !important;
  height: 100% !important;
}

/* ══════════════════════════════════════════════════
   AVION EN PAPIER
   ══════════════════════════════════════════════════ */
.plane-body     { fill: #f5f0e8; }
.plane-wing-top { fill: #ede6d5; }
.plane-wing-bot { fill: #e0d8c4; }
.plane-fold     { stroke: #c2b89a; }
.plane-shine    { stroke: #ffffff; }
.plane-trail    { stroke: #c97c3d; }

.plane-root {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 160px;
  pointer-events: none;
  z-index: 9999;
  opacity: 0;
}

.plane-root[data-active="false"] { display: none; }

.plane-root[data-active="true"] {
  display: block;
  animation:
    plane-appear  0.22s cubic-bezier(0.34,1.36,0.64,1) 0s    both,
    plane-hover   0.38s ease-in-out                     0.18s both,
    plane-fly-out 1.0s  cubic-bezier(0.55,0,0.75,0.1)  0.52s both;
}

@keyframes plane-appear {
  0%   { opacity: 0; transform: translate(-50%,-50%) scale(0.55) rotate(-18deg); }
  100% { opacity: 1; transform: translate(-50%,-50%) scale(1)    rotate(-8deg);  }
}
@keyframes plane-hover {
  0%   { transform: translate(-50%,-50%) scale(1)    rotate(-8deg);  }
  50%  { transform: translate(-50%,-55%) scale(1.04) rotate(-11deg); }
  100% { transform: translate(-50%,-52%) scale(1)    rotate(-9deg);  }
}
@keyframes plane-fly-out {
  0%   { opacity:1; transform: translate(-50%,-52%)  scale(1)    rotate(-9deg);  }
  30%  { opacity:1; transform: translate(5%,-88%)    scale(0.84) rotate(-22deg); }
  65%  { opacity:0.9; transform: translate(65%,-148%) scale(0.62) rotate(-32deg); }
  100% { opacity:0; transform: translate(150%,-230%) scale(0.28) rotate(-42deg); }
}

/* Oscillation des ailes pendant le vol */
.plane-root[data-active="true"] .plane-wing-top {
  animation: wing-top 0.17s ease-in-out 0.52s infinite alternate;
  transform-origin: 0 40px;
}
.plane-root[data-active="true"] .plane-wing-bot {
  animation: wing-bot 0.21s ease-in-out 0.56s infinite alternate;
  transform-origin: 0 40px;
}
.plane-root[data-active="true"] .plane-trail {
  animation: trail-fade 0.28s ease-in-out 0.52s infinite alternate;
}

@keyframes wing-top  { 0% { transform: skewY(-1deg); }  100% { transform: skewY(1.5deg); } }
@keyframes wing-bot  { 0% { transform: skewY(1.5deg); } 100% { transform: skewY(-1deg);  } }
@keyframes trail-fade { 0% { opacity:1; } 100% { opacity:0.35; } }

/* ── Responsive ── */
@media (max-width: 768px) {
  .baker-scene-root { min-height: 180px; }
  .plane-root { width: 110px; }
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .plane-root[data-active="true"] {
    animation: plane-appear 0.001ms both, plane-fly-out 0.001ms 0.001ms both !important;
  }
  .plane-root[data-active="true"] .plane-wing-top,
  .plane-root[data-active="true"] .plane-wing-bot,
  .plane-root[data-active="true"] .plane-trail {
    animation: none !important;
  }
}
`;
