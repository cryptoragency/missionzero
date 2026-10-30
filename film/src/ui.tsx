import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import type { Shot } from './script';

export const NEON = '#39ff14';
export const RED = '#ff3b3b';
export const GREEN = '#2ee36b';
export const INK = '#f2f2f2';
export const DIM = 'rgba(242,242,242,0.55)';
export const FONT = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';

// Where the shot stands: the dot travels during `travel` seconds (silence), then the sentence plays with its frame.
export function useShotClock(shot: Shot, startFrame: number, travel = 0.7) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame - startFrame) / fps;
  const length = shot.seconds;
  const speaking = t >= travel && t <= length - 0.3;
  const travelP = Math.min(1, Math.max(0, t / travel));
  const p = Math.min(1, Math.max(0, t / length));
  const speakAge = Math.max(0, Math.round((t - travel) * fps));
  return { t, p, speaking, travelP, length, fps, frame, speakAge };
}

// Deterministic star field, slowly drifting: depth without noise.
export const Stars: React.FC<{ count?: number; drift?: number; seed?: number }> = ({ count = 140, drift = 1, seed = 7 }) => {
  const frame = useCurrentFrame();
  const stars = React.useMemo(() => {
    let s = seed; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    return Array.from({ length: count }, () => ({ x: rnd() * 1920, y: rnd() * 1080, r: 0.6 + rnd() * 1.8, a: 0.25 + rnd() * 0.6, v: 0.3 + rnd() }));
  }, [count, seed]);
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
      {stars.map((st, i) => <circle key={i} cx={(st.x + frame * 0.08 * st.v * drift) % 1920} cy={st.y} r={st.r} fill="#fff" opacity={st.a} />)}
    </svg>
  );
};

export const Backdrop: React.FC<{ tint?: string; children?: React.ReactNode }> = ({ tint = '#05070c', children }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, ${tint} 0%, #000 75%)`, fontFamily: FONT, color: INK, overflow: 'hidden' }}>
    <Stars />
    {children}
  </AbsoluteFill>
);

// A slow push-in on the whole stage while a sentence plays: the camera breathes, nothing else moves.
export const Camera: React.FC<{ p: number; children: React.ReactNode }> = ({ p, children }) => {
  const scale = interpolate(p, [0, 1], [1, 1.035], { easing: Easing.inOut(Easing.quad) });
  return <AbsoluteFill style={{ transform: `scale(${scale})`, transformOrigin: '50% 50%' }}>{children}</AbsoluteFill>;
};

// The frame around the element the voice names: neon rectangle that draws itself, then stays. Everything else is still.
export const Frame: React.FC<{ x: number; y: number; w: number; h: number; on: boolean; color?: string; age?: number }> = ({ x, y, w, h, on, color = NEON, age = 12 }) => {
  if (!on) return null;
  const draw = interpolate(age, [0, 12], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const perim = 2 * (w + h);
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <rect x={x} y={y} width={w} height={h} rx={14} fill="none" stroke={color} strokeWidth={4} strokeDasharray={perim} strokeDashoffset={perim * (1 - draw)} style={{ filter: `drop-shadow(0 0 14px ${color})` }} />
    </svg>
  );
};

// The luminous dot. It moves from `from` to `to` during the travel, with a short trail, then rests.
export const Dot: React.FC<{ from: { x: number; y: number }; to: { x: number; y: number }; travelP: number; visible?: boolean; color?: string }> = ({ from, to, travelP, visible = true, color = NEON }) => {
  if (!visible) return null;
  const e = Easing.inOut(Easing.cubic)(travelP);
  const x = from.x + (to.x - from.x) * e, y = from.y + (to.y - from.y) * e;
  const moving = travelP > 0 && travelP < 1;
  const trail = [0.55, 0.35, 0.18].map((k, i) => { const ee = Easing.inOut(Easing.cubic)(Math.max(0, travelP - 0.06 * (i + 1))); return { x: from.x + (to.x - from.x) * ee, y: from.y + (to.y - from.y) * ee, a: k }; });
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {moving && trail.map((t, i) => <circle key={i} cx={t.x} cy={t.y} r={9 - i * 2} fill={color} opacity={t.a} />)}
      <circle cx={x} cy={y} r={11} fill={color} style={{ filter: `drop-shadow(0 0 18px ${color}) drop-shadow(0 0 40px ${color})` }} />
      <circle cx={x} cy={y} r={4} fill="#fff" />
    </svg>
  );
};

// The English subtitle, bottom of the frame, only while the voice speaks.
export const Subtitle: React.FC<{ text: string; on: boolean; age?: number }> = ({ text, on, age = 8 }) => {
  if (!on) return null;
  const a = interpolate(age, [0, 8], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 64, textAlign: 'center', opacity: a }}>
      <span style={{ display: 'inline-block', background: 'rgba(0,0,0,0.72)', color: '#fff', fontSize: 38, lineHeight: 1.3, padding: '10px 28px', borderRadius: 10, letterSpacing: 0.3, maxWidth: 1500 }}>{text}</span>
    </div>
  );
};

// Big words that land with weight: slides up 20 px and fades in, once.
export const Land: React.FC<{ delay?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ delay = 0, children, style }) => {
  const frame = useCurrentFrame();
  const a = interpolate(frame - delay, [0, 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  return <div style={{ opacity: a, transform: `translateY(${(1 - a) * 20}px)`, ...style }}>{children}</div>;
};
