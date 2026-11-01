import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Freeze,
  interpolate,
  OffthreadVideo,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const BEST_ANGLE_FRAMES = 360;

export type Seg = {
  from: number;
  dur: number;
  file: 'source.mp4' | 'slow.mp4';
  start: number;
  freezeAt?: number;
  calm?: boolean;
  s0: number;
  s1: number;
  ox: number;
  oy: number;
};

// start: кадр исходника (30 fps). s0 -> s1: зум, ox/oy: точка зума в процентах.
export const SEGS: Seg[] = [
  {from: 0, dur: 48, file: 'source.mp4', start: 120, s0: 1.15, s1: 1.45, ox: 55, oy: 46},
  {from: 48, dur: 36, file: 'source.mp4', start: 180, s0: 1.5, s1: 1.2, ox: 50, oy: 55},
  {from: 84, dur: 36, file: 'source.mp4', start: 240, s0: 1.25, s1: 1.6, ox: 50, oy: 58},
  {from: 120, dur: 36, file: 'source.mp4', start: 291, s0: 1.6, s1: 1.3, ox: 50, oy: 55},
  {from: 156, dur: 36, file: 'source.mp4', start: 339, s0: 1.3, s1: 1.7, ox: 48, oy: 58},
  {from: 192, dur: 36, file: 'source.mp4', start: 390, s0: 1.7, s1: 1.25, ox: 45, oy: 62},
  {from: 228, dur: 101, file: 'slow.mp4', start: 0, s0: 1.0, s1: 1.38, ox: 50, oy: 40},
  {from: 329, dur: 31, file: 'slow.mp4', start: 0, freezeAt: 100, calm: true, s0: 1.38, s1: 1.48, ox: 50, oy: 40},
];

export const Segment: React.FC<{seg: Seg}> = ({seg}) => {
  const f = useCurrentFrame();
  const punch = seg.calm ? 0 : Math.pow(Math.max(0, 1 - f / 9), 2);
  const base = interpolate(f, [0, seg.dur], [seg.s0, seg.s1], {
    easing: Easing.bezier(0.22, 0.61, 0.36, 1),
    extrapolateRight: 'clamp',
  });
  const scale = base * (1 + 0.12 * punch);
  const blur = 7 * punch;
  const sweep = seg.calm ? -200 : interpolate(f, [0, 16], [-130, 130], {extrapolateRight: 'clamp'});
  const flash = (seg.from === 0 ? 0.28 : 0.45) * punch;

  const video = (
    <OffthreadVideo
      src={staticFile(seg.file)}
      startFrom={seg.start}
      muted
      style={{width: '100%', height: '100%', objectFit: 'cover'}}
    />
  );

  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#000'}}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale})`,
          transformOrigin: `${seg.ox}% ${seg.oy}%`,
          filter: `blur(${blur}px) contrast(1.1) saturate(1.12) brightness(1.04)`,
        }}
      >
        {seg.freezeAt !== undefined ? <Freeze frame={seg.freezeAt}>{video}</Freeze> : video}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `linear-gradient(105deg, transparent ${sweep - 18}%, rgba(255,240,215,0.22) ${sweep}%, transparent ${sweep + 18}%)`,
          mixBlendMode: 'screen',
        }}
      />
      <AbsoluteFill style={{backgroundColor: '#fff', opacity: flash}} />
    </AbsoluteFill>
  );
};

const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  const word = (text: string, delay: number, size: number, weight: number, gold = false) => {
    const p = spring({frame: f - delay, fps, config: {damping: 14, stiffness: 160, mass: 0.6}});
    return (
      <span
        style={{
          display: 'inline-block',
          fontSize: size,
          fontWeight: weight,
          opacity: p,
          transform: `translateY(${(1 - p) * 40}px) scale(${0.9 + 0.1 * p})`,
          marginRight: 22,
          color: gold ? '#f6dca4' : '#ffffff',
        }}
      >
        {text}
      </span>
    );
  };

  const out = interpolate(f, [66, 84], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill
      style={{
        opacity: out,
        transform: `translateY(${(1 - out) * -24}px)`,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 200,
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        textShadow: '0 4px 28px rgba(0,0,0,0.5)',
      }}
    >
      <AbsoluteFill
        style={{background: 'linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.18) 28%, rgba(0,0,0,0) 45%)'}}
      />
      <div style={{lineHeight: 1.05, position: 'relative'}}>
        <div style={{marginBottom: 14}}>{word('Главное:', 0, 58, 500)}</div>
        <div>{word('поймать', 5, 120, 800)}</div>
        <div>
          {word('лучший', 10, 120, 800, true)}
          {word('ракурс', 15, 120, 800, true)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const NameCard: React.FC = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: f - 4, fps, config: {damping: 16, stiffness: 120, mass: 0.7}});
  const line = interpolate(f, [8, 26], [0, 1], {easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 380,
        fontFamily: 'Inter, sans-serif',
        color: '#fff',
        textShadow: '0 4px 28px rgba(0,0,0,0.55)',
      }}
    >
      <AbsoluteFill
        style={{
          opacity: p,
          background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0) 52%)',
        }}
      />
      <div style={{width: 320 * line, height: 3, backgroundColor: '#f6dca4', marginBottom: 30, position: 'relative'}} />
      <div
        style={{
          fontSize: 96,
          fontWeight: 300,
          letterSpacing: '0.18em',
          opacity: p,
          transform: `translateY(${(1 - p) * 30}px)`,
          position: 'relative',
        }}
      >
        Екатерина
      </div>
    </AbsoluteFill>
  );
};

export const BestAngle: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#000'}}>
    {SEGS.map((seg) => (
      <Sequence key={seg.from} from={seg.from} durationInFrames={seg.dur}>
        <Segment seg={seg} />
      </Sequence>
    ))}
    <AbsoluteFill
      style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)'}}
    />
    <Sequence from={0} durationInFrames={90}>
      <Hook />
    </Sequence>
    <Sequence from={300} durationInFrames={60}>
      <NameCard />
    </Sequence>
  </AbsoluteFill>
);
