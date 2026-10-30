import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Backdrop, Camera, Dot, Frame, Subtitle, Land, NEON, RED, GREEN, INK, DIM, useShotClock } from '../ui';
import type { Scene } from '../script';

const CX = 960, CY = 560, R = 300;
const RINGS = ['Objectif', 'Hypothèses', 'Actions', 'Évaluation', 'Leçon'];
const pos = (i: number) => ({ x: CX + R * Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / 5), y: CY + R * Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / 5) });

export const Loop: React.FC<{ scene: Scene; start: number }> = ({ scene, start }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Which shot are we in, and where does it start.
  let acc = start, shot = scene.shots[0], shotStart = start;
  for (const s of scene.shots) { if (frame >= acc) { shot = s; shotStart = acc; } acc += Math.round(s.seconds * fps); }
  const clock = useShotClock(shot, shotStart);
  const idx = scene.shots.indexOf(shot);
  // Rings light one by one during the 'rings' shot, after the travel.
  const litCount = shot.id === 'title' ? 0 : shot.id === 'rings' ? Math.min(5, Math.floor(Math.max(0, clock.t - 0.7) / ((shot.seconds - 1.2) / 5)) + 1) : 5;
  const ringLit = (i: number) => i < litCount;
  // The dot: title → rests under the title; rings → hops ring to ring; proof → centre; refuse → Évaluation.
  const dotTarget = shot.id === 'title' ? { x: CX, y: 640 } : shot.id === 'rings' ? pos(Math.max(0, litCount - 1)) : shot.id === 'proof' ? { x: CX, y: CY } : pos(3);
  const dotFrom = shot.id === 'title' ? { x: CX, y: 640 } : shot.id === 'rings' ? pos(Math.max(0, litCount - 2)) : shot.id === 'proof' ? pos(4) : { x: CX, y: CY };
  const hopP = shot.id === 'rings' ? Math.min(1, ((Math.max(0, clock.t - 0.7) % ((shot.seconds - 1.2) / 5)) / 0.5)) : clock.travelP;
  const refuseBlink = shot.id === 'refuse' && clock.speaking ? (Math.floor(clock.t * 3) % 2 === 0 ? RED : GREEN) : null;
  const titleA = interpolate(frame - start, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const titleUp = shot.id === 'title' ? 0 : 1;
  return (
    <Backdrop tint="#071018">
      <Camera p={clock.p}>
        {/* Title */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: titleUp ? 90 : 300, textAlign: 'center', transition: 'none' }}>
          <div style={{ fontSize: titleUp ? 54 : 150, fontWeight: 800, letterSpacing: titleUp ? 14 : 26, opacity: titleA, color: INK, textShadow: `0 0 30px rgba(57,255,20,0.35)` }}>MISSION ZERO</div>
          {!titleUp && <Land delay={start + 14} style={{ fontSize: 40, color: DIM, marginTop: 24, letterSpacing: 4 }}>UN OBJECTIF · AUCUN PLAN · L’ORDRE DE PROUVER</Land>}
        </div>
        {/* The loop */}
        {titleUp && (
          <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={2} strokeDasharray="6 10" />
            {RINGS.map((name, i) => { const p = pos(i); const lit = ringLit(i); const c = i === 3 && refuseBlink ? refuseBlink : lit ? NEON : 'rgba(255,255,255,0.25)'; return (
              <g key={name}>
                <circle cx={p.x} cy={p.y} r={74} fill={lit ? 'rgba(57,255,20,0.08)' : 'rgba(255,255,255,0.03)'} stroke={c} strokeWidth={lit ? 3 : 1.5} style={lit ? { filter: `drop-shadow(0 0 12px ${c})` } : undefined} />
                <text x={p.x} y={p.y + 9} textAnchor="middle" fontSize={28} fontWeight={700} fill={lit ? INK : DIM} fontFamily="Segoe UI, Arial" letterSpacing={1}>{name}</text>
              </g>); })}
            <g>
              <circle cx={CX} cy={CY} r={96} fill={shot.id === 'proof' || idx > 2 ? 'rgba(57,255,20,0.12)' : 'rgba(255,255,255,0.03)'} stroke={shot.id === 'proof' || idx > 2 ? NEON : 'rgba(255,255,255,0.25)'} strokeWidth={3} style={shot.id === 'proof' ? { filter: `drop-shadow(0 0 22px ${NEON})` } : undefined} />
              <text x={CX} y={CY + 11} textAnchor="middle" fontSize={34} fontWeight={800} fill={INK} fontFamily="Segoe UI, Arial" letterSpacing={2}>PREUVES</text>
            </g>
          </svg>
        )}
        {shot.id === 'proof' && clock.speaking && <Land delay={shotStart + 24} style={{ position: 'absolute', left: 0, right: 0, top: 900, textAlign: 'center', fontSize: 34, color: DIM, letterSpacing: 3 }}>LA CITATION EXACTE, SUR LA PAGE</Land>}
        {shot.id === 'refuse' && clock.speaking && <Land delay={shotStart + 24} style={{ position: 'absolute', left: 0, right: 0, top: 900, textAlign: 'center', fontSize: 34, color: RED, letterSpacing: 3, fontWeight: 700 }}>IL SE REFUSE LUI-MÊME</Land>}
      </Camera>
      {/* Frames: title, the lit ring, the centre, Évaluation */}
      <Frame age={clock.speakAge} x={200} y={290} w={1520} h={200} on={shot.id === 'title' && clock.speaking} />
      {shot.id === 'rings' && litCount > 0 && clock.speaking && <Frame x={pos(litCount - 1).x - 100} y={pos(litCount - 1).y - 100} w={200} h={200} on age={Math.round(((Math.max(0, clock.t - 0.7) % ((shot.seconds - 1.2) / 5))) * clock.fps)} />}
      <Frame age={clock.speakAge} x={CX - 124} y={CY - 124} w={248} h={248} on={shot.id === 'proof' && clock.speaking} />
      <Frame age={clock.speakAge} x={pos(3).x - 100} y={pos(3).y - 100} w={200} h={200} on={shot.id === 'refuse' && clock.speaking} color={RED} />
      <Dot from={dotFrom} to={dotTarget} travelP={shot.id === 'rings' ? hopP : clock.travelP} />
      <Subtitle age={clock.speakAge} text={shot.en} on={clock.speaking} />
    </Backdrop>
  );
};
