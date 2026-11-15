import React from 'react';
import {AbsoluteFill, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {useInter} from './SynReel';
import {useOswald2} from './UgadajReel';

// Рилс 32 «Красиво уходит» (15.11): формат «фраза поверх красивых кадров» (разбор @natally_glow).
// Без слов в кадре: селфи в примерочной (поворот, замедление), походка, разворот со взмахом волос, уходит.
// Текст: мелкая строка и ключевые слова крупно. Клипы готовит tools/prepare_r32.py. Без размытия (решение Кати 15.11).
// Без звука: музыку Катя добавляет в Instagram.

const OSW = 'Oswald, "DejaVu Sans Condensed", sans-serif';
const INTER = 'Inter, "DejaVu Sans", sans-serif';
const GRADE = 'contrast(1.06) saturate(0.94) sepia(0.06) brightness(1.01)';

const SEGS: {src: string; dur: number; z: [number, number]; origin?: string}[] = [
  {src: 's0', dur: 75, z: [1.06, 1.0], origin: '45% 40%'},
  {src: 's1', dur: 60, z: [1.0, 1.06]},
  {src: 's2', dur: 75, z: [1.0, 1.05]},
  {src: 's3', dur: 60, z: [1.0, 1.05]},
  {src: 's4', dur: 120, z: [1.0, 1.08]},
];
const STARTS = SEGS.map((_, i) => SEGS.slice(0, i).reduce((a, x) => a + x.dur, 0));
export const KRASIVO_FRAMES = SEGS.reduce((a, x) => a + x.dur, 0);

const Shot: React.FC<{src: string; dur: number; z: [number, number]; origin?: string}> = ({src, dur, z, origin = '50% 45%'}) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, dur], z, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#000'}}>
      <OffthreadVideo
        src={staticFile(`r32/${src}.mp4`)}
        muted
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${s.toFixed(4)})`, transformOrigin: origin, filter: GRADE}}
      />
    </AbsoluteFill>
  );
};

// строка текста: появляется снизу из лёгкого размытия
const Line: React.FC<{t: string; at: number; dur: number; big?: boolean}> = ({t, at, dur, big}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [at, at + 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const out = interpolate(f, [dur - 6, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div
      style={{
        fontFamily: big ? OSW : INTER,
        fontWeight: big ? 700 : 600,
        fontSize: big ? 112 : 54,
        letterSpacing: big ? 2 : 0.5,
        lineHeight: 1.1,
        color: '#fff',
        textTransform: big ? 'uppercase' : 'none',
        textAlign: 'center',
        textShadow: '0 2px 4px rgba(0,0,0,0.55), 0 6px 26px rgba(0,0,0,0.5)',
        whiteSpace: 'nowrap',
        opacity: p * out,
        transform: `translateY(${((1 - p) * 26).toFixed(1)}px)`,
        filter: `blur(${((1 - p) * 6).toFixed(2)}px)`,
        margin: big ? '4px 0' : '0 0 6px',
      }}
    >
      {t}
    </div>
  );
};

const Text: React.FC<{from: number; dur: number; lines: {t: string; at: number; big?: boolean}[]}> = ({from, dur, lines}) => (
  <Sequence from={from} durationInFrames={dur}>
    <AbsoluteFill>
      <div style={{position: 'absolute', top: 1260, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        {lines.map((l, i) => (
          <Line key={i} t={l.t} at={l.at} big={l.big} dur={dur} />
        ))}
      </div>
    </AbsoluteFill>
  </Sequence>
);

export const KrasivoReel: React.FC = () => {
  useInter();
  useOswald2();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {SEGS.map((s, i) => (
        <Sequence key={s.src} from={STARTS[i]} durationInFrames={s.dur}>
          <Shot src={s.src} dur={s.dur} z={s.z} origin={s.origin} />
        </Sequence>
      ))}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.28) 75%, rgba(0,0,0,0) 92%)'}} />
      <Text
        from={0}
        dur={STARTS[1] + 2}
        lines={[
          {t: 'Женщина, которая', at: 6},
          {t: 'знает себе цену,', at: 16, big: true},
        ]}
      />
      <Text from={STARTS[1]} dur={SEGS[1].dur + 30} lines={[{t: 'не спорит.', at: 4, big: true}]} />
      <Text from={STARTS[3]} dur={SEGS[3].dur + 2} lines={[{t: 'Она просто', at: 4}]} />
      <Text
        from={STARTS[4]}
        dur={SEGS[4].dur + 6}
        lines={[
          {t: 'Она просто', at: 0},
          {t: 'красиво уходит.', at: 8, big: true},
        ]}
      />
    </AbsoluteFill>
  );
};
