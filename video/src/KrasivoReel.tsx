import React from 'react';
import {AbsoluteFill, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {useInter} from './SynReel';
import {useOswald2} from './UgadajReel';

// Рилс 32 «Красиво уходит», версия 3 (15.11): эффекты версии 2 («хочется ещё эффектнее», «как крутой рилсмейкер»),
// без кадров с пола в примерочной (Катя: «Мне не нравится с кадрами из примерочной»), весь ролик в ТЦ после хука.
// Формат «фраза поверх красивых кадров» (разбор @natally_glow), но в ритме: склейки по долям 0,5 с, ускорение
// и замедление на взмахах волос, рывки камеры, вспышки, тёплые засветы, плёночное зерно, текст по словам.
// Финал: уходит по галерее со спины: замедление, ускорение вдаль, снова замедление, «КРАСИВО УХОДИТ.» Клипы: tools/prepare_r32.py.
// Без размытия (решение Кати 15.11). Без звука: музыку Катя добавляет в Instagram.

const OSW = 'Oswald, "DejaVu Sans Condensed", sans-serif';
const INTER = 'Inter, "DejaVu Sans", sans-serif';
const GRADE = 'contrast(1.08) saturate(0.95) sepia(0.07) brightness(1.01)';

type Fx = 'none' | 'whipL' | 'whipR' | 'punch' | 'zoomIn' | 'zoomOut';
type Seg = {src: string; dur: number; z: [number, number]; origin?: string; fin?: Fx; fout?: Fx};

const SEGS: Seg[] = [
  {src: 's0', dur: 60, z: [1.08, 1.0], origin: '45% 40%', fout: 'whipL'},
  {src: 's1', dur: 45, z: [1.0, 1.06], fin: 'whipL', fout: 'zoomIn'},
  {src: 's2r', dur: 60, z: [1.0, 1.08], origin: '50% 40%', fin: 'punch', fout: 'whipR'},
  {src: 's3', dur: 45, z: [1.0, 1.06], fin: 'whipR', fout: 'zoomIn'},
  {src: 'r9', dur: 150, z: [1.02, 1.2], origin: '80% 55%', fin: 'zoomOut'}, // наезд вправо: прохожий у левого края уходит за кадр
];
const STARTS = SEGS.map((_, i) => SEGS.slice(0, i).reduce((a, x) => a + x.dur, 0));
export const KRASIVO_FRAMES = SEGS.reduce((a, x) => a + x.dur, 0);
const FIN0 = STARTS[4];

const Shot: React.FC<Seg> = ({src, dur, z, origin = '50% 45%', fin = 'none', fout = 'none'}) => {
  const f = useCurrentFrame();
  let s = interpolate(f, [0, dur], z, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  let x = 0;
  let bx = 0; // горизонтальное размытие рывка
  let b = 0;
  const inU = interpolate(f, [0, 6], [1, 0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const outU = interpolate(f, [dur - 6, dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
  if (fin === 'whipL') { x += inU * 420; bx += inU * 40; }
  if (fin === 'whipR') { x -= inU * 420; bx += inU * 40; }
  if (fin === 'punch') { s *= 1 + 0.22 * inU; b += inU * 10; }
  if (fin === 'zoomOut') { s *= 1 + 0.6 * inU; b += inU * 14; }
  if (fout === 'whipL') { x -= outU * 420; bx += outU * 40; }
  if (fout === 'whipR') { x += outU * 420; bx += outU * 40; }
  if (fout === 'zoomIn') { s *= 1 + 0.8 * outU; b += outU * 16; }
  const id = `w${src}`;
  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#000'}}>
      <svg width="0" height="0" style={{position: 'absolute'}}>
        <filter id={id}>
          <feGaussianBlur stdDeviation={`${bx.toFixed(1)} 0`} />
        </filter>
      </svg>
      <OffthreadVideo
        src={staticFile(`r32/${src}.mp4`)}
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `translateX(${x.toFixed(1)}px) scale(${s.toFixed(4)})`,
          transformOrigin: origin,
          filter: `${GRADE}${bx > 0.5 ? ` url(#${id})` : ''} blur(${b.toFixed(1)}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

// вспышка на склейке
const Flash: React.FC<{warm?: boolean}> = ({warm}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 2, 10], [0, warm ? 0.55 : 0.8, 0], {extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity: o, background: warm ? 'radial-gradient(circle at 50% 40%, #fff3dc, #ffc98a 60%, #ff9f6e)' : '#fff'}} />;
};

// тёплый засвет, проходит по кадру
const Leak: React.FC<{dur: number; fromLeft?: boolean}> = ({dur, fromLeft}) => {
  const f = useCurrentFrame();
  const u = interpolate(f, [0, dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin)});
  const o = interpolate(f, [0, dur * 0.3, dur * 0.7, dur], [0, 0.55, 0.55, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const cx = fromLeft ? -20 + u * 140 : 120 - u * 140;
  return (
    <AbsoluteFill
      style={{
        opacity: o,
        mixBlendMode: 'screen',
        background: `radial-gradient(ellipse 60% 45% at ${cx}% 35%, rgba(255,180,110,0.9), rgba(255,120,90,0.35) 45%, rgba(0,0,0,0) 75%)`,
      }}
    />
  );
};

// плёночное зерно
const Grain: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{opacity: 0.07, mixBlendMode: 'overlay', pointerEvents: 'none'}}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={f % 17} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

// слово: проявляется из размытия, сжимаясь по ширине (ширина строки не меняется)
const Word: React.FC<{t: string; at: number; dur: number; big?: boolean; glow?: boolean}> = ({t, at, dur, big, glow}) => {
  const f = useCurrentFrame();
  const p = interpolate(f, [at, at + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const out = interpolate(f, [dur - 5, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pop = big ? interpolate(f, [at, at + 5, at + 12], [1.25, 0.97, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  return (
    <span
      style={{
        display: 'inline-block',
        margin: big ? '0 12px' : '0 8px',
        fontFamily: big ? OSW : INTER,
        fontWeight: big ? 700 : 600,
        fontSize: big ? 108 : 54,
        letterSpacing: big ? '0.02em' : '0.01em',
        textTransform: big ? 'uppercase' : 'none',
        color: '#fff',
        opacity: p * out,
        transform: `translateY(${((1 - p) * 18).toFixed(1)}px) scale(${(pop * (0.9 + 0.1 * p)).toFixed(3)}) scaleX(${(1 + (1 - p) * 0.25).toFixed(3)})`,
        filter: `blur(${((1 - p) * 8).toFixed(2)}px)`,
        textShadow: glow
          ? '0 0 18px rgba(255,214,170,0.75), 0 2px 4px rgba(0,0,0,0.6), 0 8px 30px rgba(0,0,0,0.55)'
          : '0 2px 4px rgba(0,0,0,0.6), 0 8px 28px rgba(0,0,0,0.5)',
        whiteSpace: 'nowrap',
      } as React.CSSProperties}
    >
      {t}
    </span>
  );
};

type W = {t: string; at: number; big?: boolean; glow?: boolean};
const Lines: React.FC<{from: number; dur: number; top?: number; rows: W[][]}> = ({from, dur, top = 1240, rows}) => (
  <Sequence from={from} durationInFrames={dur}>
    <AbsoluteFill>
      <div style={{position: 'absolute', top, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        {rows.map((r, i) => (
          <div key={i} style={{display: 'flex', justifyContent: 'center', lineHeight: 1.12}}>
            {r.map((w, j) => (
              <Word key={j} t={w.t} at={w.at} big={w.big} glow={w.glow} dur={dur} />
            ))}
          </div>
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
          <Shot {...s} />
        </Sequence>
      ))}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.42) 100%)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(0,0,0,0) 52%, rgba(0,0,0,0.32) 70%, rgba(0,0,0,0) 90%)'}} />
      {/* засветы и вспышки на сильных долях */}
      <Sequence from={STARTS[2] - 4} durationInFrames={30}>
        <Leak dur={30} fromLeft />
      </Sequence>
      <Sequence from={FIN0 - 6} durationInFrames={36}>
        <Leak dur={36} />
      </Sequence>
      {[STARTS[2], FIN0].map((s) => (
        <Sequence key={`f${s}`} from={s} durationInFrames={12}>
          <Flash />
        </Sequence>
      ))}
      <Sequence from={FIN0 + 104} durationInFrames={14}>
        <Flash warm />
      </Sequence>
      <Grain />

      {/* текст по словам */}
      <Lines
        from={0}
        dur={STARTS[1] + 4}
        rows={[
          [
            {t: 'Женщина,', at: 4},
            {t: 'которая', at: 9},
          ],
          [
            {t: 'знает', at: 16, big: true},
            {t: 'себе', at: 21, big: true},
            {t: 'цену,', at: 26, big: true},
          ],
        ]}
      />
      <Lines
        from={STARTS[1]}
        dur={STARTS[3] - STARTS[1]}
        rows={[
          [
            {t: 'не', at: 4, big: true},
            {t: 'спорит.', at: 9, big: true},
          ],
        ]}
      />
      <Lines from={STARTS[3] + 8} dur={FIN0 - STARTS[3] - 8} rows={[[{t: 'Она', at: 2}, {t: 'просто', at: 8}]]} />
      <Lines
        from={FIN0}
        dur={SEGS[4].dur}
        rows={[
          [
            {t: 'Она', at: 0},
            {t: 'просто', at: 0},
          ],
          [
            {t: 'красиво', at: 18, big: true, glow: true},
            {t: 'уходит.', at: 106, big: true, glow: true},
          ],
        ]}
      />
    </AbsoluteFill>
  );
};
