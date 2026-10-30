import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { scenes, sceneFrames } from './script';
import { Loop } from './scenes/Loop';
import { Choose } from './scenes/Choose';
import { Security } from './scenes/Security';

const byId: Record<string, React.FC<{ scene: (typeof scenes)[number]; start: number }>> = { loop: Loop, choose: Choose, security: Security };

export const Film: React.FC = () => {
  let at = 0;
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {scenes.map((s) => { const from = at; const len = sceneFrames(s); at += len; const C = byId[s.id]; if (!C) return null; return (
        <Sequence key={s.id} from={from} durationInFrames={len} name={s.title}><C scene={s} start={0} /></Sequence>); })}
    </AbsoluteFill>
  );
};
