import React from 'react';
import { Composition } from 'remotion';
import { Film } from './Film';
import { FPS, totalFrames } from './script';

export const RemotionRoot: React.FC = () => (
  <Composition id="MissionZero" component={Film} durationInFrames={totalFrames()} fps={FPS} width={1920} height={1080} />
);
