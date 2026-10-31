import React from 'react';
import {Composition} from 'remotion';
import {TestCard} from './TestCard';
import {BestAngle, BEST_ANGLE_FRAMES} from './BestAngle';

export const Root: React.FC = () => (
  <>
    <Composition
      id="TestCard"
      component={TestCard}
      durationInFrames={30}
      fps={30}
      width={720}
      height={1280}
    />
    <Composition
      id="BestAngle"
      component={BestAngle}
      durationInFrames={BEST_ANGLE_FRAMES}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);
