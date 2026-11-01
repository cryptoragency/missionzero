import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { Backdrop, Camera, Dot, Frame, Subtitle, NEON, INK, DIM, useShotClock } from '../ui';
import type { Scene } from '../script';

const CX = 960, CY = 540;
const BUBBLES = ['La sécurité d’un site', 'L’espace', 'La médecine', 'Un chiffre de l’INSEE', 'Une loi', 'Un brevet', 'Un appel d’offres', 'Votre métier', 'Une norme', 'Un marché', 'Une CVE', 'Un rapport'];
const bpos = (i: number) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 12; return { x: CX + 660 * Math.cos(a), y: CY - 20 + 360 * Math.sin(a) }; };

export const Choose: React.FC<{ scene: Scene; start: number }> = ({ scene, start }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let acc = start, shot = scene.shots[0], shotStart = start;
  for (const s of scene.shots) { if (frame >= acc) { shot = s; shotStart = acc; } acc += Math.round(s.seconds * fps); }
  const clock = useShotClock(shot, shotStart);
  const three = [0, 1, 2];
  const sec = bpos(0);
  return (
    <Backdrop tint="#0a0c14">
      <Camera p={clock.p}>
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          <circle cx={CX} cy={CY} r={110} fill="rgba(57,255,20,0.08)" stroke={NEON} strokeWidth={3} style={{ filter: `drop-shadow(0 0 16px ${NEON})` }} />
          <text x={CX} y={CY - 6} textAnchor="middle" fontSize={26} fontWeight={800} fill={INK} fontFamily="Segoe UI, Arial" letterSpacing={2}>LA BOUCLE</text>
          <text x={CX} y={CY + 30} textAnchor="middle" fontSize={20} fill={DIM} fontFamily="Segoe UI, Arial">zéro code · un objectif</text>
          {BUBBLES.map((b, i) => { const p = bpos(i); const hot = three.includes(i); const chosen = shot.id === 'security' && i === 0; return (
            <g key={b}>
              <line x1={CX} y1={CY} x2={p.x} y2={p.y} stroke={hot ? 'rgba(57,255,20,0.35)' : 'rgba(255,255,255,0.08)'} strokeWidth={1.5} />
              <rect x={p.x - 130} y={p.y - 30} width={260} height={60} rx={30} fill={chosen ? 'rgba(57,255,20,0.18)' : hot ? 'rgba(57,255,20,0.06)' : 'rgba(255,255,255,0.03)'} stroke={hot ? NEON : 'rgba(255,255,255,0.2)'} strokeWidth={hot ? 2.5 : 1} />
              <text x={p.x} y={p.y + 8} textAnchor="middle" fontSize={hot ? 24 : 20} fontWeight={hot ? 700 : 400} fill={hot ? INK : DIM} fontFamily="Segoe UI, Arial">{b}</text>
            </g>); })}
        </svg>
      </Camera>
      {shot.id === 'three' && three.map((i) => { const p = bpos(i); return <Frame age={clock.speakAge} key={i} x={p.x - 140} y={p.y - 40} w={280} h={80} on={clock.speaking} />; })}
      <Frame age={clock.speakAge} x={sec.x - 140} y={sec.y - 40} w={280} h={80} on={shot.id === 'security' && clock.speaking} />
      <Dot from={{ x: CX, y: CY - 150 }} to={shot.id === 'three' ? { x: CX, y: CY - 150 } : { x: sec.x, y: sec.y - 55 }} travelP={clock.travelP} />
      <Subtitle age={clock.speakAge} text={shot.en} on={clock.speaking} />
    </Backdrop>
  );
};
