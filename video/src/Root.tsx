import React from 'react';
import {Composition} from 'remotion';
import {TestCard} from './TestCard';

export const Root: React.FC = () => (
  <Composition
    id="TestCard"
    component={TestCard}
    durationInFrames={30}
    fps={30}
    width={720}
    height={1280}
  />
);
