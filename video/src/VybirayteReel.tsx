import React from 'react';
import {AbsoluteFill, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {useOswald2} from './UgadajReel';
import {Plate} from './NoyabrReel';

// Рилс 34 «Мужчины, выбирайте» (16.11): «Разговоры в машине», дубль 2 Кати (21 с, самый плотный из четырёх).
// Паузы ужаты (склейки по 0,2 с тишины), на каждой склейке смена крупности (как у монтажёров разговорных рилсов),
// потолок машины срезан. Звук Кати: громкость выровнена (public/r34/talk.mp4 готовится ffmpeg, см. журнал рилса).
// Плашка-хук в начале. Титры по словам: после того как Катя подтвердит текст дубля.

const GRADE = 'contrast(1.05) saturate(1.04) sepia(0.05) brightness(1.02)';
// склейки talk.mp4 (кадры): 0-145, 145-330, 330-488, 488-558
const CUTS = [0, 145, 330, 488, 558];
const ZOOM: [number, number][] = [
  [1.24, 1.28],
  [1.4, 1.44],
  [1.26, 1.3],
  [1.46, 1.5],
];
export const VYBIRAYTE_FRAMES = 558;

export const VybirayteReel: React.FC = () => {
  useOswald2();
  const f = useCurrentFrame();
  const i = Math.max(0, CUTS.findIndex((c, k) => f >= c && f < CUTS[k + 1]));
  const z = interpolate(f, [CUTS[i], CUTS[i + 1]], ZOOM[i], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{backgroundColor: '#000', overflow: 'hidden'}}>
      <OffthreadVideo
        src={staticFile('r34/talk.mp4')}
        style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${z.toFixed(4)})`, transformOrigin: '50% 64%', filter: GRADE}}
      />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.3) 100%)'}} />
      <Sequence from={0} durationInFrames={CUTS[1]}>
        <AbsoluteFill>
          <div style={{position: 'absolute', top: 210, left: 0, right: 0}}>
            <Plate t="Мужчины," size={104} at={0} dur={CUTS[1]} light />
            <Plate t="выбирайте, в кого влюбляться" size={62} at={0} dur={CUTS[1]} light />
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
