import React from 'react';
import {AbsoluteFill, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {useMontserrat} from './WordCaptions';

// Рилс 38, челлендж Лилии, день 3 «ВОПРОС» (19.11): вопрос на экране всё видео. 7 с, без звука:
// трендовую музыку Катя ставит в Instagram. Текст: чёрный Montserrat ExtraBold на белых плашках (как день 1, его хвалил куратор).
// VoprosReel: танец Кати в клубе, красный топ (public/r38, tools/prepare_r38.py): оглядывается с улыбкой, танец
// в полный рост на сцене (стоит ровно, без наклонов), взмах волос в замедлении, взгляд через плечо (крупные кадры анфас Кате не понравились). VoprosTcReel: прежняя версия в ТЦ (кадры «Красиво уходит», public/r32).

const GRADE = 'contrast(1.06) saturate(1.0) sepia(0.05) brightness(1.02)';
type Seg = {src: string; dur: number; z: number[]; o: string};
const SEGS_TC: Seg[] = [
  {src: 'r32/s1', dur: 60, z: [1.0, 1.05], o: '50% 40%'},
  {src: 'r32/s2r', dur: 60, z: [1.02, 1.08], o: '50% 40%'},
  {src: 'r32/s3', dur: 45, z: [1.0, 1.05], o: '50% 45%'},
  {src: 'r32/s4', dur: 45, z: [1.08, 1.0], o: '50% 45%'},
];
const SEGS_DANCE: Seg[] = [
  {src: 'r38/k1', dur: 18, z: [1.0, 1.04], o: '50% 30%'},
  {src: 'r38/k2', dur: 72, z: [1.08, 1.12], o: '50% 20%'},
  {src: 'r38/k2b', dur: 28, z: [1.1, 1.13], o: '30% 30%'},
  {src: 'r38/k3', dur: 49, z: [1.0, 1.04], o: '50% 35%'},
  {src: 'r38/k4', dur: 43, z: [1.0, 1.04], o: '35% 35%'},
];
export const VOPROS_FRAMES = SEGS_DANCE.reduce((a, x) => a + x.dur, 0);
export const VOPROS_TC_FRAMES = SEGS_TC.reduce((a, x) => a + x.dur, 0);
const LINES = ['Женщины, которые', 'стали охуевшими,', 'расскажите, какая вы? 😏']; // формулировка Кати 19.11

const Shot: React.FC<{src: string; dur: number; z: number[]; o: string; punch: boolean}> = ({src, dur, z, o, punch}) => {
  const f = useCurrentFrame();
  // толчок на склейке под бит (только танец): +4% и назад за 5 кадров
  const p = punch ? interpolate(f, [0, 5], [0.04, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
  const s = interpolate(f, [0, dur], z, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) + p;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <OffthreadVideo src={staticFile(`${src}.mp4`)} muted style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${s.toFixed(4)})`, transformOrigin: o, filter: GRADE}} />
    </AbsoluteFill>
  );
};

const Vopros: React.FC<{segs: Seg[]; top: number; punch: boolean}> = ({segs, top, punch}) => {
  useMontserrat();
  const starts = segs.map((_, i) => segs.slice(0, i).reduce((a, x) => a + x.dur, 0));
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {segs.map((x, i) => (
        <Sequence key={x.src} from={starts[i]} durationInFrames={x.dur}>
          <Shot src={x.src} dur={x.dur} z={x.z} o={x.o} punch={punch && i > 0} />
        </Sequence>
      ))}
      <div style={{position: 'absolute', top, left: 30, right: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
        {LINES.map((l) => (
          <div
            key={l}
            style={{
              fontFamily: 'Montserrat, "Noto Color Emoji", "DejaVu Sans", sans-serif',
              fontWeight: 800,
              fontSize: 54,
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

// танец: лица в кадрах на высоте 500-1150 px, поэтому вопрос ниже лица, над зоной подписи Instagram;
// шрифт 54 (в ТЦ тоже), чтобы смайлик не заходил под кнопки Instagram справа
export const VoprosReel: React.FC = () => <Vopros segs={SEGS_DANCE} top={1270} punch />;
export const VoprosTcReel: React.FC = () => <Vopros segs={SEGS_TC} top={1000} punch={false} />;
