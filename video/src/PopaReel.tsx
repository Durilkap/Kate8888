import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {useMontserrat} from './WordCaptions';

// Рилс 42 (челлендж Лилии, день 6 «Просто потому что...», 23.11): идея Кати «красивая попа», кадры из зала
// (public/sport, подготовлены для рилса 13: посторонние на фоне уже размыты). 7 с, без голоса, музыку Катя ставит
// в Instagram. Хук текстом с первой секунды, наглядно: упражнения на ягодицы.

const GRADE = 'contrast(1.05) saturate(1.05) brightness(1.03)';
type Seg = {src: string; from: number; dur: number; z?: [number, number]; o?: string; photo?: boolean};
const SEGS: Seg[] = [
  {src: 'sq2', from: 0, dur: 45, z: [1.0, 1.06], o: '50% 70%', photo: true}, // фото сзади в жёлтой футболке, присед (Катя 23.11)
  {src: 'c2', from: 0, dur: 30, z: [1.0, 1.04], o: '50% 60%'},   // тренажёр, сзади, шорты
  {src: 'c6', from: 0, dur: 33, z: [1.02, 1.06], o: '50% 55%'},  // махи ногой с мячом
  {src: 'c7', from: 15, dur: 36, z: [1.04, 1.08], o: '40% 60%'}, // махи на четвереньках
  {src: 'c9', from: 0, dur: 30, z: [1.0, 1.04], o: '50% 60%'},   // мах крупно
  {src: 'c3', from: 0, dur: 36, z: [1.0, 1.05], o: '50% 60%'},   // тренажёр, сзади, финал
];
const STARTS = SEGS.map((_, i) => SEGS.slice(0, i).reduce((a, x) => a + x.dur, 0));
export const POPA_FRAMES = SEGS.reduce((a, x) => a + x.dur, 0);
const LINES = ['Красивая попа без голодовок.', 'Просто потому что', '2 раза в неделю я делаю это:'];
const FONT = 'Montserrat, "Noto Color Emoji", "DejaVu Sans", sans-serif';

const Shot: React.FC<{s: Seg; first: boolean}> = ({s, first}) => {
  const f = useCurrentFrame();
  const z = s.z ?? [1.0, 1.04];
  const punch = first ? 0 : interpolate(f, [0, 4], [0.05, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const sc = interpolate(f, [0, s.dur], z, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) + punch;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      {s.photo ? (
        <Img src={staticFile(`sport/${s.src}.jpg`)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${sc.toFixed(4)})`, transformOrigin: s.o ?? '50% 50%', filter: GRADE}} />
      ) : (
        <OffthreadVideo src={staticFile(`sport/${s.src}.mp4`)} startFrom={s.from} muted style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${sc.toFixed(4)})`, transformOrigin: s.o ?? '50% 50%', filter: GRADE}} />
      )}
    </AbsoluteFill>
  );
};

export const PopaReel: React.FC = () => {
  useMontserrat();
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {SEGS.map((s, i) => (
        <Sequence key={i} from={STARTS[i]} durationInFrames={s.dur}>
          <Shot s={s} first={i === 0} />
        </Sequence>
      ))}
      <div style={{position: 'absolute', top: 230, left: 30, right: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
        {LINES.map((l, i) => {
          const a = interpolate(f, [i * 4, i * 4 + 5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          return (
            <div key={l} style={{fontFamily: FONT, fontWeight: 800, fontSize: 56, lineHeight: 1.12, letterSpacing: '-0.015em', color: '#111', background: '#fff', padding: '0.08em 0.36em 0.12em', borderRadius: '0.28em', boxShadow: '0 8px 24px rgba(0,0,0,0.28)', whiteSpace: 'nowrap', opacity: a, transform: `translateY(${(1 - a) * 14}px)`}}>
              {l}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
