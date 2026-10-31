import React from 'react';
import {AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Segment, SEGS} from './BestAngle';

// Рилс обрезан на кадре 303 (по просьбе Кати), без имени и без звука.
export const FIFA_FRAMES = 304;

type Line = {text: string; size: number; weight: number; gold?: boolean};
type Cap = {from: number; dur: number; top: number; lines: Line[]; hold?: boolean};

// Титры меняются на каждом втором такте (раз в 2.4 с), в такт склейкам.
const CAPS: Cap[] = [
  {
    from: 0,
    dur: 84,
    top: 190,
    lines: [
      {text: 'Говорят,', size: 70, weight: 500},
      {text: 'я фифа', size: 170, weight: 800, gold: true},
    ],
  },
  {
    from: 84,
    dur: 72,
    top: 190,
    lines: [
      {text: 'Высокомерная?', size: 112, weight: 800},
      {text: 'К такой не подойти?', size: 62, weight: 500},
    ],
  },
  {
    from: 156,
    dur: 54,
    top: 190,
    lines: [
      {text: 'А потом узнают', size: 90, weight: 700},
      {text: 'ближе...', size: 160, weight: 800, gold: true},
    ],
  },
  {
    from: 210,
    dur: 60,
    top: 165,
    lines: [
      {text: 'Классная и', size: 100, weight: 800},
      {text: 'коммуникабельная.', size: 84, weight: 800, gold: true},
      {text: 'Поддержу любой разговор', size: 56, weight: 500},
    ],
  },
  {
    from: 270,
    dur: FIFA_FRAMES - 270,
    top: 150,
    hold: true,
    lines: [
      {text: 'Фифа,', size: 104, weight: 800},
      {text: 'но своя.', size: 124, weight: 800, gold: true},
    ],
  },
];

const Caption: React.FC<{cap: Cap}> = ({cap}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const out = cap.hold
    ? 1
    : interpolate(f, [cap.dur - 7, cap.dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill
      style={{
        opacity: out,
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: cap.top,
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        textShadow: '0 4px 30px rgba(0,0,0,0.55)',
      }}
    >
      <div style={{lineHeight: 1.04}}>
        {cap.lines.map((l, i) => {
          const p = spring({frame: f - i * 4, fps, config: {damping: 12, stiffness: 170, mass: 0.6}});
          return (
            <div
              key={l.text}
              style={{
                fontSize: l.size,
                fontWeight: l.weight,
                color: l.gold ? '#f6dca4' : '#ffffff',
                opacity: Math.min(1, p),
                transform: `translateY(${(1 - p) * 46}px) scale(${0.86 + 0.14 * p})`,
                marginBottom: i === 0 ? 10 : 0,
              }}
            >
              {l.text}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const BestAngleFifa: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: '#000'}}>
    {SEGS.filter((s) => s.from < FIFA_FRAMES).map((seg) => (
      <Sequence key={seg.from} from={seg.from} durationInFrames={Math.min(seg.dur, FIFA_FRAMES - seg.from)}>
        <Segment seg={seg} />
      </Sequence>
    ))}
    <AbsoluteFill
      style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)'}}
    />
    <AbsoluteFill
      style={{background: 'linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.2) 26%, rgba(0,0,0,0) 44%)'}}
    />
    {CAPS.map((cap) => (
      <Sequence key={cap.from} from={cap.from} durationInFrames={cap.dur}>
        <Caption cap={cap} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
