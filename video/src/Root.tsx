import React from 'react';
import {Composition} from 'remotion';
import {TestCard} from './TestCard';
import {BestAngle, BEST_ANGLE_FRAMES} from './BestAngle';
import {BestAngleFifa, FIFA_FRAMES} from './BestAngleFifa';
import {Slishkom, SLISHKOM_FRAMES, DEFAULT_PROPS} from './Slishkom';
import {SlishkomCar, SLISHKOM_CAR_FRAMES} from './SlishkomCar';
import {SportTrainer, SPORT_FRAMES} from './SportTrainer';
import {WeddingReel, WEDDING_FRAMES} from './WeddingReel';

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
    <Composition
      id="Slishkom"
      component={Slishkom}
      durationInFrames={SLISHKOM_FRAMES}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={DEFAULT_PROPS}
      calculateMetadata={({props}) => ({durationInFrames: props.total})}
    />
    <Composition
      id="SlishkomCar"
      component={SlishkomCar}
      durationInFrames={SLISHKOM_CAR_FRAMES}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="SportTrainer"
      component={SportTrainer}
      durationInFrames={SPORT_FRAMES}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="WeddingReel"
      component={WeddingReel}
      durationInFrames={WEDDING_FRAMES}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="BestAngleFifa"
      component={BestAngleFifa}
      durationInFrames={FIFA_FRAMES}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);
