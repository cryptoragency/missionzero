import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { Backdrop, Camera, Dot, Frame, Subtitle, Land, NEON, RED, GREEN, INK, DIM, useShotClock } from '../ui';
import type { Scene } from '../script';

const LX = 110, RX = 1010, W = 800, Y0 = 250, H = 86, STEP = 108;
const BEFORE = ['Un scanner trouve 15 failles', 'On corrige à la main, en production', 'Autre chose casse, personne ne relit', 'Site fermé, données dans la nature'];
const AFTER = ['Le même constat, format générique', 'Correctif cherché, sources citées', 'Patch sur une copie, jamais le site', '7 parcours rejoués, rescan, regard', 'Un humain applique'];

const Panel: React.FC<{ x: number; title: string; color: string; items: string[]; lit: number; bold?: number }> = ({ x, title, color, items, lit, bold }) => (
  <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
    <text x={x + W / 2} y={Y0 - 50} textAnchor="middle" fontSize={34} fontWeight={800} fill={color} fontFamily="Segoe UI, Arial" letterSpacing={3}>{title}</text>
    {items.map((it, i) => { const on = i < lit; return (
      <g key={it} opacity={on ? 1 : 0.22}>
        {i > 0 && <line x1={x + W / 2} y1={Y0 + (i - 1) * STEP + H} x2={x + W / 2} y2={Y0 + i * STEP} stroke={color} strokeWidth={2} />}
        <rect x={x} y={Y0 + i * STEP} width={W} height={H} rx={14} fill={color} fillOpacity={on ? 0.1 : 0.03} stroke={color} strokeWidth={2} />
        <text x={x + W / 2} y={Y0 + i * STEP + H / 2 + 11} textAnchor="middle" fontSize={30} fontWeight={bold === i ? 800 : 500} fill={INK} fontFamily="Segoe UI, Arial">{it}</text>
      </g>); })}
  </svg>
);

export const Security: React.FC<{ scene: Scene; start: number }> = ({ scene, start }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let acc = start, shot = scene.shots[0], shotStart = start;
  for (const s of scene.shots) { if (frame >= acc) { shot = s; shotStart = acc; } acc += Math.round(s.seconds * fps); }
  const clock = useShotClock(shot, shotStart);
  const idx = scene.shots.indexOf(shot);
  // Shot 'closed': the shop runs, then a hard cut to black with the card.
  const cut = shot.id === 'closed' && clock.t >= 1.6;
  const litBefore = shot.id === 'closed' ? 0 : shot.id === 'production' ? 4 : 4;
  const litAfter = idx < 2 ? 0 : idx === 2 ? 4 : 5;
  const dotOn = idx >= 2;
  const afterY = (i: number) => Y0 + i * STEP + H / 2;
  const dotTo = shot.id === 'copy' ? { x: RX + W / 2, y: afterY(2) } : shot.id === 'rejected' ? { x: RX + W / 2, y: afterY(3) } : shot.id === 'look' ? { x: RX + W / 2, y: afterY(3) } : shot.id === 'real' ? { x: RX + W / 2, y: afterY(3) } : { x: RX + W / 2, y: afterY(4) };
  const dotFrom = shot.id === 'copy' ? { x: RX + W / 2, y: Y0 - 120 } : shot.id === 'rejected' ? { x: RX + W / 2, y: afterY(2) } : shot.id === 'approve' ? { x: RX + W / 2, y: afterY(3) } : dotTo;
  // The look: a payment form whose fields vanish (SAM 5 → 2).
  const fields = ['Numéro de carte', 'Expiration', 'Cryptogramme', 'Nom', 'E-mail'];
  const vanish = shot.id === 'look' ? interpolate(clock.t, [1.6, 2.6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  return (
    <Backdrop tint={idx < 2 ? '#160a0a' : '#071410'}>
      {cut ? (
        <AbsoluteFill style={{ background: '#000', justifyContent: 'center', alignItems: 'center' }}>
          <Land delay={shotStart + Math.round(1.8 * fps)} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 92, fontWeight: 800, color: RED, letterSpacing: 6, textShadow: `0 0 40px ${RED}` }}>SITE FERMÉ</div>
            <div style={{ fontSize: 44, color: DIM, marginTop: 18, letterSpacing: 2 }}>Données clients dans la nature</div>
            <div style={{ fontSize: 40, color: INK, marginTop: 60, fontWeight: 700 }}>8 sites sur 10 sont exposés</div>
          </Land>
        </AbsoluteFill>
      ) : (
        <Camera p={clock.p}>
          {shot.id === 'closed' ? (
            <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ width: 1400, height: 760, borderRadius: 18, background: '#f6f3ee', color: '#222', padding: 40, fontFamily: 'Georgia, serif' }}>
                <div style={{ fontSize: 44, fontWeight: 700, color: '#2b5a2b' }}>Maison Verde</div>
                <div style={{ display: 'flex', gap: 28, marginTop: 36 }}>{['Monstera', 'Ficus', 'Olivier', 'Calathea'].map((p) => <div key={p} style={{ flex: 1, height: 420, borderRadius: 12, background: 'linear-gradient(#cfe3c9,#8fb98a)', display: 'flex', alignItems: 'flex-end', padding: 20, fontSize: 30 }}>{p} · 39 €</div>)}</div>
                <div style={{ marginTop: 40, fontSize: 28, color: '#555' }}>Panier · Commander · Suivre ma commande</div>
              </div>
            </AbsoluteFill>
          ) : shot.id === 'look' ? (
            <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ width: 1100, borderRadius: 18, background: '#f6f3ee', color: '#222', padding: 48, fontFamily: 'Georgia, serif' }}>
                <div style={{ fontSize: 40, fontWeight: 700 }}>Paiement</div>
                {fields.map((f, i) => { const gone = i < 3 && vanish > 0.5; return (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 26 }}>
                    <div style={{ width: 300, fontSize: 30 }}>{f}</div>
                    <div style={{ flex: 1, height: 58, borderRadius: 8, border: '2px solid #999', background: '#fff', opacity: gone ? 0 : 1 }} />
                  </div>); })}
                <div style={{ marginTop: 40, fontSize: 32, fontWeight: 700, color: vanish > 0.5 ? RED : GREEN }}>{vanish > 0.5 ? 'SAM : 5 champs avant, 2 après · REFUSÉ' : 'Tests HTTP : 7 parcours verts'}</div>
              </div>
            </AbsoluteFill>
          ) : shot.id === 'real' ? (
            <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40, color: DIM, letterSpacing: 4 }}>UN VRAI SITE · 6STEM.COM · LU PAR ARGUS</div>
                <div style={{ display: 'flex', gap: 60, justifyContent: 'center', marginTop: 50 }}>
                  <div style={{ fontSize: 150, fontWeight: 800, color: INK }}>7<div style={{ fontSize: 34, color: DIM, fontWeight: 400 }}>constats</div></div>
                  <div style={{ fontSize: 150, fontWeight: 800, color: GREEN }}>5<div style={{ fontSize: 34, color: DIM, fontWeight: 400 }}>réparés avec preuves</div></div>
                  <div style={{ fontSize: 150, fontWeight: 800, color: RED }}>2<div style={{ fontSize: 34, color: DIM, fontWeight: 400 }}>non certifiés, il le dit</div></div>
                </div>
              </div>
            </AbsoluteFill>
          ) : shot.id === 'approve' ? (
            <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 120, fontWeight: 800, letterSpacing: 10, color: INK }}>MYTHOZOR</div>
                <div style={{ fontSize: 34, color: DIM, letterSpacing: 4, marginTop: 10 }}>UN PRODUIT DE CRYPTOR.AGENCY</div>
                <div style={{ display: 'flex', gap: 40, justifyContent: 'center', marginTop: 70, fontSize: 44, fontWeight: 700 }}>
                  <span style={{ color: INK }}>ARGUS surveille</span><span style={{ color: DIM }}>·</span><span style={{ color: NEON }}>Mission Zero répare</span><span style={{ color: DIM }}>·</span><span style={{ color: INK }}>vous validez</span>
                </div>
              </div>
            </AbsoluteFill>
          ) : (
            <>
              <Panel x={LX} title="AVANT, SANS MISSION ZERO" color={RED} items={BEFORE} lit={litBefore} bold={3} />
              <Panel x={RX} title="AVEC MISSION ZERO" color={GREEN} items={AFTER} lit={litAfter} bold={4} />
              {shot.id === 'rejected' && clock.speaking && (
                <Land delay={shotStart + Math.round(0.9 * fps)} style={{ position: 'absolute', left: RX, top: Y0 + 5 * STEP + 10, width: W, textAlign: 'center', fontSize: 40, fontWeight: 800, letterSpacing: 4 }}>
                  <span style={{ color: RED }}>{clock.t < 4 ? 'REJETÉ' : ''}</span><span style={{ color: GREEN }}>{clock.t >= 4 ? 'PROPOSÉ' : ''}</span>
                </Land>
              )}
            </>
          )}
        </Camera>
      )}
      {/* Frames */}
      <Frame age={clock.speakAge} x={560} y={330} w={800} h={420} on={cut && clock.speaking} color={RED} />
      <Frame age={clock.speakAge} x={LX - 10} y={Y0 + STEP - 10} w={W + 20} h={H + 20} on={shot.id === 'production' && clock.speaking} color={RED} />
      <Frame age={clock.speakAge} x={RX - 10} y={Y0 + 2 * STEP - 10} w={W + 20} h={H + 20} on={shot.id === 'copy' && clock.speaking} />
      <Frame age={clock.speakAge} x={RX + 200} y={Y0 + 5 * STEP} w={400} h={80} on={shot.id === 'rejected' && clock.speaking && clock.t > 1.2} color={clock.t < 4 ? RED : GREEN} />
      <Frame age={clock.speakAge} x={410} y={160} w={1100} h={760} on={shot.id === 'look' && clock.speaking && vanish > 0.5} color={RED} />
      <Frame age={clock.speakAge} x={360} y={300} w={1200} h={470} on={shot.id === 'real' && clock.speaking} />
      <Frame age={clock.speakAge} x={300} y={640} w={1320} h={120} on={shot.id === 'approve' && clock.speaking} />
      <Dot from={dotFrom} to={dotTo} travelP={clock.travelP} visible={dotOn && !['look', 'real', 'approve'].includes(shot.id)} />
      <Subtitle age={clock.speakAge} text={shot.en} on={clock.speaking} />
    </Backdrop>
  );
};
