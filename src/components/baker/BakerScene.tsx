/**
 * src/components/baker/BakerScene.tsx
 * ─────────────────────────────────────────────────────────────
 * Scène Three.js — boulanger 3D + avion en papier SVG.
 *
 * Props :
 *  flying   – true dès que l'utilisateur clique sur "Se connecter"
 *  onFlown  – appelé ~1.6 s après l'envol (navigation vers /dashboard)
 *  compact  – cadrage mobile (hauteur réduite, caméra rapprochée)
 *
 * Garanties :
 *  • Aucune dépendance CDN — tout est bundlé.
 *  • dpr plafonné à 1.5 sur mobile pour la fluidité.
 *  • L'avion est position:absolute dans le conteneur (pas fixed)
 *    → il ne déborde jamais hors de son panneau.
 *  • prefers-reduced-motion respecté.
 */

import { Suspense, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { Baker } from "./Baker";

interface Props {
  flying: boolean;
  onFlown?: () => void;
  compact?: boolean;
}

export function BakerScene({ flying, onFlown, compact = false }: Props) {
  const onFlownRef = useRef(onFlown);
  onFlownRef.current = onFlown;

  useEffect(() => {
    if (!flying) return;
    const t = setTimeout(() => onFlownRef.current?.(), 1600);
    return () => clearTimeout(t);
  }, [flying]);

  const cam = compact
    ? { position: [-0.1, 1.3, 7.8] as [number, number, number], fov: 32 }
    : { position: [-0.2, 1.55, 13.2] as [number, number, number], fov: 27 };

  const lookAt: [number, number, number] = compact ? [-0.1, 1.1, 0] : [-0.2, 1.05, 0];

  return (
    <div
      aria-hidden="true"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: compact ? 200 : 280,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <Canvas
        style={{ width: "100%", height: "100%", background: "transparent" }}
        camera={cam}
        shadows="soft"
        dpr={[1, compact ? 1.5 : 1.75]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ camera }) => camera.lookAt(...lookAt)}
      >
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[3.2, 6, 4.2]}
          intensity={1.2}
          color="#fff3e0"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0004}
        />
        <directionalLight position={[-3, 3.4, -2.4]} intensity={0.48} color="#dfe7f2" />
        <pointLight position={[0.4, 0.3, 1.8]} intensity={0.32} color="#e8c49a" distance={7} />

        <Suspense fallback={null}>
          <Environment resolution={128} frames={1}>
            <Lightformer intensity={1.5} color="#fff6ea" position={[0, 4.5, 1]} scale={[8, 8, 1]} />
            <Lightformer intensity={0.65} color="#e9d7c0" position={[-4, 1.2, 1]} rotation-y={Math.PI / 2} scale={[10, 3, 1]} />
            <Lightformer intensity={0.45} color="#cdd8e6" position={[4, 1.6, -1]} rotation-y={-Math.PI / 2} scale={[10, 3, 1]} />
          </Environment>

          <Baker
            standX={compact ? 0.05 : 0.18}
            scale={compact ? 0.96 : 1.06}
            flying={flying}
            reduced={compact}
          />
        </Suspense>

        <ContactShadows
          position={[0, 0.001, 0]}
          scale={compact ? 4 : 6}
          blur={2.2}
          opacity={0.42}
          far={2.2}
          resolution={256}
          color="#5a4632"
        />

        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[28, 28]} />
          <shadowMaterial opacity={0.14} color="#4a3728" />
        </mesh>
      </Canvas>

      <PaperPlane active={flying} compact={compact} />
      <style>{SCENE_CSS}</style>
    </div>
  );
}

function PaperPlane({ active, compact }: { active: boolean; compact: boolean }) {
  if (!active) return null;
  return (
    <div className={`plane-root${compact ? " plane-compact" : ""}`}>
      <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <polygon className="plane-body"     points="0,40 120,20 80,50 70,78" />
        <polygon className="plane-wing-top" points="0,40 120,20 80,40" />
        <polygon className="plane-wing-bot" points="0,40 80,40 70,78" />
        <line className="plane-fold"  x1="0" y1="40" x2="80" y2="40" strokeWidth="1" strokeLinecap="round" />
        <line className="plane-shine" x1="10" y1="38" x2="75" y2="22" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
        <g className="plane-trail">
          <line x1="-18" y1="40" x2="-58" y2="42" strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
          <line x1="-18" y1="44" x2="-48" y2="46" strokeWidth="1"   strokeLinecap="round" opacity="0.22" />
          <line x1="-18" y1="36" x2="-43" y2="37" strokeWidth="1"   strokeLinecap="round" opacity="0.16" />
        </g>
      </svg>
    </div>
  );
}

const SCENE_CSS = `
.plane-body     { fill: #f5f0e8; }
.plane-wing-top { fill: #ede6d5; }
.plane-wing-bot { fill: #e0d8c4; }
.plane-fold     { stroke: #c2b89a; }
.plane-shine    { stroke: #ffffff; }
.plane-trail    { stroke: #c97c3d; }

.plane-root {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 148px;
  transform: translate(-50%, -50%) rotate(-8deg);
  pointer-events: none;
  z-index: 20;
  animation:
    plane-appear  0.20s cubic-bezier(0.34,1.36,0.64,1) 0s    both,
    plane-hover   0.35s ease-in-out                     0.16s both,
    plane-fly-out 0.95s cubic-bezier(0.55,0,0.75,0.1)  0.48s both;
}
.plane-compact { width: 100px; }

@keyframes plane-appear {
  0%   { opacity:0; transform:translate(-50%,-50%) scale(0.5)  rotate(-20deg); }
  100% { opacity:1; transform:translate(-50%,-50%) scale(1)    rotate(-8deg);  }
}
@keyframes plane-hover {
  0%   { transform:translate(-50%,-50%)  scale(1)    rotate(-8deg);  }
  50%  { transform:translate(-50%,-56%)  scale(1.04) rotate(-12deg); }
  100% { transform:translate(-50%,-52%)  scale(1)    rotate(-9deg);  }
}
@keyframes plane-fly-out {
  0%   { opacity:1;   transform:translate(-50%,-52%)  scale(1)    rotate(-9deg);  }
  28%  { opacity:1;   transform:translate(0%,-100%)   scale(0.82) rotate(-24deg); }
  60%  { opacity:0.9; transform:translate(60%,-160%)  scale(0.60) rotate(-34deg); }
  100% { opacity:0;   transform:translate(140%,-240%) scale(0.26) rotate(-44deg); }
}

.plane-root .plane-wing-top {
  animation: wing-top 0.16s ease-in-out 0.48s infinite alternate;
  transform-origin: 0 40px;
}
.plane-root .plane-wing-bot {
  animation: wing-bot 0.20s ease-in-out 0.52s infinite alternate;
  transform-origin: 0 40px;
}
.plane-root .plane-trail {
  animation: trail-fade 0.26s ease-in-out 0.48s infinite alternate;
}
@keyframes wing-top   { 0%{transform:skewY(-1deg)}  100%{transform:skewY(1.5deg)}  }
@keyframes wing-bot   { 0%{transform:skewY(1.5deg)} 100%{transform:skewY(-1deg)}   }
@keyframes trail-fade { 0%{opacity:1}               100%{opacity:0.3}               }

@media (prefers-reduced-motion: reduce) {
  .plane-root {
    animation: plane-appear 0.001ms both, plane-fly-out 0.001ms 0.001ms both !important;
  }
  .plane-root .plane-wing-top,
  .plane-root .plane-wing-bot,
  .plane-root .plane-trail { animation: none !important; }
}
`;
