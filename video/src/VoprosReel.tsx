import React from 'react';
import {AbsoluteFill, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {useMontserrat} from './WordCaptions';

// Рилс 38, челлендж Лилии, день 3 «ВОПРОС» (19.11): вопрос на экране всё видео, Катя в ТЦ (кадры «Красиво уходит»,
// public/r32): идёт к камере с улыбкой, разворот со взмахом волос в замедлении, уходит. 7 с, без звука:
// трендовую музыку Катя ставит в Instagram. Текст: чёрный Montserrat ExtraBold на белых плашках (как день 1, его хвалил куратор).

const GRADE = 'contrast(1.06) saturate(1.0) sepia(0.05) brightness(1.02)';
const SEGS = [
  {src: 's1', from: 0, dur: 60, z: [1.0, 1.05], o: '50% 40%'},
  {src: 's2r', from: 0, dur: 60, z: [1.02, 1.08], o: '50% 40%'},
  {src: 's3', from: 0, dur: 45, z: [1.0, 1.05], o: '50% 45%'},
  {src: 's4', from: 0, dur: 45, z: [1.08, 1.0], o: '50% 45%'},
];
const STARTS = SEGS.map((_, i) => SEGS.slice(0, i).reduce((a, x) => a + x.dur, 0));
export const VOPROS_FRAMES = SEGS.reduce((a, x) => a + x.dur, 0);
const LINES = ['Как изменилась ваша жизнь,', 'когда вы позволили себе', 'стать охуевшей? 😏'];

const Shot: React.FC<{src: string; dur: number; z: number[]; o: string}> = ({src, dur, z, o}) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, dur], z, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <OffthreadVideo src={staticFile(`r32/${src}.mp4`)} muted style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${s.toFixed(4)})`, transformOrigin: o, filter: GRADE}} />
    </AbsoluteFill>
  );
};

export const VoprosReel: React.FC = () => {
  useMontserrat();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {SEGS.map((x, i) => (
        <Sequence key={x.src} from={STARTS[i]} durationInFrames={x.dur}>
          <Shot src={x.src} dur={x.dur} z={x.z} o={x.o} />
        </Sequence>
      ))}
      <div style={{position: 'absolute', top: 1000, left: 30, right: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
        {LINES.map((l) => (
          <div
            key={l}
            style={{
              fontFamily: 'Montserrat, "DejaVu Sans", sans-serif',
              fontWeight: 800,
              fontSize: 58,
              lineHeight: 1.12,
              letterSpacing: '-0.015em',
              color: '#111',
              background: '#fff',
              padding: '0.08em 0.36em 0.12em',
              borderRadius: '0.28em',
              boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
              whiteSpace: 'nowrap',
            }}
          >
            {l}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
